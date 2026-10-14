"""Seed the portal with demo data so every page has something real to render.

Idempotent: safe to run repeatedly. Use --fresh to clear the demo data first.
"""

import random

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    PIPELINE,
    Activity,
    Application,
    ApplicationEvent,
    ApplicationStatus,
    AutomaticEmail,
    CandidateBookmark,
    CandidateProfile,
    EmploymentType,
    ExperienceLevel,
    Job,
    JobStatus,
    Role,
    SavedJob,
    ShortlistEntry,
    User,
    ViewedJob,
    WorkSetup,
)

JOBS = [
    {
        "title": "Senior Product Designer",
        "role_category": "Design",
        "company": "Meridian Health Group",
        "location": "Pretoria",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.SENIOR,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "required_skills": ["Figma", "Design systems", "User research", "Prototyping"],
        "description": (
            "Lead design on our patient-facing products, from discovery through to "
            "handover. You will own the design system, run research sessions with "
            "clinicians and work alongside two engineers and a product manager."
        ),
    },
    {
        "title": "Design Systems Engineer",
        "role_category": "Engineering",
        "company": "Streamline Logistics",
        "location": "Johannesburg",
        "work_setup": WorkSetup.REMOTE,
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "required_skills": ["React", "TypeScript", "Design systems", "Accessibility"],
        "description": (
            "Build and maintain the component library every product team builds on. "
            "You will work closely with design, own the documentation site and set "
            "the accessibility bar for the whole front end."
        ),
    },
    {
        "title": "Backend Engineer (Python)",
        "role_category": "Engineering",
        "company": "Northbridge Financial",
        "location": "Cape Town",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "required_skills": ["Python", "Django", "PostgreSQL", "REST APIs"],
        "description": (
            "Join the payments platform team building the services that move money "
            "for thousands of merchants. Strong Django and relational database "
            "experience matters more than fintech background."
        ),
    },
    {
        "title": "UX Researcher",
        "role_category": "Design",
        "company": "Meridian Health Group",
        "location": "Pretoria",
        "work_setup": WorkSetup.OFFICE,
        "experience_level": ExperienceLevel.JUNIOR,
        "employment_type": EmploymentType.CONTRACT,
        "status": JobStatus.ACTIVE,
        "required_skills": ["User research", "Usability testing", "Interviewing"],
        "description": (
            "Run the research programme across three product lines. You will plan "
            "studies, recruit participants, moderate sessions and turn what you hear "
            "into findings teams actually act on."
        ),
    },
    {
        "title": "Data Analyst",
        "role_category": "Data",
        "company": "Streamline Logistics",
        "location": "Johannesburg",
        "work_setup": WorkSetup.REMOTE,
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.ACTIVE,
        "required_skills": ["SQL", "Python", "Dashboards", "Statistics"],
        "description": (
            "Turn fleet and delivery data into the numbers the operations team runs "
            "on. Expect a mix of recurring reporting and open-ended questions about "
            "why a route is slipping."
        ),
    },
    {
        "title": "Engineering Manager",
        "role_category": "Engineering",
        "company": "Northbridge Financial",
        "location": "Cape Town",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.MANAGER,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.PAUSED,
        "required_skills": ["Leadership", "Python", "Architecture", "Mentoring"],
        "description": (
            "Lead two squads building the lending platform. You will stay close to "
            "the code while taking on hiring, growth conversations and the technical "
            "direction of the group."
        ),
    },
    {
        "title": "Marketing Coordinator",
        "role_category": "Marketing",
        "company": "Oakline Retail",
        "location": "Durban",
        "work_setup": WorkSetup.OFFICE,
        "experience_level": ExperienceLevel.ENTRY,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.DRAFT,
        "required_skills": ["Copywriting", "Social media", "Campaign planning"],
        "description": (
            "Support the campaign calendar across email, social and in-store. A good "
            "first marketing role for someone organised who writes well."
        ),
    },
    {
        "title": "Head of Talent",
        "role_category": "People",
        "company": "Oakline Retail",
        "location": "Durban",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.EXECUTIVE,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.PRIVATE,
        "required_skills": ["Talent strategy", "Leadership", "Employer branding"],
        "description": (
            "Own hiring end to end as the group scales from 400 to 700 people. This "
            "search is confidential and is not listed publicly."
        ),
    },
    {
        "title": "QA Engineer",
        "role_category": "Engineering",
        "company": "Streamline Logistics",
        "location": "Johannesburg",
        "work_setup": WorkSetup.REMOTE,
        "experience_level": ExperienceLevel.JUNIOR,
        "employment_type": EmploymentType.FULL_TIME,
        "status": JobStatus.CLOSED,
        "required_skills": ["Test automation", "Playwright", "CI"],
        "description": (
            "Own the automated test suite across the web and mobile apps. This role "
            "has been filled."
        ),
    },
]

CANDIDATES = [
    {
        "first_name": "Alex",
        "last_name": "Turner",
        "email": "alex.turner@example.com",
        "headline": "Senior UX Designer",
        "location": "Melbourne, VIC",
        "role_category": "Design",
        "experience_level": ExperienceLevel.SENIOR,
        "preferred_work_setup": WorkSetup.HYBRID,
        "skills": ["Figma", "Design systems", "User research", "Prototyping"],
        "progress": {
            "personal_details": 100,
            "ee_information": 100,
            "career_details": 100,
            "education": 100,
            "experience": 100,
            "remuneration": 50,
            "skills_tools": 100,
            "privacy_sharing": 50,
        },
    },
    {
        "first_name": "Priya",
        "last_name": "Naidoo",
        "email": "priya.naidoo@example.com",
        "headline": "Front-end Engineer",
        "location": "Cape Town",
        "role_category": "Engineering",
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "preferred_work_setup": WorkSetup.REMOTE,
        "skills": ["React", "TypeScript", "Accessibility", "Design systems"],
        "progress": {
            "personal_details": 100,
            "ee_information": 50,
            "career_details": 100,
            "education": 100,
            "experience": 50,
            "remuneration": 50,
            "skills_tools": 100,
            "privacy_sharing": 50,
        },
    },
    {
        "first_name": "Thabo",
        "last_name": "Mokoena",
        "email": "thabo.mokoena@example.com",
        "headline": "Backend Engineer",
        "location": "Johannesburg",
        "role_category": "Engineering",
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "preferred_work_setup": WorkSetup.HYBRID,
        "skills": ["Python", "Django", "PostgreSQL", "REST APIs"],
        "progress": {
            "personal_details": 100,
            "ee_information": 100,
            "career_details": 100,
            "education": 50,
            "experience": 100,
            "remuneration": 100,
            "skills_tools": 100,
            "privacy_sharing": 100,
        },
    },
    {
        "first_name": "Sana",
        "last_name": "Abrahams",
        "email": "sana.abrahams@example.com",
        "headline": "Data Analyst",
        "location": "Cape Town",
        "role_category": "Data",
        "experience_level": ExperienceLevel.INTERMEDIATE,
        "preferred_work_setup": WorkSetup.REMOTE,
        "skills": ["SQL", "Python", "Dashboards", "Statistics"],
        "progress": {
            "personal_details": 100,
            "ee_information": 0,
            "career_details": 50,
            "education": 100,
            "experience": 50,
            "remuneration": 0,
            "skills_tools": 50,
            "privacy_sharing": 0,
        },
    },
    {
        "first_name": "Daniel",
        "last_name": "Visser",
        "email": "daniel.visser@example.com",
        "headline": "Junior UX Researcher",
        "location": "Pretoria",
        "role_category": "Design",
        "experience_level": ExperienceLevel.JUNIOR,
        "preferred_work_setup": WorkSetup.OFFICE,
        "skills": ["User research", "Usability testing", "Interviewing"],
        "progress": {
            "personal_details": 100,
            "ee_information": 0,
            "career_details": 50,
            "education": 50,
            "experience": 0,
            "remuneration": 0,
            "skills_tools": 50,
            "privacy_sharing": 0,
        },
    },
    {
        "first_name": "Lerato",
        "last_name": "Dlamini",
        "email": "lerato.dlamini@example.com",
        "headline": "Marketing Coordinator",
        "location": "Durban",
        "role_category": "Marketing",
        "experience_level": ExperienceLevel.ENTRY,
        "preferred_work_setup": WorkSetup.OFFICE,
        "skills": ["Copywriting", "Social media", "Campaign planning"],
        "progress": {
            "personal_details": 100,
            "ee_information": 100,
            "career_details": 100,
            "education": 100,
            "experience": 50,
            "remuneration": 50,
            "skills_tools": 50,
            "privacy_sharing": 100,
        },
    },
]

EMAILS = [
    {
        "event": "application_status_changed",
        "label": "Application status changed",
        "subject": "An update on your application to {job_title}",
        "body": (
            "Hi {candidate_name},\n\n"
            "Your application for {job_title} at {company} has moved to "
            "{status}.\n\nYou can see the detail in your portal at any time.\n\n"
            "The MOC Talent Team"
        ),
    },
    {
        "event": "new_job_published",
        "label": "New job published",
        "subject": "A new role that matches your profile: {job_title}",
        "body": (
            "Hi {candidate_name},\n\n"
            "{company} has just posted {job_title}, which looks like a good match "
            "for your profile.\n\nOpen the portal to read the full description and "
            "apply.\n\nThe MOC Talent Team"
        ),
    },
    {
        "event": "application_received",
        "label": "Application received",
        "subject": "We have your application for {job_title}",
        "body": (
            "Hi {candidate_name},\n\n"
            "Thanks for applying for {job_title} at {company}. The hiring team is "
            "reviewing applications and will be in touch.\n\n"
            "The MOC Talent Team"
        ),
    },
]


class Command(BaseCommand):
    help = "Seed the portal with demo jobs, candidates and applications."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fresh",
            action="store_true",
            help="Delete existing demo data before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(7)  # Stable demo data across runs.

        if options["fresh"]:
            ApplicationEvent.objects.all().delete()
            Activity.objects.all().delete()
            ShortlistEntry.objects.all().delete()
            CandidateBookmark.objects.all().delete()
            ViewedJob.objects.all().delete()
            SavedJob.objects.all().delete()
            Application.objects.all().delete()
            Job.objects.all().delete()
            CandidateProfile.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write("Cleared existing demo data.")

        manager = self._seed_manager()
        candidates = self._seed_candidates()
        jobs = self._seed_jobs(manager)
        self._seed_applications(candidates, jobs)
        self._seed_engagement(manager, candidates, jobs)
        self._seed_emails()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(jobs)} jobs, {len(candidates)} candidates, "
                f"{Application.objects.count()} applications."
            )
        )

    def _seed_manager(self) -> User:
        manager, created = User.objects.get_or_create(
            username="sarah.chen",
            defaults={
                "first_name": "Sarah",
                "last_name": "Chen",
                "email": "sarah.chen@moc-pty.com",
                "role": Role.HIRING_MANAGER,
                "phone": "+27 12 000 0000",
            },
        )
        if created:
            manager.set_password("portal-demo")
            manager.save()
        return manager

    def _seed_candidates(self) -> list[User]:
        users = []
        for spec in CANDIDATES:
            username = spec["email"].split("@")[0]
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "email": spec["email"],
                    "role": Role.JOB_SEEKER,
                    "phone": "+61 400 000 000",
                },
            )
            if created:
                user.set_password("portal-demo")
                user.save()

            CandidateProfile.objects.update_or_create(
                user=user,
                defaults={
                    "headline": spec["headline"],
                    "location": spec["location"],
                    "role_category": spec["role_category"],
                    "experience_level": spec["experience_level"],
                    "preferred_work_setup": spec["preferred_work_setup"],
                    "skills": spec["skills"],
                    "software_tools": [
                        {"name": "Jira", "proficiency": "intermediate"},
                        {"name": "Slack", "proficiency": "advanced"},
                    ],
                    "section_progress": spec["progress"],
                    "summary": (
                        f"{spec['headline']} based in {spec['location']}, working "
                        f"mainly in {spec['role_category'].lower()}."
                    ),
                },
            )
            users.append(user)
        return users

    def _seed_jobs(self, manager: User) -> list[Job]:
        now = timezone.now()
        jobs = []
        industries = {
            "Meridian Health Group": ("Healthcare", "Pretoria"),
            "Streamline Logistics": ("Logistics", "Johannesburg"),
            "Northbridge Financial": ("Financial services", "Cape Town"),
            "Oakline Retail": ("Retail", "Durban"),
        }

        for index, spec in enumerate(JOBS):
            posted = (
                None
                if spec["status"] == JobStatus.DRAFT
                else now - timezone.timedelta(days=3 + index * 5)
            )
            industry, company_location = industries.get(
                spec["company"], ("Professional services", spec.get("location", ""))
            )

            # Skills carry a requirement level for the detail view: the first
            # two are required, the next preferred, the rest optional.
            levelled_skills = [
                {
                    "name": name,
                    "level": "required" if i < 2 else "preferred" if i == 2 else "optional",
                }
                for i, name in enumerate(spec["required_skills"])
            ]

            job, _ = Job.objects.update_or_create(
                title=spec["title"],
                company=spec["company"],
                defaults={
                    **spec,
                    "required_skills": levelled_skills,
                    "software_tools": [
                        {"name": "Jira", "proficiency": "advanced"},
                        {"name": "Slack", "proficiency": "intermediate"},
                    ],
                    "advantageous_tools": ["Notion", "Looker"],
                    "company_industry": industry,
                    "company_location": company_location,
                    "about_company": (
                        f"{spec['company']} is a {industry.lower()} company based in "
                        f"{company_location}. The team works with Magnum Opus "
                        "Consultants, who act as the legal employer in South Africa "
                        "and handle onboarding, HR, payroll and compliance."
                    ),
                    "key_responsibilities": [
                        "Own your area of the product end to end.",
                        "Work closely with the rest of the team day to day.",
                        "Keep quality and accessibility high as the work ships.",
                        "Share what you learn so the team gets better with you.",
                        "Help shape how the team works, not only what it builds.",
                    ],
                    "working_hours_start": 8 if index % 2 == 0 else 10,
                    "working_hours_end": 17 if index % 2 == 0 else 19,
                    "posted_at": posted,
                    "closes_at": now + timezone.timedelta(days=30 - index * 2),
                    "created_by": manager,
                },
            )
            jobs.append(job)
        return jobs

    def _seed_applications(self, candidates: list[User], jobs: list[Job]) -> None:
        open_jobs = [j for j in jobs if j.status in {JobStatus.ACTIVE, JobStatus.PAUSED}]
        statuses = [
            ApplicationStatus.APPLIED,
            ApplicationStatus.IN_REVIEW,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.INTERVIEW,
            ApplicationStatus.REJECTED,
        ]
        now = timezone.now()

        for candidate in candidates:
            for job in random.sample(open_jobs, k=min(3, len(open_jobs))):
                applied_at = now - timezone.timedelta(days=random.randint(1, 20))
                application, created = Application.objects.get_or_create(
                    job=job,
                    candidate=candidate,
                    defaults={
                        "status": random.choice(statuses),
                        "applied_at": applied_at,
                    },
                )
                if created:
                    self._seed_history(application, applied_at)

    def _seed_history(self, application: Application, applied_at) -> None:
        """Walk the application up the pipeline to the status it holds.

        Without this the timeline would start at the current status, and a
        candidate at interview stage would look like they skipped the ones
        before it.
        """
        if application.status in {ApplicationStatus.REJECTED, ApplicationStatus.JOB_CLOSED}:
            # Rejected somewhere in the middle: walk part of the way, then exit.
            reached = random.randint(1, 3)
            path = list(PIPELINE[:reached]) + [application.status]
        else:
            end = PIPELINE.index(application.status) + 1
            path = list(PIPELINE[:end])

        previous = ""
        stamp = applied_at
        for status in path:
            ApplicationEvent.objects.create(
                application=application,
                from_status=previous,
                to_status=status,
                created_at=stamp,
                note=(
                    "Application received."
                    if status == ApplicationStatus.APPLIED
                    else ""
                ),
            )
            previous = status
            stamp = stamp + timezone.timedelta(days=random.randint(1, 4))

    def _seed_engagement(
        self, manager: User, candidates: list[User], jobs: list[Job]
    ) -> None:
        open_jobs = [j for j in jobs if j.status == JobStatus.ACTIVE]
        primary = candidates[0]

        # Saved jobs, staggered so the list shows every state the design has:
        # saved today through a week ago, some already applied for, and one
        # closing soon.
        now = timezone.now()
        ages = [0, 1, 2, 3, 7]
        for index, job in enumerate(open_jobs[: len(ages)]):
            saved, created = SavedJob.objects.get_or_create(
                job=job, candidate=primary
            )
            if created:
                saved.saved_at = now - timezone.timedelta(days=ages[index])
                saved.save(update_fields=["saved_at"])
            ViewedJob.objects.get_or_create(job=job, candidate=primary)

        # The oldest saved posting closes inside the week, so the list has a
        # "Closing soon!" row to render.
        if len(open_jobs) >= len(ages):
            closing = open_jobs[len(ages) - 1]
            closing.closes_at = now + timezone.timedelta(days=4)
            closing.save(update_fields=["closes_at"])

        for candidate in candidates[:3]:
            CandidateBookmark.objects.get_or_create(manager=manager, candidate=candidate)

        for job in open_jobs[:2]:
            for candidate in candidates[:2]:
                ShortlistEntry.objects.get_or_create(
                    job=job,
                    candidate=candidate,
                    defaults={"note": "Strong portfolio, worth an interview."},
                )

        now = timezone.now()
        feed = [
            ("published", open_jobs[0].title if open_jobs else "a job"),
            ("shortlisted", f"{candidates[0].display_name}"),
            ("created a draft for", "Marketing Coordinator"),
            ("bookmarked", f"{candidates[1].display_name}"),
            ("closed", "QA Engineer"),
        ]
        for index, (verb, target) in enumerate(feed):
            Activity.objects.get_or_create(
                actor=manager,
                verb=verb,
                target=target,
                defaults={"created_at": now - timezone.timedelta(hours=index * 7 + 1)},
            )

    def _seed_emails(self) -> None:
        for spec in EMAILS:
            AutomaticEmail.objects.update_or_create(
                event=spec["event"],
                defaults={
                    "label": spec["label"],
                    "subject": spec["subject"],
                    "body": spec["body"],
                },
            )
