"""Five fully-filled postings with real applicant activity behind them.

`seed` builds the hand-written demo set and `seed_bulk_jobs` the ten thousand
rows that prove search scales. Neither puts many *applicants* on a posting, so
every card on the manager dashboard reads "0 Total / 0 New" and the pipeline,
the applicant tabs and the stat tiles have nothing to show.

This fills that gap: five complete postings — every field the detail page and
the posting form read — each with applicants spread across the recruitment
stages, some shortlisted, bookmarked and saved, and the activity feed written
to match.

    manage.py seed_demo_activity                 # add or refresh the five
    manage.py seed_demo_activity --clear         # remove them again

Idempotent: run it twice and you get the same five postings, not ten.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from api.models import (
    Activity,
    Application,
    ApplicationEvent,
    ApplicationStatus,
    CandidateBookmark,
    CandidateProfile,
    EmploymentType,
    ExperienceLevel,
    Job,
    JobStatus,
    NightShift,
    Role,
    SavedJob,
    ShortlistEntry,
    User,
    WorkSetup,
)

# The demo postings are found by this exact sentence in about_company.
# It reads as ordinary copy on the page — an earlier version appended a
# "[demo-activity]" tag, which was unique but showed up in the UI.
def about_for(company: str) -> str:
    return (
        f"{company} is one of the employers Magnum Opus Consultants places "
        "candidates with."
    )

POSTINGS = [
    {
        "title": "Senior Product Designer",
        "role_category": "Design",
        "company": "Meridian Health Group",
        "company_industry": "Healthcare",
        "company_location": "Pretoria",
        "location": "Pretoria",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.SENIOR,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "minimum_years_experience": 6,
        "salary_min": 780000,
        "salary_max": 960000,
        "description": (
            "Lead design on our patient-facing products, from discovery through "
            "to handover. You will own the design system, run research sessions "
            "with clinicians, and work alongside two engineers and a product "
            "manager on the work that reaches patients first."
        ),
        "key_responsibilities": [
            "Own the end-to-end design of the patient booking journey",
            "Run fortnightly research sessions with clinicians and patients",
            "Maintain and extend the design system with the front-end team",
            "Present design rationale to clinical and executive stakeholders",
        ],
        "required_skills": [
            {"name": "Figma", "level": "required", "proficiency": "expert"},
            {"name": "Design systems", "level": "required", "proficiency": "advanced"},
            {"name": "User research", "level": "required", "proficiency": "advanced"},
            {"name": "Prototyping", "level": "preferred", "proficiency": "intermediate"},
        ],
        "software_tools": [
            {"name": "Figma", "proficiency": "expert"},
            {"name": "Maze", "proficiency": "intermediate"},
        ],
        "benefits": ["Medical aid", "Annual bonus", "Hybrid working", "Study allowance"],
        "applicants": 9,
        "closes_in_days": 24,
        "posted_days_ago": 12,
    },
    {
        "title": "Backend Engineer (Python)",
        "role_category": "Engineering",
        "company": "Streamline Logistics",
        "company_industry": "Transport and logistics",
        "company_location": "Johannesburg",
        "location": "Johannesburg",
        "work_setup": WorkSetup.REMOTE,
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "minimum_years_experience": 4,
        "salary_min": 660000,
        "salary_max": 840000,
        "description": (
            "Own the services that move freight data between our depots, our "
            "customers and the carriers. Django and Postgres, a small team, and "
            "a codebase that still has to be readable in three years."
        ),
        "key_responsibilities": [
            "Design and build the carrier integration APIs",
            "Keep the consignment pipeline within its latency budget",
            "Review code and mentor two junior engineers",
            "Carry the on-call pager one week in four",
        ],
        "required_skills": [
            {"name": "Python", "level": "required", "proficiency": "advanced"},
            {"name": "Django", "level": "required", "proficiency": "advanced"},
            {"name": "PostgreSQL", "level": "required", "proficiency": "intermediate"},
            {"name": "AWS", "level": "preferred", "proficiency": "intermediate"},
        ],
        "software_tools": [
            {"name": "Docker", "proficiency": "advanced"},
            {"name": "Git", "proficiency": "expert"},
        ],
        "benefits": ["Fully remote", "Annual bonus", "Home office allowance"],
        "applicants": 14,
        "closes_in_days": 18,
        "posted_days_ago": 20,
    },
    {
        "title": "Management Accountant",
        "role_category": "Finance",
        "company": "Northbridge Financial",
        "company_industry": "Financial services",
        "company_location": "Cape Town",
        "location": "Cape Town",
        "work_setup": WorkSetup.OFFICE,
        "experience_level": ExperienceLevel.SENIOR,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "minimum_years_experience": 5,
        "salary_min": 720000,
        "salary_max": 870000,
        "description": (
            "Run the monthly management accounts for three operating divisions, "
            "and be the person the divisional heads come to before they commit "
            "spend rather than after."
        ),
        "key_responsibilities": [
            "Produce the monthly management accounts and variance commentary",
            "Partner with divisional heads on budgets and forecasts",
            "Own the annual budget cycle end to end",
            "Support the external audit",
        ],
        "required_skills": [
            {"name": "Management accounting", "level": "required", "proficiency": "expert"},
            {"name": "Excel", "level": "required", "proficiency": "expert"},
            {"name": "Power BI", "level": "preferred", "proficiency": "intermediate"},
        ],
        "software_tools": [
            {"name": "Sage", "proficiency": "advanced"},
            {"name": "Excel", "proficiency": "expert"},
        ],
        "benefits": ["Medical aid", "Provident fund", "Parking"],
        "applicants": 7,
        "closes_in_days": 31,
        "posted_days_ago": 6,
    },
    {
        "title": "Talent Acquisition Partner",
        "role_category": "Human Resources",
        "company": "Silverbrook Insurance",
        "company_industry": "Insurance",
        "company_location": "Durban",
        "location": "Durban",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "minimum_years_experience": 3,
        "salary_min": 480000,
        "salary_max": 600000,
        "description": (
            "Run end-to-end hiring for our claims and actuarial teams. You will "
            "own the shortlist, the interview loop and the candidate experience "
            "from first contact to offer."
        ),
        "key_responsibilities": [
            "Own requisitions across claims and actuarial",
            "Build and maintain a pipeline of passive candidates",
            "Coach hiring managers on structured interviewing",
            "Report on time-to-hire and offer acceptance",
        ],
        "required_skills": [
            {"name": "Recruitment", "level": "required", "proficiency": "advanced"},
            {"name": "Stakeholder management", "level": "required", "proficiency": "advanced"},
            {"name": "Sourcing", "level": "preferred", "proficiency": "intermediate"},
        ],
        "software_tools": [{"name": "LinkedIn Recruiter", "proficiency": "advanced"}],
        "benefits": ["Medical aid", "Hybrid working", "Study allowance"],
        "applicants": 11,
        "closes_in_days": 9,
        "posted_days_ago": 28,
    },
    {
        "title": "Data Analyst",
        "role_category": "Data",
        "company": "Oakline Retail",
        "company_industry": "Retail",
        "company_location": "Cape Town",
        "location": "Cape Town",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.JUNIOR,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.DRAFT,
        "minimum_years_experience": 2,
        "salary_min": 380000,
        "salary_max": 480000,
        "description": (
            "Turn till data into the weekly trading pack the buying team argues "
            "over every Monday. SQL first, dashboards second, and a standing "
            "invitation to question the numbers you are given."
        ),
        "key_responsibilities": [
            "Build and maintain the weekly trading dashboards",
            "Answer ad-hoc questions from the buying and supply teams",
            "Keep the reporting models documented and tested",
        ],
        "required_skills": [
            {"name": "SQL", "level": "required", "proficiency": "advanced"},
            {"name": "Power BI", "level": "required", "proficiency": "intermediate"},
            {"name": "Python", "level": "preferred", "proficiency": "basic"},
        ],
        "software_tools": [{"name": "Power BI", "proficiency": "advanced"}],
        "benefits": ["Staff discount", "Hybrid working"],
        # A draft is not on the board, so nobody can have applied to it. The
        # zero is the point: it shows the draft state honestly.
        "applicants": 0,
        "closes_in_days": 40,
        "posted_days_ago": None,
    },
]

# How a real pipeline thins out: most applicants are still unreviewed, a few
# reach interview, one or two an offer. A flat spread would make the funnel
# on the dashboard meaningless.
#
# Used as weights for random.choices, not walked in order. Indexing it by
# position gave every posting exactly five "Applied" — because the first
# five entries are APPLIED — so four different jobs all reported "5 New"
# and the numbers read as invented, which they were.
PIPELINE = (
    [ApplicationStatus.APPLIED] * 5
    + [ApplicationStatus.IN_REVIEW] * 3
    + [ApplicationStatus.SHORTLISTED] * 2
    + [ApplicationStatus.INTERVIEW] * 2
    + [ApplicationStatus.OFFER]
    + [ApplicationStatus.REJECTED] * 2
)


class Command(BaseCommand):
    help = "Create five detailed demo postings with applicants, stages and activity."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove the demo postings and everything attached to them.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20261026,
            help="Random seed, so repeated runs produce the same spread.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # This writes invented applicants and activity. Harmless locally,
        # misleading on the live portal, so it refuses to run there.
        if not settings.DEBUG:
            raise CommandError(
                "Refusing to run with DEBUG off — this writes fake applicants "
                "and would pollute real recruitment data."
            )

        if options["clear"]:
            return self._clear()

        random.seed(options["seed"])

        manager = User.objects.filter(role=Role.HIRING_MANAGER).first()
        if manager is None:
            raise CommandError("No hiring manager found. Run `manage.py seed` first.")

        seekers = list(
            CandidateProfile.objects.select_related("user").filter(
                user__role=Role.JOB_SEEKER
            )
        )
        if not seekers:
            raise CommandError("No candidates found. Run `manage.py seed` first.")

        now = timezone.now()
        made = 0

        for spec in POSTINGS:
            spec = dict(spec)
            applicants = spec.pop("applicants")
            closes_in = spec.pop("closes_in_days")
            posted_ago = spec.pop("posted_days_ago")

            # Keyed on title + that exact sentence, not on title + company:
            # the bulk seed already holds several postings with the same
            # title at the same employer, and matching on those finds seven.
            about = about_for(spec["company"])

            job, created = Job.objects.update_or_create(
                title=spec["title"],
                about_company=about,
                defaults={
                    **spec,
                    "about_company": about,
                    "created_by": manager,
                    "closes_at": now + timedelta(days=closes_in),
                    "posted_at": (
                        now - timedelta(days=posted_ago)
                        if posted_ago is not None
                        else None
                    ),
                    "hr_email": "careers@moc-pty.com",
                    "hr_phone": "+27 12 000 0000",
                    "night_shift": NightShift.NO,
                    "flexible_hours": True,
                    "working_hours_start": 8,
                    "working_hours_end": 17,
                    "salary_currency": "ZAR",
                    "salary_period": "annual",
                    "salary_label": "Market-related",
                    "timezone_label": "UTC+2",
                },
            )
            made += 1
            self._populate(job, applicants, seekers, manager, now)
            self.stdout.write(
                f"  {'created' if created else 'updated'}  {job.title} "
                f"({job.get_status_display()}, {applicants} applicants)"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{made} demo postings ready. "
                f"{Application.objects.count()} applications in total."
            )
        )

    def _populate(self, job, applicants, seekers, manager, now):
        """Give one posting its applicants, stages, shortlist and activity."""
        # Start clean so a re-run does not stack a second set of applicants
        # on the same posting.
        Application.objects.filter(job=job).delete()
        ShortlistEntry.objects.filter(job=job).delete()
        SavedJob.objects.filter(job=job).delete()

        if applicants <= 0:
            return

        chosen = random.sample(seekers, min(applicants, len(seekers)))
        # More applicants than candidates in the database is normal — let the
        # same people apply to different postings rather than inventing users.
        while len(chosen) < applicants:
            chosen.append(random.choice(seekers))
            chosen = list({p.user_id: p for p in chosen}.values())
            if len(chosen) >= len(seekers):
                break

        # Drawn per posting, so the split between unreviewed, in review and
        # interviewed differs from one job to the next the way it really does.
        statuses = random.choices(PIPELINE, k=len(chosen))
        # Guarantee at least one still unreviewed, or a posting can show
        # "0 New" while plainly having applicants.
        if ApplicationStatus.APPLIED not in statuses:
            statuses[random.randrange(len(statuses))] = ApplicationStatus.APPLIED

        for index, profile in enumerate(chosen):
            status = statuses[index]
            applied_at = now - timedelta(days=random.randint(1, 21), hours=random.randint(0, 23))

            application = Application.objects.create(
                job=job,
                candidate=profile.user,
                status=status,
                applied_at=applied_at,
            )

            # The history the pipeline view draws: always an "applied" entry,
            # then one per stage it has moved through since.
            ApplicationEvent.objects.create(
                application=application,
                to_status=ApplicationStatus.APPLIED,
                created_at=applied_at,
            )
            if status != ApplicationStatus.APPLIED:
                ApplicationEvent.objects.create(
                    application=application,
                    from_status=ApplicationStatus.APPLIED,
                    to_status=status,
                    actor=manager,
                    created_at=applied_at + timedelta(days=2),
                )

            if status in (
                ApplicationStatus.SHORTLISTED,
                ApplicationStatus.INTERVIEW,
                ApplicationStatus.OFFER,
            ):
                ShortlistEntry.objects.get_or_create(
                    job=job,
                    candidate=profile.user,
                    defaults={
                        "stage": status,
                        "note": "Strong on the core requirements; worth a call.",
                        "rating": random.randint(3, 5),
                    },
                )
                CandidateBookmark.objects.get_or_create(
                    manager=manager, candidate=profile.user
                )

            # Not get_or_create: the feed already holds rows with this
            # verb and target from earlier seeds, and get() on them raises.
            if not Activity.objects.filter(
                actor=profile.user, verb="applied for", target=job.title
            ).exists():
                Activity.objects.create(
                    actor=profile.user,
                    verb="applied for",
                    target=job.title,
                    created_at=applied_at,
                )

        # A couple of people saved it without applying — that is what the
        # saved-jobs list and the "saved but never applied" question need.
        for profile in random.sample(seekers, min(2, len(seekers))):
            SavedJob.objects.get_or_create(job=job, candidate=profile.user)

        if job.posted_at:
            if not Activity.objects.filter(
                actor=manager, verb="published", target=job.title
            ).exists():
                Activity.objects.create(
                    actor=manager,
                    verb="published",
                    target=job.title,
                    created_at=job.posted_at,
                )

    def _clear(self):
        jobs = Job.objects.filter(
            about_company__in=[about_for(spec["company"]) for spec in POSTINGS],
            title__in=[spec["title"] for spec in POSTINGS],
        )
        titles = list(jobs.values_list("title", flat=True))
        count = jobs.count()
        # Applications, events, shortlist entries and saved rows all cascade
        # from the posting; the activity feed does not, so clear it by name.
        Activity.objects.filter(target__in=titles).delete()
        jobs.delete()
        self.stdout.write(self.style.SUCCESS(f"Removed {count} demo postings."))
