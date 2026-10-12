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


class JobStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    DRAFT = "draft", "Draft"
    CLOSED = "closed", "Closed"
    PRIVATE = "private", "Private"


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
    required_skills = models.JSONField(default=list, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="jobs_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-posted_at", "-created_at"]

    def __str__(self) -> str:
        return self.title

    @property
    def is_publicly_listed(self) -> bool:
        """Draft, private and closed jobs never reach the public job list."""
        return self.status in {JobStatus.ACTIVE, JobStatus.PAUSED}

    @property
    def applicant_count(self) -> int:
        return self.applications.count()

    @property
    def new_applicant_count(self) -> int:
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
    """The hiring manager recent-activity feed — the designs show the last 50."""

    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    verb = models.CharField(max_length=120)
    target = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "activities"


class AutomaticEmail(models.Model):
    """Wording hiring managers edit; sent from careers@moc-pty.com on its event."""

    event = models.CharField(max_length=80, unique=True)
    label = models.CharField(max_length=160)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.label
