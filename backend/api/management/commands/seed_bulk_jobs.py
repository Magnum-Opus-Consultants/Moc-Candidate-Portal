"""Generate a large, varied set of job postings to test search at scale.

Separate from `seed`, which builds the small hand-written demo set the UI
screenshots use. This one exists to answer "does search still work with ten
thousand rows", so it favours variety over prose quality.

    manage.py seed_bulk_jobs --count 10000
    manage.py seed_bulk_jobs --clear        # remove them again
"""

import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    EmploymentType,
    ExperienceLevel,
    Job,
    JobStatus,
    Role,
    User,
    WorkSetup,
)

# Marks the generated rows so --clear can find them without touching the
# hand-written demo postings.
BULK_MARKER = "[bulk]"

DISCIPLINES = {
    "Engineering": [
        "Backend Engineer", "Front-end Engineer", "Full-stack Engineer",
        "Platform Engineer", "Mobile Engineer", "QA Engineer",
        "Site Reliability Engineer", "Data Engineer", "Security Engineer",
        "Engineering Manager", "Solutions Architect", "DevOps Engineer",
    ],
    "Design": [
        "Product Designer", "UX Designer", "UI Designer", "UX Researcher",
        "Design Systems Designer", "Brand Designer", "Motion Designer",
        "Service Designer", "Design Lead",
    ],
    "Data": [
        "Data Analyst", "Business Intelligence Analyst", "Data Scientist",
        "Analytics Engineer", "Machine Learning Engineer", "Data Architect",
    ],
    "Marketing": [
        "Marketing Coordinator", "Content Strategist", "SEO Specialist",
        "Performance Marketer", "Campaign Manager", "Copywriter",
        "Social Media Manager",
    ],
    "People": [
        "Talent Partner", "Technical Recruiter", "People Operations Lead",
        "Learning and Development Lead", "HR Business Partner",
    ],
    "Finance": [
        "Financial Analyst", "Management Accountant", "Bookkeeper",
        "Payroll Specialist", "Credit Controller",
    ],
    "Support": [
        "Customer Support Specialist", "Technical Support Engineer",
        "Customer Success Manager", "Support Team Lead",
    ],
}

SENIORITY = ["", "Junior ", "Senior ", "Lead ", "Principal ", "Staff "]

COMPANIES = [
    ("Meridian Health Group", "Healthcare", "Pretoria"),
    ("Streamline Logistics", "Logistics", "Johannesburg"),
    ("Northbridge Financial", "Financial services", "Cape Town"),
    ("Oakline Retail", "Retail", "Durban"),
    ("Kestrel Software", "Software", "Cape Town"),
    ("Protea Analytics", "Data and analytics", "Johannesburg"),
    ("Silverbrook Insurance", "Insurance", "Sandton"),
    ("Harbour Point Media", "Media", "Cape Town"),
    ("Aloe Energy", "Renewable energy", "Gqeberha"),
    ("Tabletop Education", "Education technology", "Stellenbosch"),
    ("Cobalt Freight", "Freight", "Durban"),
    ("Lantern Travel", "Travel", "Cape Town"),
]

SKILLS = {
    "Engineering": ["Python", "Django", "React", "TypeScript", "Go", "Kubernetes",
                    "PostgreSQL", "AWS", "Terraform", "GraphQL", "Testing", "CI/CD"],
    "Design": ["Figma", "Design systems", "User research", "Prototyping",
               "Accessibility", "Illustration", "Wireframing", "Usability testing"],
    "Data": ["SQL", "Python", "dbt", "Looker", "Power BI", "Statistics",
             "Airflow", "Snowflake", "Pandas"],
    "Marketing": ["Copywriting", "SEO", "Google Ads", "HubSpot", "Analytics",
                  "Campaign planning", "Social media"],
    "People": ["Sourcing", "Interviewing", "Employer branding", "Onboarding",
               "Employment equity", "Coaching"],
    "Finance": ["Excel", "Xero", "SAP", "Reconciliations", "Forecasting", "IFRS"],
    "Support": ["Zendesk", "Troubleshooting", "SLAs", "Documentation", "Escalations"],
}

TOOLS = ["Jira", "Slack", "Notion", "Confluence", "Linear", "Figma", "GitHub",
         "Looker", "Zendesk", "Miro"]


class Command(BaseCommand):
    help = "Generate a large set of job postings for search and scale testing."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=10000)
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete the generated postings and stop.",
        )
        parser.add_argument("--seed", type=int, default=11)

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            removed, _ = Job.objects.filter(description__contains=BULK_MARKER).delete()
            self.stdout.write(self.style.SUCCESS(f"Removed {removed} generated rows."))
            return

        rng = random.Random(options["seed"])
        count = options["count"]

        author = User.objects.filter(role=Role.HIRING_MANAGER).order_by("id").first()
        if author is None:
            self.stderr.write("No hiring manager found — run `manage.py seed` first.")
            return

        now = timezone.now()
        categories = list(DISCIPLINES)
        experience = [c[0] for c in ExperienceLevel.choices]
        setups = [c[0] for c in WorkSetup.choices]
        employment = [c[0] for c in EmploymentType.choices]
        # Mostly live postings, with a realistic tail of drafts and closures
        # so the status filters have something to exclude.
        statuses = (
            [JobStatus.ACTIVE] * 80
            + [JobStatus.PAUSED] * 6
            + [JobStatus.DRAFT] * 6
            + [JobStatus.CLOSED] * 6
            + [JobStatus.PRIVATE] * 2
        )

        rows = []
        for i in range(count):
            category = rng.choice(categories)
            title = f"{rng.choice(SENIORITY)}{rng.choice(DISCIPLINES[category])}"
            company, industry, city = rng.choice(COMPANIES)
            status = rng.choice(statuses)
            age = rng.randint(0, 180)
            posted = None if status == JobStatus.DRAFT else now - timezone.timedelta(days=age)

            pool = SKILLS[category]
            chosen = rng.sample(pool, k=min(len(pool), rng.randint(3, 5)))
            start = rng.choice([7, 8, 9, 10])

            rows.append(
                Job(
                    title=title,
                    role_category=category,
                    company=company,
                    location=city,
                    company_industry=industry,
                    company_location=city,
                    description=(
                        f"{BULK_MARKER} {title} at {company}, a {industry.lower()} "
                        f"company in {city}. You will work with "
                        f"{', '.join(chosen[:3])} alongside a small, senior team. "
                        "Magnum Opus Consultants is the legal employer in South "
                        "Africa and handles onboarding, HR, payroll and compliance."
                    ),
                    about_company=(
                        f"{company} is a {industry.lower()} company based in {city}."
                    ),
                    key_responsibilities=[
                        "Own your area of the product end to end.",
                        "Work closely with the rest of the team day to day.",
                        "Keep quality and accessibility high as the work ships.",
                    ],
                    work_setup=rng.choice(setups),
                    salary_label="Market-related",
                    experience_level=rng.choice(experience),
                    employment_type=rng.choice(employment),
                    timezone_label="UTC+2",
                    status=status,
                    required_skills=[
                        {"name": n, "level": "required" if k < 2 else "preferred"}
                        for k, n in enumerate(chosen)
                    ],
                    software_tools=[
                        {"name": t, "proficiency": rng.choice(["basic", "intermediate", "advanced"])}
                        for t in rng.sample(TOOLS, k=2)
                    ],
                    advantageous_tools=rng.sample(TOOLS, k=2),
                    working_hours_start=start,
                    working_hours_end=start + rng.choice([8, 9]),
                    posted_at=posted,
                    closes_at=now + timezone.timedelta(days=rng.randint(3, 60)),
                    created_by=author,
                )
            )

        Job.objects.bulk_create(rows, batch_size=1000)

        live = Job.objects.filter(
            status__in=[JobStatus.ACTIVE, JobStatus.PAUSED]
        ).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {count} postings. {Job.objects.count()} jobs in total, "
                f"{live} publicly listed."
            )
        )
