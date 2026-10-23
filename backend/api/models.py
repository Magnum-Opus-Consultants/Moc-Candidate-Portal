"""Domain model for the MOC Candidate Portal."""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    JOB_SEEKER = "job_seeker", "Job Seeker"
    HIRING_MANAGER = "hiring_manager", "Hiring Manager"


class User(AbstractUser):
    """Both portal roles share one account table and one sign-in page."""

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.JOB_SEEKER)
    phone = models.CharField(max_length=40, blank=True)
    # Whether the address has been proved. A social sign-up arrives already
    # verified — Google and LinkedIn only release addresses they have
    # checked — so only password sign-ups start false.
    email_verified = models.BooleanField(default=False)
    # Set the first time a profile crosses 80%, so the Client's "CV
    # unlocked" email goes out once rather than on every later save.
    cv_unlocked_at = models.DateTimeField(null=True, blank=True)
    theme = models.CharField(
        max_length=10,
        choices=[("system", "System"), ("light", "Light"), ("dark", "Dark")],
        default="system",
    )

    @property
    def display_name(self) -> str:
        full = f"{self.first_name} {self.last_name}".strip()
        return full or self.username

    @property
    def initials(self) -> str:
        parts = [p for p in (self.first_name, self.last_name) if p]
        if not parts:
            return self.username[:2].upper()
        return "".join(p[0] for p in parts).upper()


class WorkSetup(models.TextChoices):
    HYBRID = "hybrid", "Hybrid"
    REMOTE = "remote", "Remote"
    OFFICE = "office", "Office"


class ExperienceLevel(models.TextChoices):
    ENTRY = "entry", "Entry-level"
    JUNIOR = "junior", "Junior"
    INTERMEDIATE = "intermediate", "Intermediate"
    SENIOR = "senior", "Senior"
    SPECIALIST = "specialist", "Specialist"
    TEAM_LEAD = "team_lead", "Team Lead"
    MANAGER = "manager", "Manager"
    EXECUTIVE = "executive", "Executive"


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", "Full-time"
    PART_TIME = "part_time", "Part-time"
    CONTRACT = "contract", "Contract"
    TEMPORARY = "temporary", "Temporary"
    INTERNSHIP = "internship", "Internship"
    FREELANCE = "freelance", "Freelance"
    PROJECT = "project", "Project-based"


class CitizenshipRequirement(models.TextChoices):
    NONE = "none", "No specific requirement"
    CITIZEN = "citizen", "Must be a South African citizen"
    PERMANENT_RESIDENT = "permanent_resident", "Must be a permanent resident in South Africa"
    WORK_PERMIT = "work_permit", "Must have a valid work permit"
    OTHER = "other", "Other"


class IndustryExperience(models.TextChoices):
    NONE = "none", "Not required"
    PREFERRED = "preferred", "Preferred"
    REQUIRED = "required", "Required"


class JobStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    DRAFT = "draft", "Draft"
    CLOSED = "closed", "Closed"
    PRIVATE = "private", "Private"



class Proficiency(models.TextChoices):
    BASIC = "basic", "Basic"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"
    EXPERT = "expert", "Expert"


class EmploymentStatus(models.TextChoices):
    EMPLOYED = "employed", "Employed"
    SELF_EMPLOYED = "self_employed", "Self-employed"
    UNEMPLOYED = "unemployed", "Unemployed"
    STUDENT = "student", "Student"
    NOTICE = "notice", "Serving notice"


class Availability(models.TextChoices):
    IMMEDIATE = "immediate", "Immediately"
    ONE_WEEK = "one_week", "1 week"
    TWO_WEEKS = "two_weeks", "2 weeks"
    ONE_MONTH = "one_month", "1 month"
    TWO_MONTHS = "two_months", "2 months"
    THREE_MONTHS = "three_months", "3 months or more"


class NightShift(models.TextChoices):
    YES = "yes", "Yes"
    NO = "no", "No"
    MAYBE = "maybe", "Maybe"
    DEPENDS = "depends", "Depending on role"


class EducationLevel(models.TextChoices):
    MATRIC = "matric", "Matric / National Senior Certificate"
    CERTIFICATE = "certificate", "Certificate"
    DIPLOMA = "diploma", "Diploma"
    BACHELOR = "bachelor", "Bachelor's degree"
    HONOURS = "honours", "Honours degree"
    MASTER = "master", "Master's degree"
    DOCTORATE = "doctorate", "Doctorate"


class SalaryPeriod(models.TextChoices):
    MONTHLY = "monthly", "Monthly"
    ANNUAL = "annual", "Annual"
    HOURLY = "hourly", "Hourly"


class ProfileStatus(models.TextChoices):
    OPEN = "open", "Open to opportunities"
    CLOSED = "closed", "Not currently open to opportunities"


# The eight profile sections shown as progress rows in the approved designs.
PROFILE_SECTIONS = [
    ("personal_details", "Personal Details"),
    ("ee_information", "Optional EE Information"),
    ("career_details", "Career Details"),
    ("education", "Education"),
    ("experience", "Experience"),
    ("remuneration", "Remuneration & Benefits"),
    ("skills_tools", "Skills & Tools"),
    ("privacy_sharing", "Privacy & Profile Sharing"),
]


class CandidateProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    headline = models.CharField(max_length=160, blank=True)
    location = models.CharField(max_length=120, blank=True)
    summary = models.TextField(blank=True)
    skills = models.JSONField(default=list, blank=True)
    role_category = models.CharField(max_length=120, blank=True)
    experience_level = models.CharField(
        max_length=20, choices=ExperienceLevel.choices, blank=True
    )
    preferred_work_setup = models.CharField(
        max_length=20, choices=WorkSetup.choices, blank=True
    )
    cv = models.FileField(upload_to="cvs/", blank=True, null=True)

    # --- Personal details --------------------------------------------------
    photo = models.ImageField(upload_to="photos/", blank=True, null=True)
    preferred_name = models.CharField(max_length=80, blank=True)
    country_of_residence = models.CharField(max_length=80, blank=True)
    profile_status = models.CharField(
        max_length=10, choices=ProfileStatus.choices, blank=True
    )
    # [{"language": "English", "proficiency": "native"}, ...]
    languages = models.JSONField(default=list, blank=True)
    linkedin_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)

    # --- Optional EE information -------------------------------------------
    # Optional by design and by law; blank is a valid answer throughout.
    gender = models.CharField(max_length=40, blank=True)
    nationality = models.CharField(max_length=80, blank=True)
    citizenship = models.CharField(max_length=80, blank=True)
    ethnicity = models.CharField(max_length=40, blank=True)
    has_disability = models.BooleanField(null=True, blank=True)
    disability_detail = models.TextField(blank=True)

    # --- Career details ----------------------------------------------------
    secondary_role_category = models.CharField(max_length=120, blank=True)
    employment_status = models.CharField(
        max_length=20, choices=EmploymentStatus.choices, blank=True
    )
    availability = models.CharField(
        max_length=20, choices=Availability.choices, blank=True
    )
    timezone_availability = models.CharField(max_length=40, blank=True)
    night_shift = models.CharField(
        max_length=10, choices=NightShift.choices, blank=True
    )

    # --- Education ---------------------------------------------------------
    highest_education_level = models.CharField(
        max_length=20, choices=EducationLevel.choices, blank=True
    )
    field_of_study = models.CharField(max_length=120, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)
    institution_name = models.CharField(max_length=160, blank=True)

    # --- Remuneration & benefits -------------------------------------------
    current_salary_currency = models.CharField(max_length=8, default="ZAR", blank=True)
    current_salary_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    current_salary_period = models.CharField(
        max_length=10, choices=SalaryPeriod.choices, blank=True
    )
    expected_salary_currency = models.CharField(max_length=8, default="ZAR", blank=True)
    expected_salary_amount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    expected_salary_period = models.CharField(
        max_length=10, choices=SalaryPeriod.choices, blank=True
    )
    benefits = models.JSONField(default=list, blank=True)

    # --- Skills & tools ----------------------------------------------------
    # skills:        [{"name": "Figma", "proficiency": "advanced", "importance": "high"}]
    # software_tools:[{"name": "Jira", "proficiency": "basic"}]
    software_tools = models.JSONField(default=list, blank=True)

    # --- Privacy & profile sharing -----------------------------------------
    do_not_share_with = models.TextField(blank=True)
    sharing_agreed = models.BooleanField(default=False)

    # Percentage complete per section, keyed by the slugs in PROFILE_SECTIONS.
    section_progress = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Profile for {self.user.display_name}"

    @property
    def completion(self) -> int:
        """Overall completion — the figure the 80% CV download gates on."""
        values = [int(self.section_progress.get(slug, 0)) for slug, _ in PROFILE_SECTIONS]
        return round(sum(values) / len(PROFILE_SECTIONS)) if values else 0

    @property
    def strength(self) -> str:
        """The five-step profile status ladder from the designs."""
        pct = self.completion
        if pct >= 90:
            return "looking_great"
        if pct >= 70:
            return "going_strong"
        if pct >= 50:
            return "gaining_momentum"
        if pct >= 25:
            return "making_progress"
        return "getting_started"

    @property
    def can_download_branded_cv(self) -> bool:
        return self.completion >= 80

    @property
    def skill_names(self) -> list[str]:
        """Skill names, whichever shape the list is in.

        The profile form stores {"name", "proficiency", "importance"} objects,
        while older rows and the seed hold plain strings. Matching only ever
        needs the name, so it reads it through here rather than each caller
        guessing the shape.
        """
        names = []
        for entry in self.skills or []:
            if isinstance(entry, dict):
                name = entry.get("name", "")
            else:
                name = entry
            if str(name).strip():
                names.append(str(name))
        return names


class WorkExperience(models.Model):
    """One role on a job seeker's history.

    A separate table rather than JSON on the profile: the designs let a
    candidate add, edit and delete entries individually, and the AI rewriting
    advice works per role on the key responsibilities.
    """

    profile = models.ForeignKey(
        CandidateProfile, on_delete=models.CASCADE, related_name="experience"
    )
    job_title = models.CharField(max_length=160)
    company_name = models.CharField(max_length=160, blank=True)
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, blank=True
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    reason_for_leaving = models.CharField(max_length=200, blank=True)
    # Ordered bullet points, as the designs show them with a drag handle.
    key_responsibilities = models.JSONField(default=list, blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "-start_date"]

    def __str__(self) -> str:
        return f"{self.job_title} at {self.company_name}".strip()


class Education(models.Model):
    """One qualification on a job seeker's record.

    A table of its own for the same reason as WorkExperience: people hold
    more than one qualification, and the four flat fields that used to sit on
    the profile could only ever record the last one typed.

    The flat fields are kept on CandidateProfile as the *highest* qualification
    — the matching engine and the branded CV read them — and are derived from
    these rows rather than typed twice.
    """

    profile = models.ForeignKey(
        CandidateProfile, on_delete=models.CASCADE, related_name="education"
    )
    level = models.CharField(max_length=30, choices=EducationLevel.choices)
    field_of_study = models.CharField(max_length=120, blank=True)
    institution_name = models.CharField(max_length=160, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "-graduation_year"]

    def __str__(self) -> str:
        return f"{self.get_level_display()} - {self.field_of_study}".strip()


class JobQuerySet(models.QuerySet):
    def with_counts(self):
        """Annotate the applicant totals the cards and rows display.

        Two aggregates over one join rather than two queries per row. Fine
        for a handful of postings; for a page out of thousands prefer
        `attach_counts`, which counts only the rows on screen.
        """
        return self.annotate(
            _applicant_count=models.Count("applications", distinct=True),
            _new_applicant_count=models.Count(
                "applications",
                filter=models.Q(applications__status=ApplicationStatus.APPLIED),
                distinct=True,
            ),
        )


def attach_counts(jobs):
    """Put the applicant totals on an already-fetched page of postings.

    Annotating before slicing makes the database join and group every row in
    the table to return twenty-four, which on ten thousand postings is most
    of the request. Slicing first and counting only those ids is one small
    extra query and keeps the page query on its index.
    """
    jobs = list(jobs)
    if not jobs:
        return jobs

    totals = {
        row["job_id"]: (row["total"], row["fresh"])
        for row in Application.objects.filter(job__in=jobs)
        .values("job_id")
        .annotate(
            total=models.Count("id"),
            fresh=models.Count(
                "id", filter=models.Q(status=ApplicationStatus.APPLIED)
            ),
        )
    }
    for job in jobs:
        total, fresh = totals.get(job.id, (0, 0))
        job._applicant_count = total
        job._new_applicant_count = fresh
    return jobs


class Job(models.Model):
    title = models.CharField(max_length=160)
    role_category = models.CharField(max_length=120)
    company = models.CharField(max_length=160)
    location = models.CharField(max_length=120, blank=True)
    description = models.TextField()
    work_setup = models.CharField(
        max_length=20, choices=WorkSetup.choices, default=WorkSetup.HYBRID
    )
    salary_label = models.CharField(max_length=80, default="Market-related")
    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
        default=ExperienceLevel.INTERMEDIATE,
    )
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    timezone_label = models.CharField(max_length=20, default="UTC+2")
    status = models.CharField(
        max_length=20, choices=JobStatus.choices, default=JobStatus.DRAFT
    )
    # [{"name": "Figma", "level": "required"}] — level is required /
    # preferred / optional, as the job detail view groups them. Older rows
    # hold plain strings; read names through required_skill_names.
    required_skills = models.JSONField(default=list, blank=True)
    # [{"name": "Jira", "proficiency": "advanced"}]
    software_tools = models.JSONField(default=list, blank=True)

    # --- The detail view -----------------------------------------------
    company_industry = models.CharField(max_length=120, blank=True)
    company_location = models.CharField(max_length=120, blank=True)
    about_company = models.TextField(blank=True)
    key_responsibilities = models.JSONField(default=list, blank=True)
    advantageous_tools = models.JSONField(default=list, blank=True)

    # Working hours, as whole hours on a 24-hour clock in the job's own time
    # zone (timezone_label). The detail view draws them on a day-long scale.
    working_hours_start = models.PositiveSmallIntegerField(null=True, blank=True)
    working_hours_end = models.PositiveSmallIntegerField(null=True, blank=True)

    # --- From the job posting form in the designs -----------------------
    # Job overview
    ideal_start_date = models.DateField(null=True, blank=True)

    # Employer details — who a candidate's questions go to.
    hr_email = models.EmailField(blank=True)
    hr_phone = models.CharField(max_length=40, blank=True)

    # Work setup
    candidate_location = models.CharField(
        max_length=120,
        blank=True,
        help_text="Where the candidate must be based, if it is constrained.",
    )
    night_shift = models.CharField(
        max_length=20, choices=NightShift.choices, blank=True
    )
    flexible_hours = models.BooleanField(default=False)

    # Candidate requirements
    citizenship_requirement = models.CharField(
        max_length=30, choices=CitizenshipRequirement.choices, blank=True
    )
    # [{"language": "English", "proficiency": "fluent"}]
    language_requirements = models.JSONField(default=list, blank=True)

    # Experience requirements
    minimum_years_experience = models.PositiveSmallIntegerField(
        null=True, blank=True
    )
    industry_experience = models.CharField(
        max_length=20, choices=IndustryExperience.choices, blank=True
    )

    # Education requirements
    education_requirement = models.CharField(
        max_length=30, choices=EducationLevel.choices, blank=True
    )
    field_of_study = models.CharField(max_length=120, blank=True)

    # Remuneration — a range, so salary_label can stay the display string.
    salary_currency = models.CharField(max_length=8, default="ZAR", blank=True)
    salary_min = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_max = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_period = models.CharField(
        max_length=20, choices=SalaryPeriod.choices, blank=True
    )
    benefits = models.JSONField(default=list, blank=True)

    posted_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="jobs_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = JobQuerySet.as_manager()

    class Meta:
        ordering = ["-posted_at", "-created_at"]
        indexes = [
            # The public list and the manager list both filter on status and
            # order by posted date; without these SQLite scans all 10 000.
            models.Index(fields=["status"], name="job_status_idx"),
            models.Index(
                fields=["-posted_at", "-created_at"], name="job_posted_idx"
            ),
            # The manager list's default sort. Without it SQLite scans all
            # 10 000 rows and sorts them in a temp B-tree to return 24.
            models.Index(fields=["-created_at"], name="job_created_idx"),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def is_publicly_listed(self) -> bool:
        """Draft, private and closed jobs never reach the public job list."""
        return self.status in {JobStatus.ACTIVE, JobStatus.PAUSED}

    @property
    def required_skill_names(self) -> list[str]:
        """Skill names, whichever shape the list is in.

        Mirrors CandidateProfile.skill_names: the job form stores
        {"name", "level"} objects, older rows and the seed hold strings, and
        matching only ever needs the name.
        """
        names = []
        for entry in self.required_skills or []:
            name = entry.get("name", "") if isinstance(entry, dict) else entry
            if str(name).strip():
                names.append(str(name))
        return names

    @property
    def working_hours_label(self) -> str:
        """e.g. "08:00 - 17:00", or empty when the hours are not set."""
        if self.working_hours_start is None or self.working_hours_end is None:
            return ""
        return f"{self.working_hours_start:02d}:00 - {self.working_hours_end:02d}:00"

    @property
    def working_hours_count(self) -> int | None:
        """Length of the working day, wrapping over midnight for night shifts."""
        if self.working_hours_start is None or self.working_hours_end is None:
            return None
        span = self.working_hours_end - self.working_hours_start
        return span if span > 0 else span + 24

    # A posting counts as closing soon inside this window, which is what
    # drives the "Closing soon!" flag on the saved jobs list.
    CLOSING_SOON_DAYS = 7

    @property
    def days_until_close(self) -> int | None:
        if not self.closes_at:
            return None
        return (self.closes_at - timezone.now()).days

    @property
    def closes_soon(self) -> bool:
        days = self.days_until_close
        if days is None or not self.is_publicly_listed:
            return False
        return 0 <= days <= self.CLOSING_SOON_DAYS

    @property
    def applicant_count(self) -> int:
        """How many have applied.

        Prefers the annotation `JobQuerySet.with_counts()` adds, so listing
        24 postings is one query rather than one per row. Falls back to a
        count for a single job fetched without it.
        """
        annotated = getattr(self, "_applicant_count", None)
        return self.applications.count() if annotated is None else annotated

    @property
    def new_applicant_count(self) -> int:
        """Applicants nobody has looked at yet. Annotated like the total."""
        annotated = getattr(self, "_new_applicant_count", None)
        if annotated is not None:
            return annotated
        return self.applications.filter(status=ApplicationStatus.APPLIED).count()


class ApplicationStatus(models.TextChoices):
    APPLIED = "applied", "Applied"
    IN_REVIEW = "in_review", "In review"
    SHORTLISTED = "shortlisted", "Shortlisted"
    INTERVIEW = "interview", "Interview"
    OFFER = "offer", "Offer"
    REJECTED = "rejected", "Not successful"
    JOB_CLOSED = "job_closed", "Job closed"


# The recruitment stages a candidate moves through, in order. The SOW has both
# roles monitoring "the stage each candidate has reached", so the order lives
# here once and both portals read it rather than each hard-coding a sequence.
PIPELINE = [
    ApplicationStatus.APPLIED,
    ApplicationStatus.IN_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFER,
]

# Ends the journey rather than advancing it; these sit off the pipeline.
TERMINAL_STATUSES = {ApplicationStatus.REJECTED, ApplicationStatus.JOB_CLOSED}


class Application(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="applications"
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
    )
    applied_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # A job seeker can apply to each position once.
        constraints = [
            models.UniqueConstraint(fields=["job", "candidate"], name="unique_application")
        ]
        ordering = ["-applied_at"]

    def __str__(self) -> str:
        return f"{self.candidate.display_name} -> {self.job.title}"

    @property
    def is_closed(self) -> bool:
        return self.status in TERMINAL_STATUSES

    @property
    def stage_index(self) -> int:
        """How far along the pipeline this application is, 0-based.

        A terminal application reports the furthest stage it actually reached,
        taken from its history, so a rejection after an interview still shows
        the interview as reached rather than collapsing back to the start.
        """
        if not self.is_closed:
            try:
                return PIPELINE.index(self.status)
            except ValueError:
                return 0

        reached = 0
        for event in self.events.all():
            if event.to_status in PIPELINE:
                reached = max(reached, PIPELINE.index(event.to_status))
        return reached

    def advance_to(self, status: str, *, actor=None, note: str = "") -> "ApplicationEvent":
        """Move to a new status and record the change.

        Every status change goes through here so the history is complete: it
        is what the applications page renders as a timeline, and what the
        automatic status-change email will hang off once sending is wired up.
        """
        previous = self.status
        self.status = status
        self.save(update_fields=["status", "updated_at"])
        return ApplicationEvent.objects.create(
            application=self,
            from_status=previous,
            to_status=status,
            note=note,
            actor=actor,
        )


class ApplicationEvent(models.Model):
    """One status change on an application — the recruitment-stage history."""

    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name="events"
    )
    from_status = models.CharField(
        max_length=20, choices=ApplicationStatus.choices, blank=True
    )
    to_status = models.CharField(max_length=20, choices=ApplicationStatus.choices)
    note = models.TextField(blank=True)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.application_id}: {self.from_status or 'new'} -> {self.to_status}"


class SavedJob(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="saves")
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saved_jobs")
    saved_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["job", "candidate"], name="unique_saved_job")
        ]
        ordering = ["-saved_at"]


class ViewedJob(models.Model):
    """Backs the recently-viewed list — the designs show the last 10."""

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="views")
    candidate = models.ForeignKey(User, on_delete=models.CASCADE, related_name="viewed_jobs")
    viewed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-viewed_at"]


class CandidateBookmark(models.Model):
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookmarks")
    candidate = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bookmarked_by"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["manager", "candidate"], name="unique_bookmark")
        ]


class CandidateComment(models.Model):
    """A hiring manager's note on a candidate, visible to the whole team.

    Deliberately on the candidate rather than on one shortlist entry: what a
    manager learns in an interview ("spoke well", "needs notice period") is
    true of the person, not of the posting they happened to apply for, and
    the next manager to open that profile should see it.

    Only the author can remove their own comment — the record of who said
    what is the point, so one manager cannot quietly edit another's view.
    """

    candidate = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="comments_about"
    )
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="candidate_comments"
    )
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.author} on {self.candidate}"


class ShortlistEntry(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="shortlist")
    candidate = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="shortlisted_for"
    )
    stage = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.SHORTLISTED,
    )
    note = models.TextField(blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["job", "candidate"], name="unique_shortlist")
        ]


class Activity(models.Model):
    """The hiring manager recent-activity feed — the designs show the last 20."""

    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    verb = models.CharField(max_length=120)
    target = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "activities"


class EmailTrigger(models.TextChoices):
    """The events the portal can send an automatic email on.

    A fixed list on purpose: a hiring manager composes the wording and picks
    which of these fires it, but cannot invent a trigger the code does not
    raise. Adding a trigger means adding the call site that raises it.
    """

    APPLICATION_RECEIVED = "application_received", "An application is received"
    APPLICATION_STATUS_CHANGED = (
        "application_status_changed",
        "An application's status changes",
    )
    NEW_JOB_PUBLISHED = "new_job_published", "A new job is published"
    ACCOUNT_CREATED = "account_created", "A job seeker creates an account"

    # Account and access, from the Client's automated email library. The
    # account_created trigger covers both sign-up routes and is narrowed by
    # a {"provider": ...} condition, because the wording differs: a password
    # sign-up has to verify its address and a social one is already verified.
    EMAIL_VERIFICATION_RESENT = (
        "email_verification_resent",
        "A verification link is requested again",
    )
    PASSWORD_RESET_REQUESTED = (
        "password_reset_requested",
        "A password reset is requested",
    )
    PASSWORD_CHANGED = "password_changed", "A password is changed"
    ACCOUNT_DELETED = "account_deleted", "A job seeker deletes their account"

    # Profile progress.
    PROFILE_INCOMPLETE = (
        "profile_incomplete",
        "A profile is left incomplete",
    )
    PROFILE_CV_UNLOCKED = (
        "profile_cv_unlocked",
        "A profile first passes 80% and unlocks the CV",
    )


class AutomaticEmail(models.Model):
    """Wording hiring managers edit; sent from careers@moc-pty.com on its event.

    `event` is the stable key the seed and the code refer to. `trigger` is
    which event actually fires it — the same for the three supplied emails,
    but a manager can add further emails on any supported trigger, so a
    trigger can have several emails behind it.
    """

    event = models.CharField(max_length=80, unique=True)
    label = models.CharField(max_length=160)
    subject = models.CharField(max_length=200)
    # The line a mail client shows next to the subject. Supplied for every
    # template in the Client's library, and worth keeping: without one the
    # client fills the space with the first words of the body, which here
    # is always "Hi {preferred_name},".
    preheader = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    # Whether `body` holds HTML from the rich editor or the plain text the
    # library was seeded with. A flag rather than sniffing for "<", because
    # wording that legitimately contains a less-than sign should not change
    # how it is rendered.
    body_is_html = models.BooleanField(default=False)
    trigger = models.CharField(
        max_length=40,
        choices=EmailTrigger.choices,
        default=EmailTrigger.APPLICATION_RECEIVED,
    )
    # Narrows a trigger, e.g. {"status": "shortlisted"} so a status-change
    # email only goes out for that one stage. Empty means every time.
    conditions = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    # Null for the three the Client supplied; set for ones added in the portal.
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="emails_created",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["label"]

    def __str__(self) -> str:
        return self.label

    def matches(self, context: dict) -> bool:
        """Whether this email's conditions hold for one event's context.

        A list value means "any of these". The Client's rejection email is
        meant to cover an application ending without an offer whatever the
        reason, and that is more than one status, so a condition has to be
        able to name a set rather than a single value.
        """
        for key, expected in (self.conditions or {}).items():
            actual = str(context.get(key, ""))
            if isinstance(expected, (list, tuple, set)):
                if actual not in {str(option) for option in expected}:
                    return False
            elif actual != str(expected):
                return False
        return True


class EmailLog(models.Model):
    """Every automatic email the portal has sent, or tried to.

    Kept because "did the candidate get it?" is the first question asked when
    something goes wrong, and the sent copy is the only record of the wording
    as it stood at the time — editing a template must not rewrite history.
    """

    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    template = models.ForeignKey(
        AutomaticEmail,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sends",
    )
    trigger = models.CharField(max_length=40, choices=EmailTrigger.choices)
    recipient = models.EmailField()
    subject = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.SENT
    )
    error = models.TextField(blank=True)
    # What it was about, for the log's "Re:" column. Plain text rather than
    # foreign keys: the log must survive the job or candidate being deleted.
    about = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.subject} to {self.recipient}"
