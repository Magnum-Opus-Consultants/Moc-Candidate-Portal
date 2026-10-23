"""API endpoints backing the portal front end.

Sign-in is Day 2 of the Development Plan and is not built yet, so the "current
user" is resolved from the seeded demo accounts. Every place that does this
calls current_job_seeker(request)/current_hiring_manager(request), so swapping in
request.user once authentication lands is a change in one place.
"""

import json
import re
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.db.models import Count, Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from PIL import Image, ImageOps
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotAuthenticated
from rest_framework.response import Response

from .cv import build_cv, cv_filename
from . import cv_parse
from .automatic_mail import context_for, send_automatic_email
from .html_sanitize import sanitize_html
from .matching import score_match
from .models import (
    attach_counts,
    CitizenshipRequirement,
    Education,
    IndustryExperience,
    PIPELINE,
    Availability,
    EducationLevel,
    EmploymentStatus,
    EmploymentType,
    ExperienceLevel,
    NightShift,
    Proficiency,
    ProfileStatus,
    SalaryPeriod,
    WorkSetup,
    Activity,
    Application,
    CandidateComment,
    ApplicationStatus,
    AutomaticEmail,
    EmailLog,
    EmailTrigger,
    CandidateBookmark,
    CandidateProfile,
    Job,
    JobStatus,
    Role,
    SavedJob,
    ShortlistEntry,
    User,
    WorkExperience,
    ViewedJob,
)
from .serializers import (
    CandidatePaneMixin,
    ActivitySerializer,
    CandidateCommentSerializer,
    ApplicantSerializer,
    ApplicationSerializer,
    AutomaticEmailSerializer,
    EmailLogSerializer,
    CandidateProfileSerializer,
    JobSerializer,
    UserSummarySerializer,
)

# --- Stand-in for authentication (Development Plan, Day 2) -------------------


def current_job_seeker(request) -> User:
    """The signed-in job seeker, or a 401 if nobody is signed in as one."""
    user = request.user
    if user.is_authenticated and user.role == Role.JOB_SEEKER:
        return user
    raise NotAuthenticated("Sign in as a job seeker to view this.")


def current_hiring_manager(request) -> User:
    """The signed-in hiring manager, or a 401 if nobody is signed in as one."""
    user = request.user
    if user.is_authenticated and user.role == Role.HIRING_MANAGER:
        return user
    raise NotAuthenticated("Sign in as a hiring manager to view this.")


def optional_job_seeker(request) -> User | None:
    """The signed-in seeker, or None — for public views that personalise when
    possible but must still work for anonymous visitors."""
    user = request.user
    if user.is_authenticated and user.role == Role.JOB_SEEKER:
        return user
    return None


# --- Public job browsing -----------------------------------------------------


def _public_jobs():
    """Draft, private and closed postings never reach the public list."""
    return Job.objects.filter(
        status__in=[JobStatus.ACTIVE, JobStatus.PAUSED]
    ).with_counts()


# How many postings one page of the job list returns, and the ceiling a
# caller may ask for.
DEFAULT_PAGE = 20
MAX_PAGE = 100

# Relevance is scored per job in Python, so the ranked pool is bounded.
RELEVANCE_POOL = 400

# Likewise for recommendations, which score each job in Python.
RECOMMEND_POOL = 600

# The filter groups the job list accepts, and the model field each narrows.
JOB_FILTERS = {
    "work_setup": "work_setup",
    "experience_level": "experience_level",
    "employment_type": "employment_type",
    "role_category": "role_category",
}


def _multi(request, param: str) -> list[str]:
    """Values for one filter group.

    Accepts a repeated parameter (?work_setup=remote&work_setup=hybrid) and a
    comma-separated one (?work_setup=remote,hybrid), so a link can carry a
    whole selection in a single readable query string.
    """
    values: list[str] = []
    for raw in request.query_params.getlist(param):
        values.extend(part.strip() for part in raw.split(",") if part.strip())
    # De-duplicate, keeping the order the caller sent.
    return list(dict.fromkeys(values))


def _apply_job_filters(jobs, selected: dict[str, list[str]], *, skip: str | None = None):
    """Narrow the queryset by every selected group except `skip`.

    Skipping one group is what makes the counts on that group's own options
    useful: they answer "how many if I picked this too", not "how many are
    left after I already picked it".
    """
    for param, field in JOB_FILTERS.items():
        if param == skip:
            continue
        values = selected.get(param) or []
        if values:
            jobs = jobs.filter(**{f"{field}__in": values})
    return jobs


@api_view(["GET"])
def job_list(request):
    """The public job list: search, filters and sorting from the designs.

    Filters combine across groups and within them — picking Full-time and
    Contract widens that group rather than contradicting itself — and the
    response carries a count per option so the page can show what each one
    would do before it is clicked.
    """
    jobs = _public_jobs()

    search = request.query_params.get("search", "").strip()
    if search:
        jobs = jobs.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(role_category__icontains=search)
            | Q(company__icontains=search)
            | Q(required_skills__icontains=search)
        )

    # "Where" — matches the town and also the company, so a search for a
    # remote-friendly employer still finds its postings.
    location = request.query_params.get("location", "").strip()
    if location:
        jobs = jobs.filter(
            Q(location__icontains=location) | Q(company__icontains=location)
        )

    selected = {param: _multi(request, param) for param in JOB_FILTERS}
    matching = _apply_job_filters(jobs, selected)

    # One count per option, each computed with the other groups applied.
    facets: dict[str, dict[str, int]] = {}
    for param, field in JOB_FILTERS.items():
        pool = _apply_job_filters(jobs, selected, skip=param)
        facets[param] = {
            row[field]: row["count"]
            for row in pool.values(field).annotate(count=Count("id"))
            if row[field]
        }

    count = matching.count()

    # Paging. Without it the list serialises every match: at ten thousand
    # postings that is a 14 MB response that takes sixteen seconds.
    try:
        limit = min(max(int(request.query_params.get("limit", DEFAULT_PAGE)), 1), MAX_PAGE)
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE
    try:
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (TypeError, ValueError):
        offset = 0

    sort = request.query_params.get("sort", "relevance")
    if sort == "oldest":
        page = list(matching.order_by("posted_at")[offset : offset + limit])
    elif sort == "newest":
        page = list(matching.order_by("-posted_at")[offset : offset + limit])
    else:
        # Relevance is scored in Python, so it cannot be ordered in the
        # database. Rank a bounded pool of the most recent matches rather
        # than every row — beyond that the ranking costs more than it is
        # worth, and the tail is stale anyway.
        seeker = optional_job_seeker(request)
        profile = getattr(seeker, "profile", None) if seeker else None
        if profile is None:
            page = list(matching.order_by("-posted_at")[offset : offset + limit])
        else:
            pool = list(matching.order_by("-posted_at")[:RELEVANCE_POOL])
            pool.sort(key=lambda j: score_match(profile, j).score, reverse=True)
            page = pool[offset : offset + limit]

    return Response(
        {
            "results": JobSerializer(page, many=True).data,
            "facets": facets,
            "count": count,
            "total": _public_jobs().count(),
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(page) < count,
        }
    )


@api_view(["GET"])
def job_detail(request, job_id: int):
    job = get_object_or_404(Job, pk=job_id)
    seeker = optional_job_seeker(request)

    data = JobSerializer(job).data
    if seeker:
        ViewedJob.objects.create(job=job, candidate=seeker)
        data["has_applied"] = Application.objects.filter(
            job=job, candidate=seeker
        ).exists()
        data["is_saved"] = SavedJob.objects.filter(job=job, candidate=seeker).exists()
        data["match"] = score_match(getattr(seeker, "profile", None), job).as_dict()

    return Response(data)


@api_view(["GET"])
def job_suggestions(request):
    """Typeahead for the job search box.

    Suggests job titles first, then disciplines and companies, because that
    is the order people reach for. Titles are de-duplicated: with thousands
    of postings the same title recurs across companies, and ten identical
    rows is not a suggestion list.
    """
    term = request.query_params.get("q", "").strip()
    if len(term) < 2:
        return Response({"results": []})

    jobs = _public_jobs()
    seen: set[str] = set()
    out: list[dict] = []

    def add(value: str, kind: str, hint: str = "") -> None:
        key = value.casefold()
        if not value or key in seen:
            return
        seen.add(key)
        out.append({"value": value, "kind": kind, "hint": hint})

    titles = (
        jobs.filter(title__icontains=term)
        .values("title")
        .annotate(count=Count("id"))
        .order_by("-count", "title")[:6]
    )
    for row in titles:
        add(
            row["title"],
            "title",
            f"{row['count']} job" if row["count"] == 1 else f"{row['count']} jobs",
        )

    categories = (
        jobs.filter(role_category__icontains=term)
        .values("role_category")
        .annotate(count=Count("id"))
        .order_by("-count")[:3]
    )
    for row in categories:
        add(row["role_category"], "category", f"{row['count']} jobs")

    companies = (
        jobs.filter(company__icontains=term)
        .values("company")
        .annotate(count=Count("id"))
        .order_by("-count")[:3]
    )
    for row in companies:
        add(row["company"], "company", f"{row['count']} jobs")

    return Response({"results": out[:10]})


@api_view(["GET"])
def job_categories(request):
    """Role categories for the landing page.

    Includes disciplines MOC recruits for that have nothing live right now —
    they come back flagged coming_soon so the page can show them greyed out
    rather than pretending the category does not exist.
    """
    week_ago = timezone.now() - timezone.timedelta(days=7)

    open_counts = {
        row["role_category"]: row["job_count"]
        for row in _public_jobs()
        .exclude(role_category="")
        .values("role_category")
        .annotate(job_count=Count("id"))
    }
    new_counts = {
        row["role_category"]: row["new_count"]
        for row in _public_jobs()
        .exclude(role_category="")
        .filter(posted_at__gte=week_ago)
        .values("role_category")
        .annotate(new_count=Count("id"))
    }

    # Every discipline on record, including ones whose postings are all
    # draft, private or closed.
    everything = set(
        Job.objects.exclude(role_category="").values_list("role_category", flat=True)
    )

    results = [
        {
            "name": name,
            "job_count": open_counts.get(name, 0),
            "new_count": new_counts.get(name, 0),
            "coming_soon": name not in open_counts,
        }
        for name in everything
    ]
    # Live categories first, busiest first; the quiet ones trail alphabetically.
    results.sort(key=lambda r: (r["coming_soon"], -r["job_count"], r["name"]))

    return Response({"results": results})


# --- Job seeker portal -------------------------------------------------------


# Plain text/choice fields the profile form can set directly.
PROFILE_TEXT_FIELDS = [
    # Personal details
    "headline",
    "location",
    "summary",
    "preferred_name",
    "country_of_residence",
    "profile_status",
    "linkedin_url",
    "portfolio_url",
    # Optional EE information
    "gender",
    "nationality",
    "citizenship",
    "ethnicity",
    "disability_detail",
    # Career details
    "role_category",
    "secondary_role_category",
    "employment_status",
    "availability",
    "experience_level",
    "preferred_work_setup",
    "timezone_availability",
    "night_shift",
    # Education
    "highest_education_level",
    "field_of_study",
    "institution_name",
    # Remuneration
    "current_salary_currency",
    "current_salary_period",
    "expected_salary_currency",
    "expected_salary_period",
    # Privacy
    "do_not_share_with",
]

# Lists the form sends wholesale.
PROFILE_LIST_FIELDS = ["languages", "benefits", "software_tools"]


def _year(value):
    """A four-digit year, or nothing. Anything else — "21", "last year" — is
    dropped rather than stored as a number that means something different."""
    try:
        year = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    return year if 1950 <= year <= date.today().year + 10 else None


# Highest first, so the mirrored fields describe the top qualification.
EDUCATION_RANK = {
    level: rank for rank, level in enumerate(
        [
            EducationLevel.DOCTORATE,
            EducationLevel.MASTER,
            EducationLevel.HONOURS,
            EducationLevel.BACHELOR,
            EducationLevel.DIPLOMA,
            EducationLevel.CERTIFICATE,
            EducationLevel.MATRIC,
        ]
    )
}


def _mirror_highest_education(profile) -> None:
    """Copy the top qualification onto the profile's flat education fields."""
    rows = list(profile.education.all())
    if not rows:
        profile.highest_education_level = ""
        profile.field_of_study = ""
        profile.institution_name = ""
        profile.graduation_year = None
        return

    top = min(rows, key=lambda row: EDUCATION_RANK.get(row.level, 99))
    profile.highest_education_level = top.level
    profile.field_of_study = top.field_of_study
    profile.institution_name = top.institution_name
    profile.graduation_year = top.graduation_year


def _parse_date(value):
    """Accept an ISO date from the form, or nothing."""
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _recompute_sections(profile: CandidateProfile, user: User) -> None:
    """Derive section completion from the fields each section actually holds.

    One entry per section in PROFILE_SECTIONS, scored as the share of that
    section's own fields that are filled, so overall completion rises honestly
    as the seeker works through the form.

    EE information is optional by design and by law, so it is scored but a
    seeker who skips it can still pass the 80% branded-CV gate on the strength
    of the other seven sections.
    """

    def pct(*values) -> int:
        return round(100 * sum(1 for v in values if v) / len(values)) if values else 0

    profile.section_progress = {
        "personal_details": pct(
            user.first_name,
            user.last_name,
            user.email,
            user.phone,
            profile.country_of_residence,
            profile.location,
            profile.profile_status,
            profile.languages,
        ),
        "ee_information": pct(
            profile.gender,
            profile.nationality,
            profile.citizenship,
            profile.ethnicity,
            profile.has_disability is not None,
        ),
        "career_details": pct(
            profile.role_category,
            profile.employment_status,
            profile.availability,
            profile.experience_level,
            profile.preferred_work_setup,
            profile.timezone_availability,
            profile.night_shift,
        ),
        # One qualification on file is enough, as with experience: a seeker
        # with a single degree is not two thirds educated.
        "education": 100 if profile.education.exists() else 0,
        # One role on file is enough to call the section done.
        "experience": 100 if profile.experience.exists() else 0,
        "remuneration": pct(
            profile.current_salary_amount,
            profile.expected_salary_amount,
            profile.benefits,
        ),
        "skills_tools": pct(profile.skills, profile.software_tools),
        "privacy_sharing": 100 if profile.sharing_agreed else 0,
    }


# A profile photo is shown at 36px in the form and 96px on a candidate
# card, so nothing larger than this is worth storing or sending.
PHOTO_BOX = 512
PHOTO_MAX_BYTES = 8 * 1024 * 1024


@csrf_exempt
def candidate_photo(request):
    """Upload or remove the candidate's profile photo.

    The upload is decoded, squared off and re-encoded rather than stored as
    sent: it proves the bytes really are an image before they are kept, drops
    EXIF (which carries the camera's GPS position), and turns a 6 MB phone
    photo into something a profile card can load.
    """
    user = request.user
    if not user.is_authenticated or user.role != Role.JOB_SEEKER:
        return JsonResponse({"detail": "Sign in as a job seeker."}, status=403)

    profile, _ = CandidateProfile.objects.get_or_create(user=user)

    if request.method == "DELETE":
        if profile.photo:
            profile.photo.delete(save=True)
        return JsonResponse({"photo_url": ""})

    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)

    upload = request.FILES.get("photo")
    if upload is None:
        return JsonResponse({"detail": "No image was uploaded."}, status=400)
    if upload.size > PHOTO_MAX_BYTES:
        return JsonResponse(
            {"detail": "That image is larger than 8 MB."}, status=400
        )

    try:
        squared = _square_photo(upload)
    except (OSError, ValueError, Image.DecompressionBombError):
        return JsonResponse(
            {"detail": "That file could not be read as an image. "
                       "Please upload a JPEG, PNG or WebP."},
            status=400,
        )

    # Replace rather than accumulate: nobody wants six old avatars on disk.
    if profile.photo:
        profile.photo.delete(save=False)
    profile.photo.save(f"candidate-{user.pk}.jpg", squared, save=True)

    return JsonResponse({"photo_url": _absolute(profile.photo.url)})


def _square_photo(upload) -> ContentFile:
    """A centre-cropped, downscaled JPEG of the uploaded image."""
    image = Image.open(upload)
    image.verify()  # Raises unless the bytes really are an image.

    upload.seek(0)
    image = Image.open(upload)
    # transpose() applies the EXIF orientation, so a photo taken sideways on
    # a phone is not stored sideways.
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    image = ImageOps.fit(
        image, (PHOTO_BOX, PHOTO_BOX), method=Image.Resampling.LANCZOS
    )

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)
    return ContentFile(buffer.getvalue())


def _absolute(url: str) -> str:
    """A media URL the front end can load from its own origin."""
    if not url or url.startswith("http"):
        return url
    return f"{settings.API_BASE_URL}{url}"


@csrf_exempt
def candidate_cv_upload(request):
    """Read an uploaded CV and suggest profile fields from it.

    Suggestions only — nothing is written to the profile here beyond storing
    the file itself. A CV is free-form prose, so the parse is a good first
    draft the candidate reviews in the form and saves themselves, never a
    silent overwrite of what they already typed.
    """
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    user = request.user
    if not user.is_authenticated or user.role != Role.JOB_SEEKER:
        return JsonResponse({"detail": "Sign in as a job seeker."}, status=403)

    upload = request.FILES.get("cv")
    if upload is None:
        return JsonResponse({"detail": "No file was uploaded."}, status=400)

    data = upload.read()
    try:
        text = cv_parse.extract_text(upload.name, data)
    except cv_parse.UnsupportedDocument as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    if len(text.strip()) < 50:
        return JsonResponse(
            {
                "detail": "No text could be read from that file. If it is a "
                "scan, please upload a text PDF or a .docx."
            },
            status=400,
        )

    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    upload.seek(0)
    profile.cv.save(upload.name, upload, save=True)

    suggestions = cv_parse.parse_cv(text)
    return JsonResponse(
        {
            "suggestions": suggestions,
            "fields": len(suggestions),
            "cv_name": profile.cv.name.rsplit("/", 1)[-1],
        }
    )


@api_view(["GET"])
def candidate_profile(request):
    seeker = current_job_seeker(request)
    profile, _ = CandidateProfile.objects.get_or_create(user=seeker)
    return Response(CandidateProfileSerializer(profile).data)


def update_candidate_profile(request):
    """Fill in / edit the signed-in seeker's profile. Plain CSRF-exempt JSON
    view (like the account endpoints) so the session-cookie client can POST
    without a CSRF token; completion is recomputed from the filled fields."""
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    user = request.user
    if not user.is_authenticated or user.role != Role.JOB_SEEKER:
        return JsonResponse({"detail": "Sign in as a job seeker."}, status=403)

    try:
        data = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        data = {}

    profile, _ = CandidateProfile.objects.get_or_create(user=user)
    name = (data.get("name") or "").strip()
    if name:
        first, _, last = name.partition(" ")
        user.first_name, user.last_name = first, last
    if "phone" in data:
        user.phone = (data.get("phone") or "").strip()
    user.save()

    if "email" in data and (data.get("email") or "").strip():
        user.email = data["email"].strip()
    user.save()

    for field in PROFILE_TEXT_FIELDS:
        if field in data:
            setattr(profile, field, (data.get(field) or "").strip())

    for field in PROFILE_LIST_FIELDS:
        if field in data:
            value = data.get(field)
            setattr(profile, field, value if isinstance(value, list) else [])

    if "skills" in data:
        skills = data.get("skills")
        if isinstance(skills, str):
            # Older clients sent a comma-separated string.
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        profile.skills = [s for s in (skills or []) if s]

    if "has_disability" in data:
        value = data.get("has_disability")
        profile.has_disability = value if isinstance(value, bool) else None

    if "sharing_agreed" in data:
        profile.sharing_agreed = bool(data.get("sharing_agreed"))

    if "graduation_year" in data:
        try:
            profile.graduation_year = int(data["graduation_year"]) or None
        except (TypeError, ValueError):
            profile.graduation_year = None

    for field in ("current_salary_amount", "expected_salary_amount"):
        if field in data:
            raw = data.get(field)
            try:
                setattr(profile, field, Decimal(str(raw)) if raw not in ("", None) else None)
            except (InvalidOperation, TypeError, ValueError):
                setattr(profile, field, None)

    # Education is a list of qualifications, replaced wholesale on save for
    # the same reason as experience below. The highest one is mirrored onto
    # the profile's flat fields, which the matching engine and the branded CV
    # read, so those stay correct without being typed twice.
    if isinstance(data.get("education"), list):
        profile.education.all().delete()
        for index, entry in enumerate(data["education"]):
            if not isinstance(entry, dict):
                continue
            level = (entry.get("level") or "").strip()
            if level not in {v for v, _ in EducationLevel.choices}:
                continue
            Education.objects.create(
                profile=profile,
                level=level,
                field_of_study=(entry.get("field_of_study") or "").strip(),
                institution_name=(entry.get("institution_name") or "").strip(),
                graduation_year=_year(entry.get("graduation_year")),
                is_current=bool(entry.get("is_current")),
                position=index,
            )
        _mirror_highest_education(profile)

    # Experience is a list of roles, replaced wholesale on save: the form owns
    # the whole section, and entries carry no identity the client tracks.
    if isinstance(data.get("experience"), list):
        profile.experience.all().delete()
        for index, entry in enumerate(data["experience"]):
            if not isinstance(entry, dict):
                continue
            title = (entry.get("job_title") or "").strip()
            if not title:
                continue
            WorkExperience.objects.create(
                profile=profile,
                job_title=title,
                company_name=(entry.get("company_name") or "").strip(),
                employment_type=(entry.get("employment_type") or "").strip(),
                start_date=_parse_date(entry.get("start_date")),
                end_date=None if entry.get("is_current") else _parse_date(entry.get("end_date")),
                is_current=bool(entry.get("is_current")),
                reason_for_leaving=(entry.get("reason_for_leaving") or "").strip(),
                key_responsibilities=[
                    str(r).strip()
                    for r in (entry.get("key_responsibilities") or [])
                    if str(r).strip()
                ],
                position=index,
            )

    _recompute_sections(profile, user)
    profile.save()
    _maybe_send_cv_unlocked(profile, user)
    return JsonResponse(CandidateProfileSerializer(profile).data)



def _maybe_send_cv_unlocked(profile: CandidateProfile, user: User) -> None:
    """Tell a seeker their CV is unlocked, the first time only.

    The Client's note is explicit: send once when the profile first crosses
    80%, not on every later save. The stamp on the user is what makes that
    true — a flag derived from the current percentage would fire again
    every time somebody edited a profile that was already above the line,
    and would fire a second time if they dropped below it and came back.
    """
    if user.cv_unlocked_at is not None or profile.completion < 80:
        return

    user.cv_unlocked_at = timezone.now()
    user.save(update_fields=["cv_unlocked_at"])

    if user.email:
        send_automatic_email(
            EmailTrigger.PROFILE_CV_UNLOCKED, user.email, context_for(user=user)
        )



def toggle_saved_job(request, job_id: int):
    """Save / unsave a job for the signed-in seeker. Anonymous visitors get a
    401 so the button can send them to sign in."""
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed."}, status=405)
    user = request.user
    if not user.is_authenticated or user.role != Role.JOB_SEEKER:
        return JsonResponse(
            {"detail": "Sign in as a job seeker to save jobs."}, status=401
        )
    job = get_object_or_404(Job, pk=job_id)
    existing = SavedJob.objects.filter(job=job, candidate=user)
    if existing.exists():
        existing.delete()
        return JsonResponse({"saved": False})
    SavedJob.objects.create(job=job, candidate=user)
    return JsonResponse({"saved": True})


@api_view(["POST"])
def apply_to_job(request, job_id: int):
    """Day 5: apply from a job's detail page in one step.

    The application carries the job seeker's saved profile, CV and supporting
    documents to that position, and a job seeker may apply to each position
    once. The response is the confirmation the page shows on screen.
    """
    seeker = current_job_seeker(request)
    if seeker is None:
        return Response({"detail": "Sign in to apply."}, status=401)

    job = get_object_or_404(Job, pk=job_id)

    if not job.is_publicly_listed:
        return Response(
            {"detail": "This position is no longer open for applications."},
            status=409,
        )

    profile = getattr(seeker, "profile", None)
    if profile is None:
        return Response(
            {"detail": "Create your profile before applying."}, status=409
        )

    application, created = Application.objects.get_or_create(
        job=job,
        candidate=seeker,
        defaults={"status": ApplicationStatus.APPLIED},
    )

    if not created:
        return Response(
            {
                "detail": "You have already applied for this position.",
                "application": ApplicationSerializer(application).data,
            },
            status=409,
        )

    # First entry in the history, so the timeline starts where the pipeline does.
    application.events.create(to_status=ApplicationStatus.APPLIED)

    Activity.objects.create(
        actor=seeker, verb="applied for", target=job.title
    )

    send_automatic_email(
        EmailTrigger.APPLICATION_RECEIVED,
        seeker.email,
        context_for(user=seeker, job=job, application=application),
        about=job.title,
    )

    return Response(
        {
            "detail": f"Your application for {job.title} has been sent.",
            "application": ApplicationSerializer(application).data,
        },
        status=201,
    )


@api_view(["GET"])
def candidate_applications(request):
    seeker = current_job_seeker(request)
    if seeker is None:
        return Response({"results": []})
    applications = (
        Application.objects.filter(candidate=seeker)
        .select_related("job")
        .prefetch_related("events")
    )

    status_filter = request.query_params.get("status")
    if status_filter and status_filter != "all":
        if status_filter == "active":
            applications = applications.exclude(
                status__in=[ApplicationStatus.REJECTED, ApplicationStatus.JOB_CLOSED]
            )
        else:
            applications = applications.filter(status=status_filter)

    # Counts are of everything, not the filtered view, so the tabs stay stable.
    everything = Application.objects.filter(candidate=seeker)
    counts = {
        "all": everything.count(),
        "active": everything.exclude(
            status__in=[ApplicationStatus.REJECTED, ApplicationStatus.JOB_CLOSED]
        ).count(),
    }
    for status in ApplicationStatus:
        counts[status.value] = everything.filter(status=status).count()

    # Paging. Every application carries its pipeline and its whole event
    # history, so the rows are heavy: two dozen already make a half-megabyte
    # response, and a seeker who has been looking for months would have
    # hundreds.
    count = applications.count()
    try:
        limit = min(
            max(int(request.query_params.get("limit", DEFAULT_PAGE)), 1), MAX_PAGE
        )
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE
    try:
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (TypeError, ValueError):
        offset = 0

    page = applications[offset : offset + limit]

    return Response(
        {
            "results": ApplicationSerializer(page, many=True).data,
            "counts": counts,
            "count": count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(page) < count,
            "pipeline": [
                {"value": status.value, "label": status.label} for status in PIPELINE
            ],
        }
    )


@api_view(["GET"])
def candidate_saved_jobs(request):
    seeker = current_job_seeker(request)
    if seeker is None:
        return Response({"results": []})
    saved = SavedJob.objects.filter(candidate=seeker).select_related("job")

    # Searching your own saved list, the same way the recommendations page
    # searches its own. Someone who has kept thirty roles still has to find
    # the one they meant.
    search = request.query_params.get("search", "").strip()
    if search:
        saved = saved.filter(
            Q(job__title__icontains=search)
            | Q(job__company__icontains=search)
            | Q(job__role_category__icontains=search)
            | Q(job__location__icontains=search)
        )

    # The saved list shows "Apply now" or "Already applied" per row, so it
    # needs to know which of these the seeker has already applied for. One
    # query rather than one per row.
    applied_ids = set(
        Application.objects.filter(
            candidate=seeker, job__in=[entry.job_id for entry in saved]
        ).values_list("job_id", flat=True)
    )

    return Response(
        {
            "results": [
                {
                    **JobSerializer(entry.job).data,
                    "saved_at": entry.saved_at,
                    "is_saved": True,
                    "has_applied": entry.job_id in applied_ids,
                }
                for entry in saved
            ]
        }
    )


def _recommended_jobs_for(seeker: User | None, limit: int = 3) -> list[dict]:
    """The dashboard's short "Recommended for you" strip.

    A plain function rather than the view: the dashboard needs the same
    ranking without the search, filters and paging the Recommended Jobs page
    adds, and calling a DRF view from another view re-wraps the request and
    fails.
    """
    if seeker is None:
        return []

    profile = getattr(seeker, "profile", None)
    applied_ids = set(
        Application.objects.filter(candidate=seeker).values_list("job_id", flat=True)
    )

    # A bounded pool of the newest postings, not every live job. score_match is
    # Python and cannot be pushed into SQL, so with nine thousand live rows
    # scoring — and serialising — all of them took the dashboard past thirty
    # seconds. Recommendations are drawn from recent postings regardless.
    pool = (
        _public_jobs()
        .exclude(id__in=applied_ids)
        .order_by("-posted_at")[:RECOMMEND_POOL]
    )

    scored = [(score_match(profile, job), job) for job in pool]
    scored.sort(key=lambda row: row[0].score, reverse=True)

    # Serialise only the rows that are actually returned.
    return [
        {**JobSerializer(job).data, "match": match.as_dict()}
        for match, job in scored[:limit]
    ]


@api_view(["GET"])
def candidate_recommended_jobs(request):
    """Open positions ranked by match score, searchable and filterable.

    The same search, filters, facet counts and paging as the public job list.
    A ranked list is only useful while it is short enough to read: with tens
    of thousands of postings a seeker needs to narrow it ("remote, senior,
    engineering") before the ranking inside it means anything.
    """
    seeker = current_job_seeker(request)
    if seeker is None:
        return Response(
            {"results": [], "facets": {}, "count": 0, "limit": DEFAULT_PAGE,
             "offset": 0, "has_more": False}
        )

    profile = getattr(seeker, "profile", None)
    applied_ids = set(
        Application.objects.filter(candidate=seeker).values_list("job_id", flat=True)
    )

    jobs = _public_jobs().exclude(id__in=applied_ids)

    search = request.query_params.get("search", "").strip()
    if search:
        jobs = jobs.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(role_category__icontains=search)
            | Q(company__icontains=search)
            | Q(required_skills__icontains=search)
        )

    location = request.query_params.get("location", "").strip()
    if location:
        jobs = jobs.filter(
            Q(location__icontains=location) | Q(company__icontains=location)
        )

    selected = {param: _multi(request, param) for param in JOB_FILTERS}
    matching = _apply_job_filters(jobs, selected)

    facets: dict[str, dict[str, int]] = {}
    for param, field in JOB_FILTERS.items():
        pool = _apply_job_filters(jobs, selected, skip=param)
        facets[param] = {
            row[field]: row["count"]
            for row in pool.values(field).annotate(count=Count("id"))
            if row[field]
        }

    count = matching.count()

    try:
        limit = min(max(int(request.query_params.get("limit", DEFAULT_PAGE)), 1), MAX_PAGE)
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE
    try:
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (TypeError, ValueError):
        offset = 0

    # Scoring is Python, so the ranking cannot be done in SQL. Rank a bounded
    # pool of the newest matches and page within it, exactly as the public
    # list does for its relevance sort.
    pool = list(matching.order_by("-posted_at")[:RECOMMEND_POOL])
    pool.sort(key=lambda job: score_match(profile, job).score, reverse=True)
    page = pool[offset : offset + limit]
    ranked = min(count, RECOMMEND_POOL)

    return Response(
        {
            "results": [
                {**JobSerializer(job).data,
                 "match": score_match(profile, job).as_dict()}
                for job in page
            ],
            "facets": facets,
            "count": count,
            # How many of `count` were actually scored, so the page can say
            # so rather than implying every posting was ranked.
            "ranked": ranked,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(page) < ranked,
        }
    )


@api_view(["GET"])
def candidate_recently_viewed(request):
    """The last 10 jobs the job seeker opened, newest first, de-duplicated."""
    seeker = current_job_seeker(request)
    if seeker is None:
        return Response({"results": []})

    seen: list[int] = []
    jobs = []
    for view in ViewedJob.objects.filter(candidate=seeker).select_related("job")[:100]:
        if view.job_id in seen:
            continue
        seen.append(view.job_id)
        jobs.append({**JobSerializer(view.job).data, "viewed_at": view.viewed_at})
        if len(jobs) == 10:
            break
    return Response({"results": jobs})


@api_view(["GET"])
def candidate_dashboard(request):
    """Everything the job seeker dashboard renders, in one round trip."""
    seeker = current_job_seeker(request)
    if seeker is None:
        return Response({"detail": "No job seeker account seeded."}, status=404)

    profile, _ = CandidateProfile.objects.get_or_create(user=seeker)
    applications = Application.objects.filter(candidate=seeker).select_related("job")
    saved = SavedJob.objects.filter(candidate=seeker).select_related("job")

    active_statuses = [
        ApplicationStatus.APPLIED,
        ApplicationStatus.IN_REVIEW,
        ApplicationStatus.SHORTLISTED,
        ApplicationStatus.INTERVIEW,
    ]

    recommended = _recommended_jobs_for(seeker, limit=3)

    return Response(
        {
            "user": UserSummarySerializer(seeker).data,
            "profile": CandidateProfileSerializer(profile).data,
            "stats": {
                "active_applications": applications.filter(
                    status__in=active_statuses
                ).count(),
                "total_applications": applications.count(),
                "saved_jobs": saved.count(),
                "shortlisted": applications.filter(
                    status=ApplicationStatus.SHORTLISTED
                ).count(),
            },
            "recent_applications": ApplicationSerializer(
                applications[:4], many=True
            ).data,
            "recommended_jobs": recommended,
        }
    )


# --- Hiring manager portal ---------------------------------------------------


# The fields a manager fills in on the New Job form. Everything else on the
# model is derived (posted_at, created_by) or set by later actions.
JOB_TEXT_FIELDS = [
    "title",
    "role_category",
    "company",
    "location",
    "description",
    "salary_label",
    "timezone_label",
    "company_industry",
    "company_location",
    "about_company",
    # Employer contact, so a candidate's questions reach a person.
    "hr_email",
    "hr_phone",
    # Where the candidate must be based, if it is constrained at all.
    "candidate_location",
    "field_of_study",
    "salary_currency",
]

JOB_CHOICE_FIELDS = {
    "work_setup": WorkSetup,
    "experience_level": ExperienceLevel,
    "employment_type": EmploymentType,
    "status": JobStatus,
    "night_shift": NightShift,
    "citizenship_requirement": CitizenshipRequirement,
    "industry_experience": IndustryExperience,
    "education_requirement": EducationLevel,
    "salary_period": SalaryPeriod,
}

JOB_LIST_FIELDS = [
    "required_skills",
    "software_tools",
    "key_responsibilities",
    "advantageous_tools",
    "language_requirements",
    "benefits",
]

JOB_DATE_FIELDS = ["ideal_start_date"]

JOB_MONEY_FIELDS = ["salary_min", "salary_max"]

REQUIRED_JOB_FIELDS = ["title", "role_category", "company", "description"]


def _apply_job_fields(job: Job, data: dict) -> None:
    """Copy the posting form's fields onto `job`, ignoring anything unknown.

    Shared by create and edit so the two can never drift: a field the form
    gains is accepted by both, and a value outside a field's choices is
    dropped rather than saved.
    """
    for field in JOB_TEXT_FIELDS:
        if field in data:
            setattr(job, field, str(data.get(field) or "").strip())

    for field, choices in JOB_CHOICE_FIELDS.items():
        value = str(data.get(field) or "").strip()
        allowed = {v for v, _ in choices.choices}
        if value in allowed:
            setattr(job, field, value)

    for field in JOB_LIST_FIELDS:
        if field in data:
            value = data.get(field)
            setattr(job, field, value if isinstance(value, list) else [])

    for field in JOB_DATE_FIELDS:
        if field in data:
            setattr(job, field, _parse_date(data.get(field)))

    for field in JOB_MONEY_FIELDS:
        if field in data:
            setattr(job, field, _money(data.get(field)))

    if "flexible_hours" in data:
        job.flexible_hours = bool(data.get("flexible_hours"))

    if "minimum_years_experience" in data:
        job.minimum_years_experience = _years(data.get("minimum_years_experience"))

    if "working_hours_start" in data:
        job.working_hours_start = _job_hour(data.get("working_hours_start"))
    if "working_hours_end" in data:
        job.working_hours_end = _job_hour(data.get("working_hours_end"))

    if "closes_at" in data:
        closes = _parse_date(data.get("closes_at"))
        job.closes_at = (
            timezone.make_aware(
                datetime.combine(closes, time.max), timezone.get_current_timezone()
            )
            if closes
            else None
        )


def _money(value):
    """A salary figure, or nothing. Blank and nonsense both mean nothing
    rather than zero, which would advertise a job paying nothing."""
    if value in (None, ""):
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return amount if amount >= 0 else None


def _years(value):
    """Years of experience asked for. Capped at fifty: beyond that it is a
    typo, not a requirement."""
    try:
        years = int(value)
    except (TypeError, ValueError):
        return None
    return years if 0 <= years <= 50 else None


def _job_hour(value):
    """An hour of the working day, or nothing. Out-of-range is nothing rather
    than an error: the form offers a dropdown, so a bad value is not a typo
    a manager can make."""
    try:
        hour = int(value)
    except (TypeError, ValueError):
        return None
    return hour if 0 <= hour <= 23 else None


@api_view(["POST"])
def manager_job_create(request):
    """Post a new job.

    Saved as a draft unless the manager explicitly publishes it, because the
    form is long and half-finished postings must not reach the public list.
    """
    manager = current_hiring_manager(request)
    data = request.data if isinstance(request.data, dict) else {}

    job = Job(created_by=manager)
    _apply_job_fields(job, data)

    # A posting is only dated once it is actually live; a draft has no date on
    # it, which is what the "Added today" line on the cards reads.
    if job.status in (JobStatus.ACTIVE, JobStatus.PAUSED):
        job.posted_at = timezone.now()

    invalid = _job_validation_response(job)
    if invalid is not None:
        return invalid

    job.save()

    return Response(JobSerializer(job).data, status=201)


def _copy_title(title: str) -> str:
    """Name the next copy: "(copy)", then "(copy 2)", "(copy 3)"...

    Copying a copy numbers the next one rather than stacking another
    "(copy)" on the end, so three copies of one posting are told apart in
    the jobs rail instead of reading identically.
    """
    base = re.sub(r"\s*\(copy(?: \d+)?\)$", "", title).strip()

    taken = set(
        Job.objects.filter(title__startswith=base).values_list("title", flat=True)
    )
    if f"{base} (copy)" not in taken:
        return f"{base} (copy)"

    number = 2
    while f"{base} (copy {number})" in taken:
        number += 1
    return f"{base} (copy {number})"


def _job_validation_response(job: Job):
    """400 with the offending fields, or None when the posting is valid.

    full_clean raises rather than returns, and an uncaught raise is a 500 on
    a form the manager can still fix.
    """
    missing = [
        field
        for field in REQUIRED_JOB_FIELDS
        if not str(getattr(job, field, "") or "").strip()
    ]
    if missing:
        return Response(
            {
                "detail": "Please fill in every required field.",
                "fields": missing,
                "field_errors": {
                    field: "This field is required." for field in missing
                },
            },
            status=400,
        )

    try:
        job.full_clean(exclude=["created_by"])
    except DjangoValidationError as exc:
        errors = exc.message_dict
        return Response(
            {
                "detail": "Please correct the highlighted fields.",
                "fields": sorted(errors),
                "field_errors": {
                    field: messages[0] for field, messages in errors.items()
                },
            },
            status=400,
        )
    return None


@api_view(["POST"])
def manager_job_update(request, job_id: int):
    """Edit an existing posting (Development Plan, Day 10).

    A published job updates on the board as soon as it is saved, because the
    public list reads the same row. The status is deliberately not editable
    here — publish, close and make-private are their own actions, so a stray
    value in the form cannot quietly take a live posting off the board.
    """
    current_hiring_manager(request)
    job = get_object_or_404(Job, pk=job_id)
    data = request.data if isinstance(request.data, dict) else {}

    was_live = job.status
    _apply_job_fields(job, {k: v for k, v in data.items() if k != "status"})
    job.status = was_live

    invalid = _job_validation_response(job)
    if invalid is not None:
        return invalid

    job.save()

    return Response(
        {"detail": f"{job.title} has been updated.", "job": JobSerializer(job).data}
    )


@api_view(["POST"])
def manager_job_duplicate(request, job_id: int):
    """Copy a posting into a new draft (Development Plan, Day 11).

    The copy carries the original's details but none of its history: no
    applicants, no posted date, and Draft status, so a duplicate can never
    reach the board before someone has looked at it.
    """
    manager = current_hiring_manager(request)
    original = get_object_or_404(Job, pk=job_id)

    copy = Job.objects.get(pk=original.pk)
    copy.pk = None
    copy.id = None
    copy._state.adding = True
    copy.title = _copy_title(original.title)
    copy.status = JobStatus.DRAFT
    copy.posted_at = None
    copy.created_by = manager
    copy.save()

    Activity.objects.create(
        actor=manager, verb="created a draft for", target=copy.title
    )

    return Response(
        {
            "detail": f"{original.title} was copied into a new draft.",
            "job": JobSerializer(copy).data,
        },
        status=201,
    )


@api_view(["POST"])
def manager_job_delete(request, job_id: int):
    """Delete a posting that nobody has applied to.

    A posting with applicants is never deleted: the applications carry the
    candidates' submissions, and the SOW keeps candidate data so MOC can
    contact people about future roles. Closing is what retires a live
    posting; deleting is only for a draft that was a mistake.
    """
    manager = current_hiring_manager(request)
    job = get_object_or_404(Job, pk=job_id)

    applicants = Application.objects.filter(job=job).count()
    if applicants:
        return Response(
            {
                "detail": (
                    f"{job.title} has {applicants} "
                    f"applicant{'s' if applicants != 1 else ''} and cannot be "
                    "deleted. Close the posting instead — their applications "
                    "and profiles are kept."
                )
            },
            status=409,
        )

    title = job.title
    job.delete()
    Activity.objects.create(actor=manager, verb="deleted", target=title)

    return Response({"detail": f"{title} has been deleted."})


@api_view(["POST"])
def manager_jobs_delete(request):
    """Delete several postings at once.

    Partial on purpose: the ones with applicants are kept and named back, so
    selecting twelve drafts and one posting someone applied to deletes the
    twelve rather than refusing the lot. The caller gets both lists and can
    say what happened.
    """
    manager = current_hiring_manager(request)

    raw = (request.data or {}).get("ids")
    ids = [int(i) for i in raw if str(i).isdigit()] if isinstance(raw, list) else []
    if not ids:
        return Response({"detail": "Nothing selected."}, status=400)

    jobs = list(Job.objects.filter(pk__in=ids))
    if not jobs:
        return Response({"detail": "Those postings no longer exist."}, status=404)

    with_applicants = set(
        Application.objects.filter(job__in=jobs)
        .values_list("job_id", flat=True)
        .distinct()
    )

    deleted, kept = [], []
    for job in jobs:
        if job.id in with_applicants:
            kept.append(job.title)
            continue
        deleted.append(job.title)
        job.delete()

    if deleted:
        Activity.objects.create(
            actor=manager,
            verb="deleted",
            target=(
                deleted[0]
                if len(deleted) == 1
                else f"{len(deleted)} job postings"
            ),
        )

    if not deleted:
        detail = (
            f"Nothing was deleted: {_sentence(kept)} "
            f"{'has' if len(kept) == 1 else 'have'} applicants. "
            "Close those instead — their applications are kept."
        )
    elif kept:
        detail = (
            f"Deleted {len(deleted)}. Kept {_sentence(kept)}, which "
            f"{'has' if len(kept) == 1 else 'have'} applicants."
        )
    else:
        detail = (
            f"Deleted {deleted[0]}."
            if len(deleted) == 1
            else f"Deleted {len(deleted)} postings."
        )

    return Response(
        {"detail": detail, "deleted": len(deleted), "kept": kept},
        status=200 if deleted else 409,
    )


def _sentence(names: list[str]) -> str:
    """["a", "b", "c"] -> "a, b and c" — for a message a person reads."""
    if len(names) == 1:
        return names[0]
    if len(names) <= 3:
        return f"{', '.join(names[:-1])} and {names[-1]}"
    return f"{', '.join(names[:2])} and {len(names) - 2} others"


# What a manager can move a live posting to, and the past tense for the
# activity feed. Publishing has its own view, because going live validates
# the posting first.
JOB_TRANSITIONS = {
    "pause": (JobStatus.PAUSED, "paused"),
    "close": (JobStatus.CLOSED, "closed"),
    "private": (JobStatus.PRIVATE, "made private"),
    "draft": (JobStatus.DRAFT, "moved back to draft"),
}


@api_view(["POST"])
def manager_job_status(request, job_id: int):
    """Pause, close, make private, or put a posting back into draft.

    Separate from `update` on purpose: the edit form must not be able to
    take a live posting off the board through a stray status value, so
    retiring one is a deliberate act of its own.

    The posting keeps its `posted_at`. "Posted 17 Oct 2026" on a card means
    when candidates first saw it, not when it was last touched, so pausing
    and reopening must not rewrite it.
    """
    manager = current_hiring_manager(request)
    job = get_object_or_404(Job, pk=job_id)

    action = (request.data or {}).get("action") if isinstance(request.data, dict) else None
    if action not in JOB_TRANSITIONS:
        return Response(
            {
                "detail": "Choose what to do with this posting.",
                "actions": sorted(JOB_TRANSITIONS),
            },
            status=400,
        )

    status, verb = JOB_TRANSITIONS[action]
    if job.status == status:
        return Response(
            {"detail": f"{job.title} is already {job.get_status_display().lower()}."},
            status=409,
        )

    job.status = status
    job.save(update_fields=["status", "updated_at"])

    Activity.objects.create(actor=manager, verb=verb, target=job.title)

    return Response(
        {
            "detail": f"{job.title} has been {verb}.",
            "job": JobSerializer(job).data,
        }
    )


@api_view(["POST"])
def manager_job_publish(request, job_id: int):
    """Publish an approved posting (Development Plan, Day 11).

    Sets the posting to Active, which is what puts it on the public job list
    and opens it for applications — `Job.is_publicly_listed` and the apply
    view both read the status, so there is nothing else to switch on.

    A posting is dated the moment it first goes live and keeps that date
    through later pauses and reopens, because "Posted 17 Oct 2026" on the
    cards means when candidates first saw it, not when it was last touched.
    """
    manager = current_hiring_manager(request)
    job = get_object_or_404(Job, pk=job_id)

    if job.status == JobStatus.ACTIVE:
        return Response(
            {"detail": f"{job.title} is already published.", "job": JobSerializer(job).data},
            status=409,
        )

    # The create form only enforces these on a published posting, so a draft
    # can be saved half-finished. Publishing is where that debt comes due.
    missing = [
        field
        for field in REQUIRED_JOB_FIELDS
        if not str(getattr(job, field, "") or "").strip()
    ]
    if missing:
        return Response(
            {
                "detail": "This posting cannot be published until every required field is filled in.",
                "fields": missing,
            },
            status=400,
        )

    if job.closes_at and job.closes_at < timezone.now():
        return Response(
            {
                "detail": (
                    "This posting's closing date has already passed. "
                    "Move the closing date before publishing it."
                )
            },
            status=400,
        )

    job.status = JobStatus.ACTIVE
    if job.posted_at is None:
        job.posted_at = timezone.now()
    job.save(update_fields=["status", "posted_at", "updated_at"])

    Activity.objects.create(actor=manager, verb="published", target=job.title)

    # Alert the job seekers the posting actually suits, rather than everyone:
    # a new-job alert that ignores the match score is just spam.
    for profile in CandidateProfile.objects.select_related("user"):
        if not profile.user.email or score_match(profile, job).score < 50:
            continue
        send_automatic_email(
            EmailTrigger.NEW_JOB_PUBLISHED,
            profile.user.email,
            context_for(user=profile.user, job=job),
            about=job.title,
        )

    return Response(
        {
            "detail": f"{job.title} is now live and open for applications.",
            "job": JobSerializer(job).data,
        }
    )


@api_view(["GET"])
def manager_jobs(request):
    """Every posting including drafts, with search, status filter and sorting.

    Gated: this returns draft and private postings, which the public job list
    deliberately hides.
    """
    current_hiring_manager(request)

    # Built without the count annotations first: the total for paging is a
    # plain COUNT over this filter, and annotating it would make the
    # database join and group every posting just to count them.
    matching = Job.objects.all()

    search = request.query_params.get("search", "").strip()
    if search:
        matching = matching.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    status = request.query_params.get("status")
    if status and status != "all":
        matching = matching.filter(status=status)

    count = matching.count()

    jobs = matching

    sort = request.query_params.get("sort", "newest")
    jobs = jobs.annotate(applicants=Count("applications", distinct=True))
    if sort == "oldest":
        jobs = jobs.order_by("created_at")
    elif sort == "most_applicants":
        jobs = jobs.order_by("-applicants")
    elif sort == "least_applicants":
        jobs = jobs.order_by("applicants")
    else:
        jobs = jobs.order_by("-created_at")

    # Paged for the same reason the public list is: a manager with thousands
    # of postings should not wait for all of them to serialise.
    try:
        limit = min(max(int(request.query_params.get("limit", DEFAULT_PAGE)), 1), MAX_PAGE)
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE
    try:
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (TypeError, ValueError):
        offset = 0

    page = attach_counts(jobs[offset : offset + limit])

    # Counts per status drive the grouped headings, and must reflect every
    # posting rather than only the page on screen.
    by_status = {
        row["status"]: row["n"]
        for row in Job.objects.values("status").annotate(n=Count("id"))
    }

    return Response(
        {
            "results": JobSerializer(page, many=True).data,
            "count": count,
            "status_counts": by_status,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(page) < count,
        }
    )



def _with_saved(rows: list[dict], bookmarked_ids: set) -> list[dict]:
    """Mark each applicant row with whether this manager bookmarked them.

    Computed here rather than in the serializer because it depends on who is
    asking, and a serializer that reaches for the request user is harder to
    reuse than one that does not.
    """
    for row in rows:
        row["saved"] = row["candidate"]["id"] in bookmarked_ids
    return rows
@api_view(["POST"])
def manager_application_status(request, application_id: int):
    """Move an application to another recruitment stage.

    The stage already existed on the model and in the candidate's timeline,
    but nothing could change it: there was no endpoint, so an application
    sat on "Applied" for ever and the Client's shortlist, interview and
    outcome emails had no event to fire on.

    The email goes out from the saved transition rather than from the
    request, as the Client's notes require — so re-sending the same status
    does nothing at all, and a candidate cannot be told twice that they
    have been shortlisted because somebody double-clicked.
    """
    manager = current_hiring_manager(request)
    application = get_object_or_404(
        Application.objects.select_related("candidate", "job"), pk=application_id
    )

    requested = (request.data.get("status") or "").strip()
    valid = {value for value, _ in ApplicationStatus.choices}
    if requested not in valid:
        return Response(
            {"detail": f"Unknown status. Expected one of: {', '.join(sorted(valid))}."},
            status=400,
        )

    previous = application.status
    if requested == previous:
        return Response(
            {
                "detail": "That application is already at this stage.",
                "application": ApplicationSerializer(application).data,
            }
        )

    application.status = requested
    application.save(update_fields=["status"])
    application.events.create(
        from_status=previous, to_status=requested, actor=manager
    )
    Activity.objects.create(
        actor=manager,
        verb=f"moved an application to {application.get_status_display()} for",
        target=application.job.title,
    )

    if application.candidate.email:
        send_automatic_email(
            EmailTrigger.APPLICATION_STATUS_CHANGED,
            application.candidate.email,
            context_for(
                user=application.candidate,
                job=application.job,
                application=application,
            ),
            about=application.job.title,
        )

    return Response(
        {
            "detail": (
                f"{application.candidate.display_name} moved to "
                f"{application.get_status_display()}."
            ),
            "application": ApplicationSerializer(application).data,
        }
    )


@api_view(["GET"])
def manager_job_preview(request, job_id: int):
    """A posting as a job seeker sees it, optionally as one named seeker.

    Three things the Client asked for on Day 11, and they are the same
    request with different amounts of "who":

    - a draft, before it is published: no seeker, so no saved or applied
      state to show;
    - a published posting as the public sees it: likewise;
    - the posting as a *particular* candidate sees it, with their saved
      and applied state and their match — which is the one that answers
      "why has this person not applied?"

    It reads through the manager endpoint rather than the public one
    because a draft or a private posting is not on the public list, and
    previewing before publishing is the whole point.
    """
    current_hiring_manager(request)
    job = get_object_or_404(Job, pk=job_id)

    data = JobSerializer(job).data
    data["is_saved"] = False
    data["has_applied"] = False
    data["viewing_as"] = None

    as_id = request.query_params.get("as")
    if as_id:
        seeker = get_object_or_404(User, pk=as_id, role=Role.JOB_SEEKER)
        profile = getattr(seeker, "profile", None)
        data["is_saved"] = SavedJob.objects.filter(
            job=job, candidate=seeker
        ).exists()
        data["has_applied"] = Application.objects.filter(
            job=job, candidate=seeker
        ).exists()
        data["match"] = score_match(profile, job).as_dict()
        data["viewing_as"] = UserSummarySerializer(seeker).data

    # Who the manager can look through the eyes of: anyone who applied,
    # plus anyone the matcher suggests. Ordered so applicants come first,
    # because they are the ones a manager is usually asking about.
    applied_ids = set(
        Application.objects.filter(job=job).values_list("candidate_id", flat=True)
    )
    seekers = [
        {
            **UserSummarySerializer(profile.user).data,
            "applied": profile.user_id in applied_ids,
        }
        for profile in CandidateProfile.objects.select_related("user").filter(
            user__is_active=True
        )[:50]
    ]
    seekers.sort(key=lambda row: (not row["applied"], row["name"]))

    return Response({"job": data, "seekers": seekers})


@api_view(["GET"])
def manager_job_detail(request, job_id: int):
    """A position with its four applicant tabs: All, Shortlisted, Favourites, Suggested."""
    job = get_object_or_404(Job, pk=job_id)
    manager = current_hiring_manager(request)

    applications = Application.objects.filter(job=job).select_related(
        "candidate", "candidate__profile"
    ).prefetch_related("candidate__profile__experience", "candidate__profile__education")
    bookmarked_ids = set()
    if manager:
        bookmarked_ids = set(
            CandidateBookmark.objects.filter(manager=manager).values_list(
                "candidate_id", flat=True
            )
        )

    applied_ids = set(applications.values_list("candidate_id", flat=True))

    # The pane beside the list shows the same detail whichever tab opened it,
    # so the suggestions carry it too. prefetch_related keeps that one query
    # each rather than one per candidate.
    pane = CandidatePaneMixin()
    suggested = []
    for profile in (
        CandidateProfile.objects.select_related("user")
        .prefetch_related("experience", "education")
        .exclude(user_id__in=applied_ids)
    ):
        match = score_match(profile, job)
        if match.score <= 0:
            continue
        suggested.append(
            {
                "candidate": UserSummarySerializer(profile.user).data,
                "headline": profile.headline,
                "location": profile.location,
                "match": match.as_dict(),
                "saved": profile.user_id in bookmarked_ids,
                "pane": pane._pane_fields(profile.user),
            }
        )
    suggested.sort(key=lambda row: row["match"]["score"], reverse=True)

    return Response(
        {
            "job": JobSerializer(job).data,
            "stats": {
                "total": applications.count(),
                "saved": sum(
                    1
                    for a in applications
                    if a.candidate_id in bookmarked_ids
                ),
                # "New" is what the manager has not opened yet, which is what
                # the frame's "Applications that haven't been viewed" means.
                "new": applications.filter(
                    status=ApplicationStatus.APPLIED
                ).count(),
            },
            "tabs": {
                "all": _with_saved(
                    ApplicantSerializer(applications, many=True).data, bookmarked_ids
                ),
                "shortlisted": _with_saved(
                    ApplicantSerializer(
                        applications.filter(status=ApplicationStatus.SHORTLISTED),
                        many=True,
                    ).data,
                    bookmarked_ids,
                ),
                "favourites": _with_saved(
                    ApplicantSerializer(
                        applications.filter(candidate_id__in=bookmarked_ids), many=True
                    ).data,
                    bookmarked_ids,
                ),
                "suggested": suggested,
            },
        }
    )


@api_view(["GET"])
def manager_dashboard(request):
    manager = current_hiring_manager(request)
    jobs = Job.objects.with_counts().annotate(
        applicants=Count("applications", distinct=True)
    )

    return Response(
        {
            "user": UserSummarySerializer(manager).data if manager else None,
            "stats": {
                "open_jobs": jobs.filter(status=JobStatus.ACTIVE).count(),
                "draft_jobs": jobs.filter(status=JobStatus.DRAFT).count(),
                "total_applicants": Application.objects.count(),
                "new_applicants": Application.objects.filter(
                    status=ApplicationStatus.APPLIED
                ).count(),
            },
            "jobs": JobSerializer(jobs.order_by("-created_at")[:6], many=True).data,
            "activity": ActivitySerializer(
                Activity.objects.select_related("actor")[:20], many=True
            ).data,
        }
    )


# The groups a manager narrows applicants by, as query parameter -> field.
CANDIDATE_FILTERS = {
    "experience_level": "experience_level",
    "role_category": "role_category",
    "work_setup": "preferred_work_setup",
    "availability": "availability",
    "employment_status": "employment_status",
    "education": "highest_education_level",
}


def _apply_candidate_filters(profiles, selected, *, skip=None):
    """Narrow by every selected group except `skip`.

    Skipping one group is what makes that group's own counts useful: they
    answer "how many if I picked this too", not "how many are left after I
    already picked it".
    """
    for param, field in CANDIDATE_FILTERS.items():
        if param == skip:
            continue
        values = selected.get(param) or []
        if values:
            profiles = profiles.filter(**{f"{field}__in": values})
    return profiles


@api_view(["GET"])
def manager_candidates(request):
    """The candidate database: search, filters and sorting from the designs.

    Multi-select with facet counts and paging, the same shape as the public
    job list. It used to take one value per group and serialise every
    profile, which neither narrows usefully nor survives a real database.
    """
    current_hiring_manager(request)

    profiles = CandidateProfile.objects.select_related("user")

    search = request.query_params.get("search", "").strip()
    if search:
        profiles = profiles.filter(
            Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(user__email__icontains=search)
            | Q(headline__icontains=search)
            | Q(role_category__icontains=search)
            | Q(location__icontains=search)
            | Q(skills__icontains=search)
        )

    # Only people who are open to being approached, when asked for.
    if request.query_params.get("open_only") in ("1", "true", "yes"):
        profiles = profiles.filter(profile_status=ProfileStatus.OPEN)

    selected = {param: _multi(request, param) for param in CANDIDATE_FILTERS}
    matching = _apply_candidate_filters(profiles, selected)

    facets: dict[str, dict[str, int]] = {}
    for param, field in CANDIDATE_FILTERS.items():
        pool = _apply_candidate_filters(profiles, selected, skip=param)
        facets[param] = {
            row[field]: row["count"]
            for row in pool.values(field).annotate(count=Count("id"))
            if row[field]
        }

    sort = request.query_params.get("sort", "newest")
    if sort == "oldest":
        matching = matching.order_by("created_at")
    elif sort == "activity":
        matching = matching.order_by("-updated_at")
    elif sort == "name":
        matching = matching.order_by("user__first_name", "user__last_name")
    else:
        matching = matching.order_by("-created_at")

    count = matching.count()
    try:
        limit = min(
            max(int(request.query_params.get("limit", DEFAULT_PAGE)), 1), MAX_PAGE
        )
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE
    try:
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (TypeError, ValueError):
        offset = 0

    page = matching[offset : offset + limit]

    return Response(
        {
            "results": CandidateProfileSerializer(page, many=True).data,
            "facets": facets,
            "count": count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(page) < count,
        }
    )


@api_view(["GET"])
def manager_candidate_detail(request, candidate_id: int):
    current_hiring_manager(request)

    profile = get_object_or_404(
        CandidateProfile.objects.select_related("user"), user_id=candidate_id
    )
    applications = Application.objects.filter(candidate_id=candidate_id).select_related(
        "job"
    )
    comments = CandidateComment.objects.filter(
        candidate_id=candidate_id
    ).select_related("author")

    manager = current_hiring_manager(request)
    bookmarked = CandidateBookmark.objects.filter(
        manager=manager, candidate_id=candidate_id
    ).exists()

    # Which of this manager's postings the candidate is already on.
    shortlisted = list(
        ShortlistEntry.objects.filter(candidate_id=candidate_id)
        .select_related("job")
        .values_list("job_id", flat=True)
    )

    return Response(
        {
            "profile": CandidateProfileSerializer(profile).data,
            "applications": ApplicationSerializer(applications, many=True).data,
            "comments": CandidateCommentSerializer(comments, many=True).data,
            "is_bookmarked": bookmarked,
            "shortlisted_job_ids": shortlisted,
        }
    )


@api_view(["POST"])
def manager_candidate_bookmark(request, candidate_id: int):
    """Bookmark or un-bookmark a candidate. Personal to the manager.

    A toggle rather than separate add and remove endpoints: the button is
    one control, and the response says which state it landed in so the
    page never has to guess.
    """
    manager = current_hiring_manager(request)
    candidate = get_object_or_404(User, pk=candidate_id, role=Role.JOB_SEEKER)

    existing = CandidateBookmark.objects.filter(
        manager=manager, candidate=candidate
    ).first()
    if existing:
        existing.delete()
        return Response({"bookmarked": False})

    CandidateBookmark.objects.create(manager=manager, candidate=candidate)
    return Response({"bookmarked": True})


@api_view(["POST"])
def manager_candidate_shortlist(request, candidate_id: int):
    """Put a candidate on a posting's shortlist, or take them off it.

    Shared, unlike a bookmark: a shortlist belongs to the job, so the whole
    hiring team sees it.
    """
    manager = current_hiring_manager(request)
    candidate = get_object_or_404(User, pk=candidate_id, role=Role.JOB_SEEKER)

    job_id = request.data.get("job_id") if isinstance(request.data, dict) else None
    if not job_id:
        return Response(
            {"detail": "Choose which position to shortlist them for."}, status=400
        )
    job = get_object_or_404(Job, pk=job_id)

    existing = ShortlistEntry.objects.filter(job=job, candidate=candidate).first()
    if existing:
        existing.delete()
        shortlisted = False
    else:
        ShortlistEntry.objects.create(job=job, candidate=candidate)
        shortlisted = True
        Activity.objects.create(
            actor=manager,
            verb="shortlisted",
            target=candidate.display_name,
        )

    return Response({"shortlisted": shortlisted, "job_id": job.id})


@api_view(["POST"])
def manager_candidate_comment(request, candidate_id: int):
    """Leave a note on a candidate for the hiring team (Development Plan, Day 12).

    Visible to every hiring manager who opens the profile — the point is
    that what one manager learns in an interview reaches the next one.
    """
    manager = current_hiring_manager(request)
    candidate = get_object_or_404(User, pk=candidate_id, role=Role.JOB_SEEKER)

    body = str((request.data or {}).get("body") or "").strip()
    if not body:
        return Response({"detail": "Write something before saving."}, status=400)
    if len(body) > 2000:
        return Response(
            {"detail": "Keep a note under 2 000 characters."}, status=400
        )

    comment = CandidateComment.objects.create(
        candidate=candidate, author=manager, body=body
    )
    Activity.objects.create(
        actor=manager, verb="commented on", target=candidate.display_name
    )

    return Response(
        {"comment": CandidateCommentSerializer(comment).data}, status=201
    )


@api_view(["POST"])
def manager_candidate_comment_delete(request, candidate_id: int, comment_id: int):
    """Remove your own note. One manager cannot delete another's."""
    manager = current_hiring_manager(request)

    comment = get_object_or_404(
        CandidateComment, pk=comment_id, candidate_id=candidate_id
    )
    if comment.author_id != manager.id:
        return Response(
            {"detail": "You can only remove a note you wrote."}, status=403
        )

    comment.delete()
    return Response({"detail": "Note removed."})


@api_view(["GET"])
def automatic_emails(request):
    """The emails, the triggers they can fire on, and what has been sent."""
    current_hiring_manager(request)

    emails = AutomaticEmail.objects.all()
    log = EmailLog.objects.select_related("template")[:100]

    return Response(
        {
            "results": AutomaticEmailSerializer(emails, many=True).data,
            "triggers": [
                {
                    "value": value,
                    "label": label,
                    # Which placeholders the wording may use, so the form can
                    # list them rather than leaving the manager to guess.
                    "placeholders": TRIGGER_PLACEHOLDERS.get(value, []),
                    "conditions": TRIGGER_CONDITIONS.get(value, []),
                }
                for value, label in EmailTrigger.choices
            ],
            "log": EmailLogSerializer(log, many=True).data,
        }
    )


# What each trigger can fill in, and how it can be narrowed. Kept beside the
# triggers themselves so adding one means stating both.
TRIGGER_PLACEHOLDERS = {
    EmailTrigger.APPLICATION_RECEIVED: ["candidate_name", "job_title", "company"],
    EmailTrigger.APPLICATION_STATUS_CHANGED: [
        "candidate_name",
        "job_title",
        "company",
        "status",
    ],
    EmailTrigger.NEW_JOB_PUBLISHED: ["candidate_name", "job_title", "company"],
    EmailTrigger.ACCOUNT_CREATED: ["candidate_name"],
}

TRIGGER_CONDITIONS = {
    EmailTrigger.APPLICATION_STATUS_CHANGED: [
        {
            "field": "status",
            "label": "Only when the status becomes",
            "options": [
                {"value": value, "label": label}
                for value, label in ApplicationStatus.choices
            ],
        }
    ],
}


@api_view(["POST"])
def automatic_email_save(request, email_id: int):
    """Save an email's subject and wording (Development Plan, Day 4).

    Every email sent after this uses the new wording; the ones already sent
    keep what they said, because EmailLog stores the rendered copy.
    """
    current_hiring_manager(request)
    email = get_object_or_404(AutomaticEmail, pk=email_id)

    data = request.data if isinstance(request.data, dict) else {}

    if "subject" in data:
        subject = str(data.get("subject") or "").strip()
        if not subject:
            return Response({"detail": "An email needs a subject."}, status=400)
        email.subject = subject[:200]

    if "body" in data:
        body = str(data.get("body") or "").strip()
        if not body:
            return Response({"detail": "An email needs some wording."}, status=400)
        is_html = bool(data.get("body_is_html", email.body_is_html))
        # Sanitised here as well as at send time. Storing markup a browser
        # sent us unchanged means the next thing to render it — a preview,
        # an export, a future screen — has to remember to clean it.
        email.body = sanitize_html(body) if is_html else body
        email.body_is_html = is_html

    if "label" in data:
        label = str(data.get("label") or "").strip()
        if not label:
            return Response({"detail": "An email needs a name."}, status=400)
        email.label = label[:160]

    # Allowed to be empty: a preheader is a nicety, not a requirement.
    if "preheader" in data:
        email.preheader = str(data.get("preheader") or "").strip()[:200]

    if "label" in data and str(data.get("label") or "").strip():
        email.label = str(data["label"]).strip()[:160]

    if "is_active" in data:
        email.is_active = bool(data.get("is_active"))

    if "conditions" in data:
        email.conditions = _email_conditions(email.trigger, data.get("conditions"))

    email.save()
    return Response(
        {"detail": f"{email.label} saved.", "email": AutomaticEmailSerializer(email).data}
    )


@api_view(["POST"])
def automatic_email_create(request):
    """Add a new automatic email on one of the supported triggers.

    The trigger must be one the code actually raises — a manager writes the
    wording and chooses when it fires, but cannot invent an event nothing
    will ever send.
    """
    manager = current_hiring_manager(request)
    data = request.data if isinstance(request.data, dict) else {}

    label = str(data.get("label") or "").strip()
    subject = str(data.get("subject") or "").strip()
    body = str(data.get("body") or "").strip()
    trigger = str(data.get("trigger") or "").strip()

    missing = [
        name
        for name, value in (
            ("label", label),
            ("subject", subject),
            ("body", body),
            ("trigger", trigger),
        )
        if not value
    ]
    if missing:
        return Response(
            {
                "detail": "Please fill in every required field.",
                "fields": missing,
                "field_errors": {f: "This field is required." for f in missing},
            },
            status=400,
        )

    if trigger not in {value for value, _ in EmailTrigger.choices}:
        return Response(
            {
                "detail": "Choose a trigger the portal can actually send on.",
                "fields": ["trigger"],
                "field_errors": {"trigger": "Not a supported trigger."},
            },
            status=400,
        )

    event = _unique_event_key(label)
    email = AutomaticEmail.objects.create(
        event=event,
        label=label[:160],
        subject=subject[:200],
        body=body,
        trigger=trigger,
        conditions=_email_conditions(trigger, data.get("conditions")),
        is_active=bool(data.get("is_active", True)),
        created_by=manager,
    )

    Activity.objects.create(
        actor=manager, verb="added an automatic email", target=email.label
    )

    return Response(
        {"detail": f"{email.label} added.", "email": AutomaticEmailSerializer(email).data},
        status=201,
    )


@api_view(["POST"])
def automatic_email_delete(request, email_id: int):
    """Remove an email added in the portal.

    The three the Client supplied are part of the agreed scope and are not
    deletable — switch one off instead, which stops it sending without
    losing the wording.
    """
    current_hiring_manager(request)
    email = get_object_or_404(AutomaticEmail, pk=email_id)

    if email.created_by_id is None:
        return Response(
            {
                "detail": (
                    f"{email.label} is one of the emails supplied for the "
                    "portal and cannot be deleted. Switch it off instead."
                )
            },
            status=409,
        )

    label = email.label
    email.delete()
    return Response({"detail": f"{label} deleted."})


def _email_conditions(trigger: str, raw) -> dict:
    """Keep only the conditions this trigger actually supports."""
    if not isinstance(raw, dict):
        return {}

    allowed = {
        rule["field"]: {option["value"] for option in rule["options"]}
        for rule in TRIGGER_CONDITIONS.get(trigger, [])
    }
    return {
        field: str(value)
        for field, value in raw.items()
        if field in allowed and str(value) in allowed[field]
    }


def _unique_event_key(label: str) -> str:
    """A stable slug for a new email, unique against the ones already there."""
    base = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")[:60] or "custom_email"
    key, number = base, 2
    while AutomaticEmail.objects.filter(event=key).exists():
        key = f"{base}_{number}"
        number += 1
    return key


# --- Option lists the profile form's dropdowns offer -------------------------
# Plain data rather than model choices: these are reference lists a candidate
# picks from, not states the application moves through.

# South Africa's twelve official languages first, in the order the
# Constitution lists them, then the ones MOC's offshore clients ask for. The
# value is the name itself: these are stored as typed, not as codes.
LANGUAGES = [
    "English",
    "Afrikaans",
    "isiNdebele",
    "isiXhosa",
    "isiZulu",
    "Sepedi",
    "Sesotho",
    "Setswana",
    "siSwati",
    "Tshivenda",
    "Xitsonga",
    "South African Sign Language",
    "Arabic",
    "Dutch",
    "French",
    "German",
    "Hindi",
    "Italian",
    "Japanese",
    "Mandarin",
    "Portuguese",
    "Russian",
    "Spanish",
    "Swahili",
    "Urdu",
]

LANGUAGE_PROFICIENCY = [
    ("native", "Native"),
    ("fluent", "Fluent"),
    ("conversational", "Conversational"),
    ("basic", "Basic"),
]

GENDERS = [
    ("female", "Female"),
    ("male", "Male"),
    ("non_binary", "Non-binary"),
    ("other", "Other"),
    ("undisclosed", "Prefer not to say"),
]

# Employment Equity Act population groups.
ETHNICITIES = [
    ("african", "African"),
    ("coloured", "Coloured"),
    ("indian", "Indian"),
    ("white", "White"),
    ("other", "Other"),
    ("undisclosed", "Prefer not to say"),
]

# Every country, so nobody has to pick "Other". South Africa and the rest of
# the SADC region are pulled to the front because that is where almost every
# MOC candidate is; the remainder is alphabetical. The dropdown searches, so
# the length costs nothing.
NEAR_COUNTRIES = [
    "South Africa",
    "Botswana",
    "Eswatini",
    "Lesotho",
    "Mozambique",
    "Namibia",
    "Zimbabwe",
]

OTHER_COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
    "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
    "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Brazil", "Brunei", "Bulgaria", "Burkina Faso",
    "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
    "Central African Republic", "Chad", "Chile", "China", "Colombia",
    "Comoros", "Congo (Brazzaville)", "Congo (Kinshasa)", "Costa Rica",
    "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti",
    "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia", "Fiji",
    "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
    "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran",
    "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
    "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
    "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Liberia", "Libya",
    "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
    "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
    "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
    "Mongolia", "Montenegro", "Morocco", "Myanmar", "Nauru", "Nepal",
    "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
    "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
    "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
    "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
    "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Samoa", "San Marino",
    "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia",
    "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
    "Solomon Islands", "Somalia", "South Korea", "South Sudan", "Spain",
    "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
    "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
    "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia",
]

COUNTRIES = NEAR_COUNTRIES + sorted(OTHER_COUNTRIES)

# The disciplines MOC recruits for. A fixed list rather than whatever happens
# to be on a live posting: a seeker must be able to say "Legal" before there
# is a single legal job on the board.
ROLE_CATEGORIES = [
    "Accounting and Finance",
    "Administration",
    "Architecture",
    "Customer Support",
    "Data",
    "Design",
    "Education and Training",
    "Engineering",
    "Healthcare",
    "Human Resources",
    "Insurance",
    "Legal",
    "Logistics and Supply Chain",
    "Manufacturing",
    "Marketing",
    "Operations",
    "Procurement",
    "Product Management",
    "Project Management",
    "Property and Facilities",
    "Quality Assurance",
    "Research",
    "Sales",
    "Security",
    "Software Development",
    "Sustainability",
    "Writing and Content",
]

# What MOC's offshore clients actually work to.
TIMEZONES = [
    ("UTC+2", "UTC+2 — South Africa (SAST)"),
    ("UTC+0", "UTC+0 — United Kingdom / Ireland"),
    ("UTC+1", "UTC+1 — Central Europe"),
    ("UTC-5", "UTC-5 — US Eastern"),
    ("UTC-6", "UTC-6 — US Central"),
    ("UTC-8", "UTC-8 — US Pacific"),
    ("UTC+10", "UTC+10 — Australia Eastern"),
    ("flexible", "Flexible — happy to overlap"),
]

BENEFITS = [
    ("medical_aid", "Medical aid"),
    ("provident_fund", "Provident fund"),
    ("annual_bonus", "Annual bonus"),
    ("flexible_hours", "Flexible hours"),
    ("remote_allowance", "Remote allowance"),
    ("study_support", "Study support"),
    ("parental_leave", "Parental leave"),
    ("wellness", "Wellness benefit"),
]

CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AUD"]


@api_view(["GET"])
def profile_options(request):
    """Every choice list the profile form's dropdowns offer.

    Served from the model's own TextChoices so the form can never drift from
    what the database will accept.
    """

    def opts(choices):
        return [{"value": v, "label": l} for v, l in choices]

    return Response(
        {
            "profile_status": opts(ProfileStatus.choices),
            "employment_status": opts(EmploymentStatus.choices),
            "availability": opts(Availability.choices),
            "experience_level": opts(ExperienceLevel.choices),
            "work_setup": opts(WorkSetup.choices),
            "employment_type": opts(EmploymentType.choices),
            "job_status": opts(JobStatus.choices),
            "citizenship_requirement": opts(CitizenshipRequirement.choices),
            "industry_experience": opts(IndustryExperience.choices),
            # Years of experience, as a list so the form can use one control
            # type for every number it asks for.
            "years_experience": [
                {"value": str(n), "label": "No minimum" if n == 0
                 else ("1 year" if n == 1 else f"{n}+ years")}
                for n in (0, 1, 2, 3, 4, 5, 7, 10, 15)
            ],
            "night_shift": opts(NightShift.choices),
            "education_level": opts(EducationLevel.choices),
            "proficiency": opts(Proficiency.choices),
            "salary_period": opts(SalaryPeriod.choices),
            "importance": [
                {"value": "low", "label": "Nice to have"},
                {"value": "medium", "label": "Important"},
                {"value": "high", "label": "Essential"},
            ],
            "language": [{"value": l, "label": l} for l in LANGUAGES],
            "language_proficiency": [
                {"value": v, "label": l} for v, l in LANGUAGE_PROFICIENCY
            ],
            "gender": [{"value": v, "label": l} for v, l in GENDERS],
            # The Employment Equity Act population groups, plus an opt-out.
            "ethnicity": [{"value": v, "label": l} for v, l in ETHNICITIES],
            "nationality": [{"value": c, "label": c} for c in COUNTRIES],
            "citizenship": [{"value": c, "label": c} for c in COUNTRIES],
            "country": [{"value": c, "label": c} for c in COUNTRIES],
            "timezone": [{"value": v, "label": l} for v, l in TIMEZONES],
            "benefits": [{"value": v, "label": l} for v, l in BENEFITS],
            "currency": [{"value": c, "label": c} for c in CURRENCIES],
            # The fixed list, plus any discipline a live posting uses that
            # is not on it, so an older job can never fall out of the filter.
            "role_categories": [
                {"value": c, "label": c}
                for c in sorted(
                    set(ROLE_CATEGORIES)
                    | set(
                        Job.objects.exclude(role_category="").values_list(
                            "role_category", flat=True
                        )
                    )
                )
            ],
        }
    )


@api_view(["GET"])
def candidate_branded_cv(request):
    """Download the MOC-branded CV (Development Plan, Day 7).

    Gated at 80% profile completion. The button is hidden below that, but the
    gate lives here too — a hidden button is a suggestion, not a rule, and
    this URL is guessable.
    """
    seeker = current_job_seeker(request)
    profile, _ = CandidateProfile.objects.get_or_create(user=seeker)

    if not profile.can_download_branded_cv:
        return Response(
            {
                "detail": (
                    "Your profile needs to be at least 80% complete to download "
                    f"your MOC-branded CV. It is {profile.completion}% now."
                ),
                "completion": profile.completion,
                "required": 80,
            },
            status=403,
        )

    pdf = build_cv(profile)
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{cv_filename(profile)}"'
    return response


@api_view(["GET"])
def health(request):
    """Liveness probe — also what the front end uses to show backend status."""
    return Response({"status": "ok", "time": timezone.now().isoformat()})
