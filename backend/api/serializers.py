"""Serializers shaping the API payloads the front end renders."""

from django.utils import timezone
from rest_framework import serializers

from .models import (
    PIPELINE,
    PROFILE_SECTIONS,
    Activity,
    Application,
    ApplicationEvent,
    ApplicationStatus,
    CandidateComment,
    AutomaticEmail,
    EmailLog,
    CandidateProfile,
    Job,
    User,
    Education,
    WorkExperience,
)


class UserSummarySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "initials", "email", "phone", "role"]


class CandidateCommentSerializer(serializers.ModelSerializer):
    """A team note on a candidate, with who wrote it."""

    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = CandidateComment
        fields = ["id", "author", "body", "created_at"]


class JobSerializer(serializers.ModelSerializer):
    """A job as every card, row and detail page in the designs needs it."""

    status_label = serializers.CharField(source="get_status_display", read_only=True)
    work_setup_label = serializers.CharField(source="get_work_setup_display", read_only=True)
    experience_label = serializers.CharField(
        source="get_experience_level_display", read_only=True
    )
    employment_label = serializers.CharField(
        source="get_employment_type_display", read_only=True
    )
    applicant_count = serializers.IntegerField(read_only=True)
    new_applicant_count = serializers.IntegerField(read_only=True)
    closes_soon = serializers.BooleanField(read_only=True)
    days_until_close = serializers.IntegerField(read_only=True, allow_null=True)
    working_hours_label = serializers.CharField(read_only=True)
    working_hours_count = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Job
        fields = [
            "id",
            "title",
            "role_category",
            "company",
            "location",
            "description",
            "work_setup",
            "work_setup_label",
            "salary_label",
            "experience_level",
            "experience_label",
            "employment_type",
            "employment_label",
            "timezone_label",
            "status",
            "status_label",
            "required_skills",
            "posted_at",
            "closes_at",
            "ideal_start_date",
            "hr_email",
            "hr_phone",
            "candidate_location",
            "night_shift",
            "flexible_hours",
            "citizenship_requirement",
            "language_requirements",
            "minimum_years_experience",
            "industry_experience",
            "education_requirement",
            "field_of_study",
            "salary_currency",
            "salary_min",
            "salary_max",
            "salary_period",
            "benefits",
            "updated_at",
            "applicant_count",
            "new_applicant_count",
            "closes_soon",
            "days_until_close",
            # The detail view
            "company_industry",
            "company_location",
            "about_company",
            "key_responsibilities",
            "software_tools",
            "advantageous_tools",
            "working_hours_start",
            "working_hours_end",
            "working_hours_label",
            "working_hours_count",
        ]


class ProfileSectionSerializer(serializers.Serializer):
    slug = serializers.CharField()
    label = serializers.CharField()
    progress = serializers.IntegerField()
    completed = serializers.BooleanField()


class EducationSerializer(serializers.ModelSerializer):
    level_label = serializers.CharField(source="get_level_display", read_only=True)

    class Meta:
        model = Education
        fields = [
            "id",
            "level",
            "level_label",
            "field_of_study",
            "institution_name",
            "graduation_year",
            "is_current",
            "position",
        ]


class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = [
            "id",
            "job_title",
            "company_name",
            "employment_type",
            "start_date",
            "end_date",
            "is_current",
            "reason_for_leaving",
            "key_responsibilities",
        ]


class CandidateProfileSerializer(serializers.ModelSerializer):
    """The whole profile, as the eight-section creation form reads and writes it."""

    user = UserSummarySerializer(read_only=True)
    completion = serializers.IntegerField(read_only=True)
    strength = serializers.CharField(read_only=True)
    can_download_branded_cv = serializers.BooleanField(read_only=True)
    sections = serializers.SerializerMethodField()
    experience = WorkExperienceSerializer(many=True, read_only=True)
    education = EducationSerializer(many=True, read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CandidateProfile
        fields = [
            "id",
            "user",
            # Personal details
            "headline",
            "preferred_name",
            "country_of_residence",
            "location",
            "profile_status",
            "languages",
            "linkedin_url",
            "portfolio_url",
            "photo_url",
            "summary",
            # Optional EE information
            "gender",
            "nationality",
            "citizenship",
            "ethnicity",
            "has_disability",
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
            "graduation_year",
            "institution_name",
            # Experience
            "experience",
            "education",
            # Remuneration & benefits
            "current_salary_currency",
            "current_salary_amount",
            "current_salary_period",
            "expected_salary_currency",
            "expected_salary_amount",
            "expected_salary_period",
            "benefits",
            # Skills & tools
            "skills",
            "software_tools",
            # Privacy & profile sharing
            "do_not_share_with",
            "sharing_agreed",
            # Derived
            "completion",
            "strength",
            "can_download_branded_cv",
            "sections",
            "updated_at",
        ]

    def get_photo_url(self, obj) -> str:
        """Absolute, because the front end runs on its own origin."""
        if not obj.photo:
            return ""
        from django.conf import settings

        url = obj.photo.url
        return url if url.startswith("http") else f"{settings.API_BASE_URL}{url}"

    def get_sections(self, obj) -> list[dict]:
        """The eight progress rows, in the order the designs show them."""
        return [
            {
                "slug": slug,
                "label": label,
                "progress": int(obj.section_progress.get(slug, 0)),
                "completed": int(obj.section_progress.get(slug, 0)) >= 100,
            }
            for slug, label in PROFILE_SECTIONS
        ]


class ApplicationEventSerializer(serializers.ModelSerializer):
    from_label = serializers.SerializerMethodField()
    to_label = serializers.CharField(source="get_to_status_display", read_only=True)

    class Meta:
        model = ApplicationEvent
        fields = [
            "id",
            "from_status",
            "from_label",
            "to_status",
            "to_label",
            "note",
            "created_at",
        ]

    def get_from_label(self, obj) -> str:
        if not obj.from_status:
            return ""
        return ApplicationStatus(obj.from_status).label


class ApplicationSerializer(serializers.ModelSerializer):
    """One application, with enough to show where it sits in the process.

    The Development Plan asks the applications page for the position, the date
    and the status; the SOW asks both roles to monitor the stage reached. The
    pipeline and the event history are what make that showable rather than a
    single badge.
    """

    job = JobSerializer(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    stage_index = serializers.IntegerField(read_only=True)
    is_closed = serializers.BooleanField(read_only=True)
    pipeline = serializers.SerializerMethodField()
    events = ApplicationEventSerializer(many=True, read_only=True)
    sent = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "status",
            "status_label",
            "stage_index",
            "is_closed",
            "pipeline",
            "events",
            "sent",
            "applied_at",
            "updated_at",
        ]

    def get_pipeline(self, obj) -> list[dict]:
        return [
            {"value": status.value, "label": status.label} for status in PIPELINE
        ]

    def get_sent(self, obj) -> dict:
        """What went to the position with this application (Day 5)."""
        profile = getattr(obj.candidate, "profile", None)
        return {
            "profile": bool(profile),
            "profile_completion": profile.completion if profile else 0,
            "cv": bool(profile and profile.cv),
            "documents": 0,
        }



class CandidatePaneMixin:
    """The fields the job detail view's candidate pane shows.

    Shared by the applicant rows and the suggested rows because the pane is
    the same pane whichever tab opened it — a manager comparing a suggestion
    against an applicant should not find half the detail missing on one of
    them.
    """

    def _pane_profile(self, user):
        return getattr(user, "profile", None)

    def _years_experience(self, profile) -> int | None:
        """Total years across the roles on the record, rounded down.

        Summed from the entries rather than read off experience_level,
        because the design shows a number and the level is a band. A role
        still running counts up to today.
        """
        if profile is None:
            return None
        days = 0
        for role in profile.experience.all():
            start = role.start_date
            if not start:
                continue
            end = role.end_date or timezone.now().date()
            if end < start:
                continue
            days += (end - start).days
        return days // 365 if days else None

    def _pane_fields(self, user) -> dict:
        profile = self._pane_profile(user)
        if profile is None:
            return {
                "role_title": "",
                "summary": "",
                "years_experience": None,
                "availability_label": "",
                "skills": [],
                "education": "",
            }

        # Skills are stored either as plain strings (older rows) or as
        # {name, proficiency} objects.
        skills = [
            entry.get("name") if isinstance(entry, dict) else entry
            for entry in (profile.skills or [])
        ]

        qualification = profile.education.first()
        if qualification:
            education = ", ".join(
                part
                for part in (
                    qualification.get_level_display(),
                    qualification.field_of_study,
                    qualification.institution_name,
                )
                if part
            )
        elif profile.highest_education_level:
            education = profile.get_highest_education_level_display()
        else:
            education = ""

        return {
            "role_title": profile.headline or profile.role_category,
            "summary": profile.summary,
            "years_experience": self._years_experience(profile),
            "availability_label": profile.get_availability_display()
            if profile.availability
            else "",
            "skills": [s for s in skills if s][:8],
            "education": education,
        }


class ApplicantSerializer(CandidatePaneMixin, serializers.ModelSerializer):
    """One row in a position's applicant tabs."""

    candidate = UserSummarySerializer(read_only=True)
    headline = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    match = serializers.SerializerMethodField()
    pane = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "candidate",
            "headline",
            "location",
            "status",
            "status_label",
            "applied_at",
            "match",
            "pane",
        ]

    def get_pane(self, obj) -> dict:
        return self._pane_fields(obj.candidate)

    def _profile(self, obj):
        return getattr(obj.candidate, "profile", None)

    def get_headline(self, obj) -> str:
        profile = self._profile(obj)
        return profile.headline if profile else ""

    def get_location(self, obj) -> str:
        profile = self._profile(obj)
        return profile.location if profile else ""

    def get_match(self, obj) -> dict:
        from .matching import score_match

        return score_match(self._profile(obj), obj.job).as_dict()


class ActivitySerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)

    class Meta:
        model = Activity
        fields = ["id", "actor", "verb", "target", "created_at"]


class EmailLogSerializer(serializers.ModelSerializer):
    """One sent email, as the log lists it."""

    trigger_label = serializers.CharField(
        source="get_trigger_display", read_only=True
    )
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    template_label = serializers.CharField(
        source="template.label", read_only=True, default=""
    )

    class Meta:
        model = EmailLog
        fields = [
            "id",
            "trigger",
            "trigger_label",
            "template_label",
            "recipient",
            "subject",
            "body",
            "status",
            "status_label",
            "error",
            "about",
            "created_at",
        ]


class AutomaticEmailSerializer(serializers.ModelSerializer):
    trigger_label = serializers.CharField(
        source="get_trigger_display", read_only=True
    )
    # False for the three the Client supplied: those can be switched off but
    # not deleted, and the UI needs to know which is which.
    is_custom = serializers.SerializerMethodField()
    send_count = serializers.SerializerMethodField()

    class Meta:
        model = AutomaticEmail
        fields = [
            "id",
            "event",
            "label",
            "subject",
            "preheader",
            "body",
            "body_is_html",
            "trigger",
            "trigger_label",
            "conditions",
            "is_active",
            "is_custom",
            "send_count",
            "updated_at",
        ]

    def get_is_custom(self, email) -> bool:
        return email.created_by_id is not None

    def get_send_count(self, email) -> int:
        return email.sends.count()
