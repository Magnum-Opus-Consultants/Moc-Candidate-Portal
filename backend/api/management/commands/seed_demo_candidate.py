"""One fully-filled job seeker, for showing the branded candidate profile.

The CV is the document MOC sends to a client, so demonstrating it on a
half-filled profile demonstrates nothing: the point of the layout is how it
handles a real history, a real set of competencies and a real assessment.
This builds exactly that, and nothing on the rest of the portal depends on
it, so it can be re-run or deleted freely.

    python manage.py seed_demo_candidate --photo path/to/portrait.jpg
"""

from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import (
    Availability,
    CandidateProfile,
    Education,
    EducationLevel,
    EmploymentStatus,
    EmploymentType,
    ExperienceLevel,
    Role,
    User,
    WorkExperience,
    WorkSetup,
)

EMAIL = "nadia.petersen@example.com"

SUMMARY = (
    "Credit control and debtors management across manufacturing and retail "
    "portfolios: age analysis, credit vetting, reconciliations and collections "
    "on books of up to R180 million."
)

SKILLS = [
    "Debtors age analysis and reporting",
    "Credit vetting and limit reviews",
    "Account reconciliation and cash allocation",
    "Collections and dispute resolution",
    "Legal handover and credit insurance claims",
    "SAP, Syspro and advanced Excel",
    "Month-end close and debtors packs",
]

LANGUAGES = [
    {"language": "English", "proficiency": "native"},
    {"language": "Afrikaans", "proficiency": "native"},
    {"language": "isiXhosa", "proficiency": "conversational"},
]

EDUCATION = [
    {
        "level": EducationLevel.BACHELOR,
        "field_of_study": "BCom Accounting",
        "institution_name": "University of the Western Cape",
        "graduation_year": 2016,
    },
    {
        "level": EducationLevel.CERTIFICATE,
        "field_of_study": "Credit Management",
        "institution_name": "Institute of Credit Management SA",
        "graduation_year": 2018,
    },
]

EXPERIENCE = [
    {
        "job_title": "Group Credit Controller",
        "company_name": "Hartley & Vaughn Manufacturing",
        "start_date": date(2022, 3, 1),
        "end_date": None,
        "is_current": True,
        "key_responsibilities": [
            "Manages a debtors book of R180 million across 240 trade accounts.",
            "Runs the weekly age analysis and reports overdue exposure to the "
            "financial manager.",
            "Vets credit applications and recommends limits against trade "
            "references and bureau reports.",
            "Reconciles customer accounts and settles pricing and delivery "
            "disputes with the sales team.",
            "Negotiates payment arrangements and escalates to legal handover "
            "where terms lapse.",
            "Prepares credit insurance claims and maintains the cover schedule.",
            "Brought debtor days down from 68 to 41 over eighteen months.",
        ],
    },
    {
        "job_title": "Credit Controller",
        "company_name": "Beaumont Retail Group",
        "start_date": date(2019, 1, 1),
        "end_date": date(2022, 2, 28),
        "is_current": False,
        "key_responsibilities": [
            "Collected on a 900-account retail book across three regions.",
            "Allocated daily receipts and cleared unallocated cash weekly.",
            "Released and held orders against credit limits and payment history.",
            "Prepared the month-end debtors pack for the financial accountant.",
            "Trained two junior controllers on the collections process.",
        ],
    },
    {
        "job_title": "Debtors Clerk",
        "company_name": "Beaumont Retail Group",
        "start_date": date(2017, 7, 1),
        "end_date": date(2018, 12, 31),
        "is_current": False,
        "key_responsibilities": [
            "Captured invoices, credit notes and customer remittances.",
            "Followed up overdue accounts by telephone and email.",
            "Maintained customer master data and contact records.",
        ],
    },
]

ASSESSMENT = {
    "matching": {"english": 9, "requirement": 8, "experience": 9, "client": 8},
    "traits": {
        "extraverted": {
            "percent": 62,
            "note": "Comfortable on the phone and in front of customers, and "
            "raises a problem account early rather than sitting on it.",
        },
        "thinking": {
            "percent": 71,
            "note": "Works from the numbers and the agreed terms, holding a firm "
            "line on exposure without damaging the relationship.",
        },
        "judging": {
            "percent": 84,
            "note": "Methodical and deadline-driven, which suits a collections "
            "calendar and a month-end close.",
        },
        "assertive": {
            "percent": 77,
            "note": "Steady under pressure and not easily deflected by a "
            "difficult conversation about money.",
        },
    },
}

# Every section complete: the branded profile is gated at 80%.
SECTIONS = {
    "personal_details": 100,
    "ee_information": 100,
    "career_details": 100,
    "education": 100,
    "experience": 100,
    "remuneration": 100,
    "skills_tools": 100,
    "privacy_sharing": 100,
}


class Command(BaseCommand):
    help = "Create or refresh the fully-filled demo candidate."

    def add_arguments(self, parser):
        parser.add_argument(
            "--photo",
            help="Portrait to attach. Left out, any existing photo is kept.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Demo data is for local development only.")

        user, _ = User.objects.get_or_create(
            email=EMAIL,
            defaults={"username": "nadia.petersen", "role": Role.JOB_SEEKER},
        )
        user.first_name = "Nadia"
        user.last_name = "Petersen"
        user.role = Role.JOB_SEEKER
        user.save()

        profile, _ = CandidateProfile.objects.get_or_create(user=user)
        profile.headline = "Senior Credit Controller"
        profile.location = "Cape Town"
        profile.country_of_residence = "South Africa"
        profile.summary = SUMMARY
        profile.skills = [{"name": name, "proficiency": ""} for name in SKILLS]
        profile.languages = LANGUAGES
        profile.role_category = "Finance"
        profile.experience_level = ExperienceLevel.SENIOR
        profile.preferred_work_setup = WorkSetup.HYBRID
        profile.employment_status = EmploymentStatus.EMPLOYED
        profile.availability = Availability.ONE_MONTH
        profile.timezone_availability = "UTC+2"
        profile.highest_education_level = EducationLevel.BACHELOR
        profile.field_of_study = "BCom Accounting"
        profile.institution_name = "University of the Western Cape"
        profile.graduation_year = 2016
        profile.assessment = ASSESSMENT
        profile.section_progress = SECTIONS
        profile.sharing_agreed = True
        profile.save()

        if options.get("photo"):
            path = Path(options["photo"])
            if not path.exists():
                raise CommandError(f"No such portrait: {path}")
            with path.open("rb") as handle:
                profile.photo.save(f"{user.username}.jpg", File(handle), save=True)

        # Rebuilt rather than updated: re-running should leave one clean set,
        # not a second copy of every role.
        profile.education.all().delete()
        for position, row in enumerate(EDUCATION):
            Education.objects.create(profile=profile, position=position, **row)

        profile.experience.all().delete()
        for position, row in enumerate(EXPERIENCE):
            WorkExperience.objects.create(
                profile=profile,
                position=position,
                employment_type=EmploymentType.FULL_TIME,
                **row,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{user.display_name} — {profile.completion}% complete, "
                f"{profile.experience.count()} roles, "
                f"{profile.education.count()} qualifications"
                + (", photo attached" if profile.photo else "")
            )
        )
