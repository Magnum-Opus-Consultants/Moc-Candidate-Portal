import shutil
import tempfile
from datetime import timedelta

from django.core.mail.backends.base import BaseEmailBackend
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .automatic_mail import emails_for, render, send_automatic_email
from .matching import score_match
from .models import (
    Activity,
    Application,
    ApplicationStatus,
    AutomaticEmail,
    CandidateComment,
    CandidateBookmark,
    CandidateProfile,
    ShortlistEntry,
    EmailLog,
    EmailTrigger,
    EmploymentType,
    ExperienceLevel,
    Job,
    JobStatus,
    Role,
    User,
    WorkSetup,
)


def make_candidate(**overrides) -> CandidateProfile:
    user = User.objects.create_user(
        username=overrides.pop("username", "candidate"),
        first_name="Alex",
        last_name="Turner",
        role=Role.JOB_SEEKER,
    )
    defaults = {
        "role_category": "Design",
        "experience_level": ExperienceLevel.SENIOR,
        "preferred_work_setup": WorkSetup.HYBRID,
        "skills": ["Figma", "Design systems"],
        "section_progress": {},
    }
    defaults.update(overrides)
    return CandidateProfile.objects.create(user=user, **defaults)


def make_job(**overrides) -> Job:
    defaults = {
        "title": "Senior Product Designer",
        "role_category": "Design",
        "company": "Meridian Health Group",
        "description": "Lead design across the patient products.",
        "work_setup": WorkSetup.HYBRID,
        "experience_level": ExperienceLevel.SENIOR,
        "status": JobStatus.ACTIVE,
        "required_skills": ["Figma", "Design systems"],
        "posted_at": timezone.now(),
    }
    defaults.update(overrides)
    return Job.objects.create(**defaults)


class PublicJobListTests(TestCase):
    """The SOW lets anyone browse open positions without an account."""

    def test_lists_active_and_paused_jobs(self):
        make_job(title="Open role", status=JobStatus.ACTIVE)
        make_job(title="Paused role", status=JobStatus.PAUSED)

        response = self.client.get(reverse("api:job-list"))

        self.assertEqual(response.status_code, 200)
        titles = {row["title"] for row in response.json()["results"]}
        self.assertEqual(titles, {"Open role", "Paused role"})

    def test_hides_draft_private_and_closed_jobs(self):
        make_job(title="Draft role", status=JobStatus.DRAFT)
        make_job(title="Private role", status=JobStatus.PRIVATE)
        make_job(title="Closed role", status=JobStatus.CLOSED)

        response = self.client.get(reverse("api:job-list"))

        self.assertEqual(response.json()["results"], [])

    def test_search_matches_title_and_description(self):
        make_job(title="Data Analyst", role_category="Data", description="SQL work")
        make_job(title="Designer", description="Figma work")

        response = self.client.get(reverse("api:job-list"), {"search": "SQL"})

        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Data Analyst")

    def test_search_matches_company_and_skills(self):
        make_job(
            title="Analyst",
            company="Northbridge Financial",
            required_skills=["SQL"],
        )
        make_job(title="Designer", company="Oakline Retail", required_skills=["Figma"])

        by_company = self.client.get(reverse("api:job-list"), {"search": "Northbridge"})
        self.assertEqual(len(by_company.json()["results"]), 1)

        by_skill = self.client.get(reverse("api:job-list"), {"search": "Figma"})
        self.assertEqual(len(by_skill.json()["results"]), 1)

    def test_location_filter_narrows_to_a_town(self):
        """Backs the 'Where' field on the job board."""
        make_job(title="Cape role", location="Cape Town")
        make_job(title="Joburg role", location="Johannesburg")

        response = self.client.get(reverse("api:job-list"), {"location": "cape"})

        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Cape role")


class ProfileCompletionTests(TestCase):
    """Completion drives the strength ladder and the 80% CV download gate."""

    def test_completion_averages_the_eight_sections(self):
        profile = make_candidate(
            section_progress={
                "personal_details": 100,
                "ee_information": 100,
                "career_details": 100,
                "education": 100,
                "experience": 100,
                "remuneration": 100,
                "skills_tools": 0,
                "privacy_sharing": 0,
            }
        )
        self.assertEqual(profile.completion, 75)

    def test_branded_cv_unlocks_at_eighty_percent(self):
        below = make_candidate(
            username="below",
            section_progress={k: 75 for k in ["personal_details"]},
        )
        self.assertFalse(below.can_download_branded_cv)

        at_threshold = make_candidate(
            username="at",
            # Six full sections plus 40 averages to exactly 80 across eight.
            section_progress={
                "personal_details": 100,
                "ee_information": 100,
                "career_details": 100,
                "education": 100,
                "experience": 100,
                "remuneration": 100,
                "skills_tools": 40,
                "privacy_sharing": 0,
            },
        )
        self.assertEqual(at_threshold.completion, 80)
        self.assertTrue(at_threshold.can_download_branded_cv)

    def test_strength_ladder_steps(self):
        cases = [
            (0, "getting_started"),
            (30, "making_progress"),
            (55, "gaining_momentum"),
            (75, "going_strong"),
            (95, "looking_great"),
        ]
        for index, (value, expected) in enumerate(cases):
            profile = make_candidate(
                username=f"ladder{index}",
                section_progress={
                    slug: value
                    for slug in [
                        "personal_details",
                        "ee_information",
                        "career_details",
                        "education",
                        "experience",
                        "remuneration",
                        "skills_tools",
                        "privacy_sharing",
                    ]
                },
            )
            with self.subTest(value=value):
                self.assertEqual(profile.strength, expected)


class MatchingTests(TestCase):
    def test_perfect_match_scores_one_hundred(self):
        profile = make_candidate()
        job = make_job()

        result = score_match(profile, job)

        self.assertEqual(result.score, 100)
        self.assertIn(
            {"label": "Discipline matches", "level": "match"}, result.reasons
        )

    def test_unrelated_candidate_scores_zero(self):
        profile = make_candidate(
            role_category="Marketing",
            experience_level=ExperienceLevel.ENTRY,
            preferred_work_setup=WorkSetup.OFFICE,
            skills=["Copywriting"],
        )
        job = make_job(work_setup=WorkSetup.REMOTE)

        self.assertEqual(score_match(profile, job).score, 0)

    def test_hybrid_part_matches_office_and_remote(self):
        """Hybrid sits between the two, so it is a near miss rather than none."""
        profile = make_candidate(
            role_category="Marketing",
            experience_level=ExperienceLevel.ENTRY,
            preferred_work_setup=WorkSetup.OFFICE,
            skills=["Copywriting"],
        )
        job = make_job(work_setup=WorkSetup.HYBRID)

        result = score_match(profile, job)

        # A near miss on the only dimension that applies: some credit, but
        # nowhere near a match. The exact number follows the weight table, so
        # assert the shape rather than pinning it here.
        self.assertGreater(result.score, 0)
        self.assertLess(result.score, 25)
        self.assertIn(
            {"label": "Working hours partial match", "level": "partial"},
            result.reasons,
        )

    def test_partial_skill_overlap_scores_proportionally(self):
        profile = make_candidate(skills=["Figma"])
        job = make_job(required_skills=["Figma", "Design systems"])

        result = score_match(profile, job)

        # Full marks everywhere except skills, which are half covered.
        self.assertEqual(result.score, 100 - 35 // 2)
        self.assertIn({"label": "1 skill match", "level": "partial"}, result.reasons)

    def test_no_profile_scores_zero_without_raising(self):
        self.assertEqual(score_match(None, make_job()).score, 0)

    def test_score_is_out_of_what_the_position_asks_for(self):
        """A job that lists no software tools cannot judge anyone on them."""
        profile = make_candidate(username="no-tools")
        job = make_job()  # no software_tools on the job

        self.assertEqual(job.software_tools, [])
        self.assertEqual(score_match(profile, job).score, 100)

    def test_an_outright_work_setup_mismatch_is_reported(self):
        profile = make_candidate(
            username="remote-only", preferred_work_setup=WorkSetup.REMOTE
        )
        job = make_job(work_setup=WorkSetup.OFFICE)

        self.assertIn(
            {"label": "Working hours don't match", "level": "none"},
            score_match(profile, job).reasons,
        )


class CandidateDashboardTests(TestCase):
    def test_dashboard_reports_counts_and_recommendations(self):
        profile = make_candidate()
        applied_to = make_job(title="Applied role")
        make_job(title="Open role")
        Application.objects.create(
            job=applied_to,
            candidate=profile.user,
            status=ApplicationStatus.SHORTLISTED,
        )

        self.client.force_login(profile.user)
        response = self.client.get(reverse("api:candidate-dashboard"))

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["stats"]["total_applications"], 1)
        self.assertEqual(body["stats"]["shortlisted"], 1)

        # Recommendations leave out positions already applied for.
        recommended = {row["title"] for row in body["recommended_jobs"]}
        self.assertEqual(recommended, {"Open role"})


class ManagerJobDetailTests(TestCase):
    def test_tabs_split_applicants_and_suggestions(self):
        manager = User.objects.create_user(
            username="manager", role=Role.HIRING_MANAGER
        )
        job = make_job(created_by=manager)

        applicant = make_candidate(username="applicant")
        Application.objects.create(
            job=job, candidate=applicant.user, status=ApplicationStatus.SHORTLISTED
        )
        # A matching candidate who has not applied should surface as suggested.
        make_candidate(username="suggested")

        self.client.force_login(manager)
        response = self.client.get(
            reverse("api:manager-job-detail", args=[job.id])
        )

        self.assertEqual(response.status_code, 200)
        tabs = response.json()["tabs"]
        self.assertEqual(len(tabs["all"]), 1)
        self.assertEqual(len(tabs["shortlisted"]), 1)
        self.assertEqual(len(tabs["suggested"]), 1)
        self.assertEqual(tabs["suggested"][0]["match"]["score"], 100)


class JobCreateValidationTests(TestCase):
    """A posting the database rejects comes back as marked fields, not a 500."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="creator", role=Role.HIRING_MANAGER
        )
        self.client.force_login(self.manager)

    def _payload(self, **overrides):
        data = {
            "title": "Senior Designer",
            "role_category": "Design",
            "company": "Meridian Health Group",
            "description": "Lead design across the patient products.",
        }
        data.update(overrides)
        return data

    def test_a_malformed_email_is_a_marked_field_not_a_server_error(self):
        response = self.client.post(
            reverse("api:manager-job-create"),
            self._payload(hr_email="adasd"),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["fields"], ["hr_email"])
        self.assertIn("valid email", body["field_errors"]["hr_email"])
        self.assertFalse(Job.objects.filter(title="Senior Designer").exists())

    def test_missing_required_fields_come_back_with_reasons(self):
        response = self.client.post(
            reverse("api:manager-job-create"),
            self._payload(description=""),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertIn("description", body["fields"])
        self.assertEqual(
            body["field_errors"]["description"], "This field is required."
        )

    def test_a_valid_posting_is_still_created(self):
        response = self.client.post(
            reverse("api:manager-job-create"),
            self._payload(hr_email="careers@moc-pty.com"),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Job.objects.filter(title="Senior Designer").exists())


class JobEditDuplicateDeleteTests(TestCase):
    """Edit, Duplicate and Delete on a posting (Development Plan, Days 10-11)."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="editor", role=Role.HIRING_MANAGER
        )
        self.client.force_login(self.manager)

    # --- Edit ----------------------------------------------------------
    def test_editing_saves_and_a_live_job_stays_live(self):
        job = make_job(status=JobStatus.ACTIVE)

        response = self.client.post(
            reverse("api:manager-job-update", args=[job.id]),
            {"title": "Principal Product Designer", "description": "Rewritten."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.title, "Principal Product Designer")
        self.assertEqual(job.status, JobStatus.ACTIVE)

    def test_editing_cannot_change_the_status(self):
        job = make_job(status=JobStatus.ACTIVE)

        self.client.post(
            reverse("api:manager-job-update", args=[job.id]),
            {"status": "draft"},
            content_type="application/json",
        )

        job.refresh_from_db()
        self.assertEqual(job.status, JobStatus.ACTIVE)

    def test_an_edit_that_empties_a_required_field_is_refused(self):
        job = make_job(status=JobStatus.ACTIVE)

        response = self.client.post(
            reverse("api:manager-job-update", args=[job.id]),
            {"title": ""},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.json()["fields"])
        job.refresh_from_db()
        self.assertEqual(job.title, "Senior Product Designer")

    # --- Duplicate -----------------------------------------------------
    def test_duplicating_makes_an_unposted_draft_copy(self):
        job = make_job(status=JobStatus.ACTIVE)

        response = self.client.post(
            reverse("api:manager-job-duplicate", args=[job.id])
        )

        self.assertEqual(response.status_code, 201)
        copy = Job.objects.get(pk=response.json()["job"]["id"])
        self.assertNotEqual(copy.pk, job.pk)
        self.assertEqual(copy.title, "Senior Product Designer (copy)")
        self.assertEqual(copy.status, JobStatus.DRAFT)
        self.assertIsNone(copy.posted_at)
        self.assertEqual(copy.description, job.description)

    def test_a_duplicate_carries_no_applicants(self):
        job = make_job(status=JobStatus.ACTIVE)
        Application.objects.create(
            job=job, candidate=make_candidate(username="dup").user
        )

        response = self.client.post(
            reverse("api:manager-job-duplicate", args=[job.id])
        )

        copy_id = response.json()["job"]["id"]
        self.assertEqual(Application.objects.filter(job_id=copy_id).count(), 0)

    # --- Delete --------------------------------------------------------
    def test_deleting_a_draft_with_no_applicants(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None)

        response = self.client.post(
            reverse("api:manager-job-delete", args=[job.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Job.objects.filter(pk=job.pk).exists())

    def test_a_posting_with_applicants_is_never_deleted(self):
        job = make_job(status=JobStatus.ACTIVE)
        Application.objects.create(
            job=job, candidate=make_candidate(username="keep").user
        )

        response = self.client.post(
            reverse("api:manager-job-delete", args=[job.id])
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("Close the posting instead", response.json()["detail"])
        self.assertTrue(Job.objects.filter(pk=job.pk).exists())

    def test_a_job_seeker_cannot_edit_duplicate_or_delete(self):
        job = make_job(status=JobStatus.ACTIVE)
        self.client.force_login(make_candidate(username="intruder").user)

        for name in (
            "api:manager-job-update",
            "api:manager-job-duplicate",
            "api:manager-job-delete",
        ):
            response = self.client.post(
                reverse(name, args=[job.id]), {}, content_type="application/json"
            )
            self.assertIn(response.status_code, (401, 403), name)

        self.assertTrue(Job.objects.filter(pk=job.pk).exists())


class CandidateCommentTests(TestCase):
    """Team notes on a candidate (Development Plan, Day 12)."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="sarah", first_name="Sarah", role=Role.HIRING_MANAGER
        )
        self.colleague = User.objects.create_user(
            username="thabo", first_name="Thabo", role=Role.HIRING_MANAGER
        )
        self.candidate = make_candidate(username="subject").user
        self.client.force_login(self.manager)

    def test_a_note_is_saved_with_its_author(self):
        response = self.client.post(
            reverse("api:manager-candidate-comment", args=[self.candidate.id]),
            {"body": "Interviewed well, needs a month's notice."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        comment = CandidateComment.objects.get()
        self.assertEqual(comment.author, self.manager)
        self.assertEqual(comment.candidate, self.candidate)

    def test_another_manager_sees_the_note(self):
        CandidateComment.objects.create(
            candidate=self.candidate, author=self.manager, body="Spoke well."
        )
        self.client.force_login(self.colleague)

        response = self.client.get(
            reverse("api:manager-candidate-detail", args=[self.candidate.id])
        )

        self.assertEqual(response.status_code, 200)
        comments = response.json()["comments"]
        self.assertEqual(len(comments), 1)
        self.assertEqual(comments[0]["body"], "Spoke well.")
        self.assertEqual(comments[0]["author"]["name"], "Sarah")

    def test_an_empty_note_is_refused(self):
        response = self.client.post(
            reverse("api:manager-candidate-comment", args=[self.candidate.id]),
            {"body": "   "},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(CandidateComment.objects.exists())

    def test_a_manager_can_remove_their_own_note(self):
        comment = CandidateComment.objects.create(
            candidate=self.candidate, author=self.manager, body="Mine."
        )

        response = self.client.post(
            reverse(
                "api:manager-candidate-comment-delete",
                args=[self.candidate.id, comment.id],
            )
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(CandidateComment.objects.exists())

    def test_a_manager_cannot_remove_someone_elses_note(self):
        comment = CandidateComment.objects.create(
            candidate=self.candidate, author=self.colleague, body="Theirs."
        )

        response = self.client.post(
            reverse(
                "api:manager-candidate-comment-delete",
                args=[self.candidate.id, comment.id],
            )
        )

        self.assertEqual(response.status_code, 403)
        self.assertTrue(CandidateComment.objects.exists())

    def test_a_job_seeker_cannot_read_or_write_notes(self):
        CandidateComment.objects.create(
            candidate=self.candidate, author=self.manager, body="Private."
        )
        self.client.force_login(make_candidate(username="snoop").user)

        read = self.client.get(
            reverse("api:manager-candidate-detail", args=[self.candidate.id])
        )
        write = self.client.post(
            reverse("api:manager-candidate-comment", args=[self.candidate.id]),
            {"body": "Hello"},
            content_type="application/json",
        )

        self.assertIn(read.status_code, (401, 403))
        self.assertIn(write.status_code, (401, 403))


class DuplicateNamingTests(TestCase):
    """Three copies of one posting must be told apart."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="copier", role=Role.HIRING_MANAGER
        )
        self.client.force_login(self.manager)

    def test_repeated_copies_are_numbered_not_stacked(self):
        job = make_job(title="Senior SEO Specialist")

        titles = []
        for _ in range(3):
            response = self.client.post(
                reverse("api:manager-job-duplicate", args=[job.id])
            )
            titles.append(response.json()["job"]["title"])

        self.assertEqual(
            titles,
            [
                "Senior SEO Specialist (copy)",
                "Senior SEO Specialist (copy 2)",
                "Senior SEO Specialist (copy 3)",
            ],
        )

    def test_copying_a_copy_does_not_stack_the_suffix(self):
        make_job(title="Senior SEO Specialist")
        first = make_job(title="Senior SEO Specialist (copy)")

        response = self.client.post(
            reverse("api:manager-job-duplicate", args=[first.id])
        )

        self.assertEqual(
            response.json()["job"]["title"], "Senior SEO Specialist (copy 2)"
        )


@override_settings(
    MAILERS={"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}
)
class AutomaticEmailTests(TestCase):
    """Sending the automatic emails and keeping the record (Day 4)."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="mailer", role=Role.HIRING_MANAGER
        )
        self.template = AutomaticEmail.objects.create(
            event="application_received",
            label="Application received",
            subject="We have your application for {job_title}",
            body="Hi {candidate_name}, thanks for applying at {company}.",
            trigger=EmailTrigger.APPLICATION_RECEIVED,
        )

    def test_placeholders_are_filled_and_unknown_ones_left_alone(self):
        text = render(
            "Hi {candidate_name}, re {job_title} and {nope}",
            {"candidate_name": "Alex", "job_title": "Designer"},
        )
        self.assertEqual(text, "Hi Alex, re Designer and {nope}")

    def test_applying_sends_the_email_and_logs_it(self):
        profile = make_candidate(username="applicant")
        profile.user.email = "alex@example.com"
        profile.user.save()
        job = make_job(status=JobStatus.ACTIVE)

        self.client.force_login(profile.user)
        response = self.client.post(reverse("api:job-apply", args=[job.id]))

        self.assertEqual(response.status_code, 201)
        entry = EmailLog.objects.get()
        self.assertEqual(entry.status, EmailLog.Status.SENT)
        self.assertEqual(entry.recipient, "alex@example.com")
        self.assertIn(job.title, entry.subject)
        self.assertIn("Alex", entry.body)

    def test_an_inactive_email_does_not_send(self):
        self.template.is_active = False
        self.template.save()

        sent = send_automatic_email(
            EmailTrigger.APPLICATION_RECEIVED, "x@example.com", {}
        )

        self.assertEqual(sent, 0)
        self.assertFalse(EmailLog.objects.exists())

    def test_conditions_narrow_a_trigger(self):
        shortlisted_only = AutomaticEmail.objects.create(
            event="shortlisted_note",
            label="Shortlisted",
            subject="You are shortlisted",
            body="Good news.",
            trigger=EmailTrigger.APPLICATION_STATUS_CHANGED,
            conditions={"status": "shortlisted"},
        )

        matches = emails_for(
            EmailTrigger.APPLICATION_STATUS_CHANGED, {"status": "shortlisted"}
        )
        misses = emails_for(
            EmailTrigger.APPLICATION_STATUS_CHANGED, {"status": "rejected"}
        )

        self.assertIn(shortlisted_only, matches)
        self.assertNotIn(shortlisted_only, misses)

    def test_the_log_keeps_the_wording_as_it_was_sent(self):
        send_automatic_email(
            EmailTrigger.APPLICATION_RECEIVED,
            "alex@example.com",
            {"candidate_name": "Alex", "job_title": "Designer", "company": "MOC"},
        )
        original = EmailLog.objects.get().body

        self.template.body = "Completely different wording."
        self.template.save()

        self.assertEqual(EmailLog.objects.get().body, original)

    def test_a_failed_send_is_logged_and_does_not_raise(self):
        with override_settings(
            MAILERS={"default": {"BACKEND": "api.tests.ExplodingEmailBackend"}}
        ):
            sent = send_automatic_email(
                EmailTrigger.APPLICATION_RECEIVED, "alex@example.com", {}
            )

        self.assertEqual(sent, 0)
        entry = EmailLog.objects.get()
        self.assertEqual(entry.status, EmailLog.Status.FAILED)
        self.assertTrue(entry.error)

    def test_a_manager_saves_the_wording(self):
        self.client.force_login(self.manager)

        response = self.client.post(
            reverse("api:manager-email-save", args=[self.template.id]),
            {"subject": "New subject", "body": "New wording."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.template.refresh_from_db()
        self.assertEqual(self.template.subject, "New subject")

    def test_a_manager_adds_an_email_on_a_supported_trigger(self):
        self.client.force_login(self.manager)

        response = self.client.post(
            reverse("api:manager-email-create"),
            {
                "label": "Interview invitation",
                "trigger": EmailTrigger.APPLICATION_STATUS_CHANGED,
                "subject": "Interview for {job_title}",
                "body": "Hi {candidate_name}",
                "conditions": {"status": "interview"},
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        email = AutomaticEmail.objects.get(label="Interview invitation")
        self.assertEqual(email.created_by, self.manager)
        self.assertEqual(email.conditions, {"status": "interview"})

    def test_an_unsupported_trigger_is_refused(self):
        self.client.force_login(self.manager)

        response = self.client.post(
            reverse("api:manager-email-create"),
            {
                "label": "Birthday",
                "trigger": "candidate_birthday",
                "subject": "Happy birthday",
                "body": "Many happy returns",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("trigger", response.json()["fields"])

    def test_a_supplied_email_cannot_be_deleted_but_can_be_switched_off(self):
        self.client.force_login(self.manager)

        deleted = self.client.post(
            reverse("api:manager-email-delete", args=[self.template.id])
        )
        self.assertEqual(deleted.status_code, 409)
        self.assertTrue(AutomaticEmail.objects.filter(pk=self.template.pk).exists())

        self.client.post(
            reverse("api:manager-email-save", args=[self.template.id]),
            {"is_active": False},
            content_type="application/json",
        )
        self.template.refresh_from_db()
        self.assertFalse(self.template.is_active)

    def test_a_job_seeker_cannot_read_or_change_the_emails(self):
        self.client.force_login(make_candidate(username="nosey").user)

        read = self.client.get(reverse("api:manager-emails"))
        write = self.client.post(
            reverse("api:manager-email-save", args=[self.template.id]),
            {"subject": "hacked"},
            content_type="application/json",
        )

        self.assertIn(read.status_code, (401, 403))
        self.assertIn(write.status_code, (401, 403))


class ExplodingEmailBackend(BaseEmailBackend):
    """A mailer that always fails, for the failure-logging test."""

    def send_messages(self, email_messages):
        raise RuntimeError("mailbox unreachable")


class BulkJobDeleteTests(TestCase):
    """Deleting several postings at once, partially where it must."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="bulk", role=Role.HIRING_MANAGER
        )
        self.client.force_login(self.manager)

    def test_several_empty_postings_go_at_once(self):
        jobs = [
            make_job(title=f"Draft {n}", status=JobStatus.DRAFT, posted_at=None)
            for n in range(3)
        ]

        response = self.client.post(
            reverse("api:manager-jobs-delete"),
            {"ids": [job.id for job in jobs]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["deleted"], 3)
        self.assertEqual(Job.objects.count(), 0)

    def test_postings_with_applicants_are_kept_and_named(self):
        empty = make_job(title="Empty", status=JobStatus.DRAFT, posted_at=None)
        busy = make_job(title="Busy", status=JobStatus.ACTIVE)
        Application.objects.create(
            job=busy, candidate=make_candidate(username="appl").user
        )

        response = self.client.post(
            reverse("api:manager-jobs-delete"),
            {"ids": [empty.id, busy.id]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["deleted"], 1)
        self.assertEqual(body["kept"], ["Busy"])
        self.assertFalse(Job.objects.filter(pk=empty.pk).exists())
        self.assertTrue(Job.objects.filter(pk=busy.pk).exists())

    def test_a_batch_of_only_busy_postings_deletes_nothing(self):
        busy = make_job(title="Busy", status=JobStatus.ACTIVE)
        Application.objects.create(
            job=busy, candidate=make_candidate(username="appl2").user
        )

        response = self.client.post(
            reverse("api:manager-jobs-delete"),
            {"ids": [busy.id]},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["deleted"], 0)
        self.assertTrue(Job.objects.filter(pk=busy.pk).exists())

    def test_an_empty_selection_is_refused(self):
        response = self.client.post(
            reverse("api:manager-jobs-delete"),
            {"ids": []},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_one_activity_entry_covers_the_batch(self):
        jobs = [
            make_job(title=f"D{n}", status=JobStatus.DRAFT, posted_at=None)
            for n in range(4)
        ]

        self.client.post(
            reverse("api:manager-jobs-delete"),
            {"ids": [job.id for job in jobs]},
            content_type="application/json",
        )

        entry = Activity.objects.latest("created_at")
        self.assertEqual(entry.verb, "deleted")
        self.assertEqual(entry.target, "4 job postings")

    def test_a_job_seeker_cannot_bulk_delete(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None)
        self.client.force_login(make_candidate(username="snoop3").user)

        response = self.client.post(
            reverse("api:manager-jobs-delete"),
            {"ids": [job.id]},
            content_type="application/json",
        )

        self.assertIn(response.status_code, (401, 403))
        self.assertTrue(Job.objects.filter(pk=job.pk).exists())


class PublishJobTests(TestCase):
    """Publishing an approved posting (Development Plan, Day 11)."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="publisher", role=Role.HIRING_MANAGER
        )
        self.client.force_login(self.manager)

    def test_publishing_a_draft_makes_it_live_and_dates_it(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None)

        response = self.client.post(
            reverse("api:manager-job-publish", args=[job.id])
        )

        self.assertEqual(response.status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.status, JobStatus.ACTIVE)
        self.assertIsNotNone(job.posted_at)
        self.assertTrue(job.is_publicly_listed)

    def test_a_published_job_reaches_the_public_list(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None)
        self.assertNotIn(
            job.id,
            [row["id"] for row in self.client.get(reverse("api:job-list")).json()["results"]],
        )

        self.client.post(reverse("api:manager-job-publish", args=[job.id]))

        listed = self.client.get(reverse("api:job-list")).json()["results"]
        self.assertIn(job.id, [row["id"] for row in listed])

    def test_publishing_records_activity(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None)

        self.client.post(reverse("api:manager-job-publish", args=[job.id]))

        entry = Activity.objects.latest("created_at")
        self.assertEqual(entry.verb, "published")
        self.assertEqual(entry.target, job.title)
        self.assertEqual(entry.actor, self.manager)

    def test_republishing_keeps_the_original_posted_date(self):
        first = timezone.now() - timedelta(days=30)
        job = make_job(status=JobStatus.PAUSED, posted_at=first)

        self.client.post(reverse("api:manager-job-publish", args=[job.id]))

        job.refresh_from_db()
        self.assertEqual(job.posted_at, first)

    def test_an_already_published_job_is_refused(self):
        job = make_job(status=JobStatus.ACTIVE)

        response = self.client.post(
            reverse("api:manager-job-publish", args=[job.id])
        )

        self.assertEqual(response.status_code, 409)

    def test_an_incomplete_draft_cannot_be_published(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None, description="")

        response = self.client.post(
            reverse("api:manager-job-publish", args=[job.id])
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("description", response.json()["fields"])
        job.refresh_from_db()
        self.assertEqual(job.status, JobStatus.DRAFT)

    def test_a_posting_whose_closing_date_has_passed_cannot_be_published(self):
        job = make_job(
            status=JobStatus.DRAFT,
            posted_at=None,
            closes_at=timezone.now() - timedelta(days=1),
        )

        response = self.client.post(
            reverse("api:manager-job-publish", args=[job.id])
        )

        self.assertEqual(response.status_code, 400)
        job.refresh_from_db()
        self.assertEqual(job.status, JobStatus.DRAFT)

    def test_a_job_seeker_cannot_publish(self):
        job = make_job(status=JobStatus.DRAFT, posted_at=None)
        self.client.force_login(make_candidate(username="nosy").user)

        response = self.client.post(
            reverse("api:manager-job-publish", args=[job.id])
        )

        self.assertIn(response.status_code, (401, 403))
        job.refresh_from_db()
        self.assertEqual(job.status, JobStatus.DRAFT)


class RoleGatingTests(TestCase):
    """Each role reaches only its own pages (SOW, System Roles)."""

    def test_anonymous_cannot_read_a_candidate_dashboard(self):
        make_candidate()
        response = self.client.get(reverse("api:candidate-dashboard"))
        self.assertIn(response.status_code, (401, 403))

    def test_anonymous_cannot_read_the_candidate_database(self):
        response = self.client.get(reverse("api:manager-candidates"))
        self.assertIn(response.status_code, (401, 403))

    def test_a_job_seeker_cannot_reach_hiring_manager_pages(self):
        profile = make_candidate()
        self.client.force_login(profile.user)

        response = self.client.get(reverse("api:manager-candidates"))

        self.assertIn(response.status_code, (401, 403))

    def test_a_hiring_manager_cannot_reach_job_seeker_pages(self):
        manager = User.objects.create_user(
            username="gate-manager", role=Role.HIRING_MANAGER
        )
        self.client.force_login(manager)

        response = self.client.get(reverse("api:candidate-dashboard"))

        self.assertIn(response.status_code, (401, 403))

    def test_the_public_job_list_stays_open(self):
        """Browsing needs no account; only applying and saving do."""
        make_job(title="Open role")

        response = self.client.get(reverse("api:job-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)


class ApplicationConstraintTests(TestCase):
    def test_a_candidate_can_apply_to_a_position_once(self):
        from django.db import IntegrityError

        profile = make_candidate()
        job = make_job()
        Application.objects.create(job=job, candidate=profile.user)

        with self.assertRaises(IntegrityError):
            Application.objects.create(job=job, candidate=profile.user)


class HealthTests(TestCase):
    def test_health_reports_ok(self):
        response = self.client.get(reverse("api:health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


class CsrfProtectionTests(TestCase):
    """State-changing endpoints must reject a request with no CSRF token.

    Authentication is a session cookie, so without this a malicious page
    could change a signed-in user's password or delete their account by
    POSTing cross-site with the browser's cookie attached.
    """

    def setUp(self):
        from django.test import Client

        self.profile = make_candidate(username="csrf-seeker")
        self.profile.user.set_password("portal-demo")
        self.profile.user.save()
        # enforce_csrf_checks mirrors a real browser; the default client skips it.
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.profile.user)

    def test_apply_without_a_token_is_refused(self):
        job = make_job()
        response = self.client.post(reverse("api:job-apply", args=[job.id]))
        self.assertEqual(response.status_code, 403)

    def test_changing_the_password_without_a_token_is_refused(self):
        response = self.client.post(
            reverse("api:account-password"),
            data={"current_password": "portal-demo", "new_password": "hijacked1"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

        self.profile.user.refresh_from_db()
        self.assertTrue(self.profile.user.check_password("portal-demo"))

    def test_deleting_the_account_without_a_token_is_refused(self):
        response = self.client.post(reverse("api:account-delete"))

        self.assertEqual(response.status_code, 403)
        self.assertTrue(User.objects.filter(pk=self.profile.user.pk).exists())

    def test_saving_a_job_without_a_token_is_refused(self):
        job = make_job()
        response = self.client.post(reverse("api:job-save", args=[job.id]))
        self.assertEqual(response.status_code, 403)


class BrandedCvTests(TestCase):
    """The MOC-branded CV unlocks at 80% completion and not before."""

    FULL = {
        "personal_details": 100,
        "ee_information": 0,
        "career_details": 100,
        "education": 100,
        "experience": 100,
        "remuneration": 100,
        "skills_tools": 100,
        "privacy_sharing": 100,
    }

    def test_an_incomplete_profile_is_refused(self):
        profile = make_candidate(section_progress={"personal_details": 100})
        self.client.force_login(profile.user)

        response = self.client.get(reverse("api:candidate-cv"))

        self.assertEqual(response.status_code, 403)
        body = response.json()
        self.assertEqual(body["required"], 80)
        self.assertLess(body["completion"], 80)

    def test_a_complete_profile_gets_a_pdf(self):
        profile = make_candidate(section_progress=self.FULL)
        self.client.force_login(profile.user)

        response = self.client.get(reverse("api:candidate-cv"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_the_eighty_percent_gate_is_exact(self):
        """79% is refused, 80% is not — the boundary is the requirement."""
        under = make_candidate(
            username="under", section_progress={k: 79 for k in self.FULL}
        )
        self.assertFalse(under.can_download_branded_cv)

        at = make_candidate(username="at", section_progress={k: 80 for k in self.FULL})
        self.assertTrue(at.can_download_branded_cv)

    def test_anonymous_visitors_cannot_download_a_cv(self):
        make_candidate(section_progress=self.FULL)
        response = self.client.get(reverse("api:candidate-cv"))
        self.assertIn(response.status_code, (401, 403))

    def test_a_hiring_manager_cannot_use_the_seeker_cv_route(self):
        manager = User.objects.create_user(
            username="cv-manager", role=Role.HIRING_MANAGER
        )
        self.client.force_login(manager)

        response = self.client.get(reverse("api:candidate-cv"))

        self.assertIn(response.status_code, (401, 403))


class JobFilterAndSortTests(TestCase):
    """Day 5: filters combine and clear; sorting covers relevance and both
    directions of date added."""

    def setUp(self):
        now = timezone.now()
        self.old = make_job(
            title="Old remote contract",
            work_setup=WorkSetup.REMOTE,
            employment_type=EmploymentType.CONTRACT,
            experience_level=ExperienceLevel.JUNIOR,
            role_category="Engineering",
            posted_at=now - timezone.timedelta(days=30),
        )
        self.mid = make_job(
            title="Mid hybrid full time",
            work_setup=WorkSetup.HYBRID,
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.SENIOR,
            role_category="Design",
            posted_at=now - timezone.timedelta(days=10),
        )
        self.new = make_job(
            title="New office full time",
            work_setup=WorkSetup.OFFICE,
            employment_type=EmploymentType.FULL_TIME,
            experience_level=ExperienceLevel.SENIOR,
            role_category="Design",
            posted_at=now - timezone.timedelta(days=1),
        )

    def titles(self, query=""):
        response = self.client.get(reverse("api:job-list") + query)
        self.assertEqual(response.status_code, 200)
        return [row["title"] for row in response.json()["results"]]

    def test_one_filter_narrows_the_list(self):
        self.assertEqual(self.titles("?work_setup=remote"), ["Old remote contract"])

    def test_values_within_a_group_widen_it(self):
        """Full-time OR contract, not full-time AND contract."""
        both = self.titles("?employment_type=full_time,contract")
        self.assertEqual(len(both), 3)

    def test_groups_combine_to_narrow(self):
        self.assertEqual(
            self.titles("?employment_type=full_time&work_setup=office"),
            ["New office full time"],
        )

    def test_clearing_the_filters_restores_everything(self):
        self.assertEqual(len(self.titles("?work_setup=remote")), 1)
        self.assertEqual(len(self.titles()), 3)

    def test_date_added_sorts_both_directions(self):
        newest = self.titles("?sort=newest")
        self.assertEqual(newest[0], "New office full time")
        self.assertEqual(newest[-1], "Old remote contract")

        self.assertEqual(list(reversed(newest)), self.titles("?sort=oldest"))

    def test_relevance_ranks_against_the_seekers_profile(self):
        profile = make_candidate(
            role_category="Design",
            experience_level=ExperienceLevel.SENIOR,
            preferred_work_setup=WorkSetup.OFFICE,
        )
        self.client.force_login(profile.user)

        # Newest first would also lead with the office role, so compare
        # against a seeker who wants something else entirely.
        self.assertEqual(self.titles("?sort=relevance")[0], "New office full time")

        other = make_candidate(
            username="remote-seeker",
            role_category="Engineering",
            experience_level=ExperienceLevel.JUNIOR,
            preferred_work_setup=WorkSetup.REMOTE,
        )
        self.client.force_login(other.user)
        self.assertEqual(self.titles("?sort=relevance")[0], "Old remote contract")

    def test_facets_count_each_option(self):
        body = self.client.get(reverse("api:job-list")).json()
        self.assertEqual(body["facets"]["work_setup"]["remote"], 1)
        self.assertEqual(body["facets"]["employment_type"]["full_time"], 2)
        self.assertEqual(body["facets"]["role_category"]["Design"], 2)

    def test_a_groups_own_facet_ignores_its_own_selection(self):
        """So the counts answer "what if I also picked this", not "what is
        left now that I have"."""
        body = self.client.get(
            reverse("api:job-list") + "?work_setup=remote"
        ).json()

        self.assertEqual(len(body["results"]), 1)
        # Still offers the other setups, with their counts intact.
        self.assertEqual(body["facets"]["work_setup"]["hybrid"], 1)
        self.assertEqual(body["facets"]["work_setup"]["office"], 1)

    def test_the_list_is_paged(self):
        for i in range(25):
            make_job(title=f"Filler {i}")

        body = self.client.get(reverse("api:job-list") + "?limit=10").json()

        self.assertEqual(len(body["results"]), 10)
        self.assertEqual(body["count"], 28)
        self.assertTrue(body["has_more"])

        last = self.client.get(reverse("api:job-list") + "?limit=10&offset=20").json()
        self.assertEqual(len(last["results"]), 8)
        self.assertFalse(last["has_more"])

    def test_the_page_size_is_capped(self):
        body = self.client.get(reverse("api:job-list") + "?limit=99999").json()
        self.assertLessEqual(body["limit"], 100)


class JobSuggestionTests(TestCase):
    """Typeahead for the search box."""

    def setUp(self):
        make_job(title="Backend Engineer", company="Kestrel Software",
                 role_category="Engineering")
        make_job(title="Backend Engineer", company="Protea Analytics",
                 role_category="Engineering")
        make_job(title="Product Designer", company="Kestrel Software",
                 role_category="Design")

    def suggest(self, term):
        response = self.client.get(reverse("api:job-suggest"), {"q": term})
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def test_a_single_letter_suggests_nothing(self):
        """Two characters minimum, or the first keystroke scans everything."""
        self.assertEqual(self.suggest("b"), [])

    def test_titles_are_suggested_with_a_count(self):
        hits = [r for r in self.suggest("backend") if r["kind"] == "title"]

        self.assertEqual(len(hits), 1, "the same title twice is one suggestion")
        self.assertEqual(hits[0]["value"], "Backend Engineer")
        self.assertEqual(hits[0]["hint"], "2 jobs")

    def test_companies_and_disciplines_are_suggested_too(self):
        kinds = {r["kind"] for r in self.suggest("kestrel")}
        self.assertIn("company", kinds)

        kinds = {r["kind"] for r in self.suggest("design")}
        self.assertIn("category", kinds)

    def test_draft_and_private_postings_never_surface(self):
        make_job(title="Backend Secret", status=JobStatus.PRIVATE)
        make_job(title="Backend Draft", status=JobStatus.DRAFT)

        values = {r["value"] for r in self.suggest("backend")}

        self.assertNotIn("Backend Secret", values)
        self.assertNotIn("Backend Draft", values)


LINKEDIN_ON = {
    "LINKEDIN_CLIENT_ID": "test-client",
    "LINKEDIN_CLIENT_SECRET": "test-secret",
    "LINKEDIN_REDIRECT_URI": "http://testserver/api/auth/linkedin/callback/",
    "FRONTEND_URL": "http://frontend.test",
}


class LinkedInSignInTests(TestCase):
    """The OpenID Connect round trip, without talking to LinkedIn.

    The token exchange itself is not tested here — that would only assert that
    urllib was called. What matters is that the provider is off without
    credentials, that the state check cannot be skipped, and that an existing
    account is reused rather than duplicated.
    """

    def test_provider_is_off_without_credentials(self):
        with self.settings(LINKEDIN_CLIENT_ID="", LINKEDIN_CLIENT_SECRET=""):
            body = self.client.get(reverse("api:auth-providers")).json()
        self.assertFalse(body["linkedin"])

    def test_provider_is_on_once_configured(self):
        with self.settings(**LINKEDIN_ON):
            body = self.client.get(reverse("api:auth-providers")).json()
        self.assertTrue(body["linkedin"])

    def test_start_refuses_when_unconfigured(self):
        with self.settings(
            LINKEDIN_CLIENT_ID="", LINKEDIN_CLIENT_SECRET="",
            FRONTEND_URL="http://frontend.test",
        ):
            response = self.client.get(reverse("api:auth-linkedin-start"))

        self.assertEqual(response.status_code, 302)
        self.assertIn("error=linkedin_unconfigured", response["Location"])

    def test_start_sends_the_member_to_linkedin_with_state(self):
        with self.settings(**LINKEDIN_ON):
            response = self.client.get(reverse("api:auth-linkedin-start"))

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            response["Location"].startswith(
                "https://www.linkedin.com/oauth/v2/authorization?"
            )
        )
        state = self.client.session["linkedin_oauth_state"]
        self.assertIn(f"state={state}", response["Location"])
        self.assertIn("scope=openid+profile+email", response["Location"])

    def test_callback_rejects_a_state_that_does_not_match(self):
        with self.settings(**LINKEDIN_ON):
            self.client.get(reverse("api:auth-linkedin-start"))
            response = self.client.get(
                reverse("api:auth-linkedin-callback"),
                {"code": "abc", "state": "not-the-one"},
            )

        self.assertIn("error=linkedin_state", response["Location"])

    def test_callback_without_any_state_is_refused(self):
        with self.settings(**LINKEDIN_ON):
            response = self.client.get(
                reverse("api:auth-linkedin-callback"), {"code": "abc", "state": "x"}
            )

        self.assertIn("error=linkedin_state", response["Location"])

    def test_an_open_redirect_cannot_be_smuggled_in(self):
        from .oauth_views import _safe_next

        self.assertEqual(_safe_next("https://evil.test/"), "/portal/profile/complete")
        self.assertEqual(_safe_next("//evil.test/"), "/portal/profile/complete")
        self.assertEqual(_safe_next("/portal/saved"), "/portal/saved")

    def test_an_existing_email_signs_into_that_account(self):
        from .oauth_views import _account_for

        existing = User.objects.create_user(
            username="sam@example.com",
            email="sam@example.com",
            first_name="Sam",
            role=Role.JOB_SEEKER,
        )
        info = {"given_name": "Samantha", "family_name": "Dlamini"}

        user, created = _account_for(info, "sam@example.com")

        self.assertFalse(created)
        self.assertEqual(user.pk, existing.pk)
        self.assertEqual(User.objects.filter(email="sam@example.com").count(), 1)
        # A name already on the account is not overwritten by LinkedIn's.
        self.assertEqual(user.first_name, "Sam")
        # An empty one is filled in.
        self.assertEqual(user.last_name, "Dlamini")

    def test_a_new_member_gets_a_job_seeker_account_with_no_password(self):
        from .oauth_views import _account_for

        user, created = _account_for(
            {"given_name": "Nomsa", "family_name": "Khumalo"}, "nomsa@example.com"
        )

        self.assertTrue(created)
        self.assertEqual(user.role, Role.JOB_SEEKER)
        self.assertFalse(user.has_usable_password())

    def test_linkedin_details_land_in_the_profile_and_count(self):
        """What LinkedIn gives must show up as progress, not sit unused."""
        from .oauth_views import _account_for

        user, _ = _account_for(
            {"given_name": "Thandi", "family_name": "Mabaso"}, "thandi@example.com"
        )
        profile = user.profile

        self.assertEqual(profile.preferred_name, "Thandi")
        # Name and email are three of the eight Personal Details fields.
        self.assertGreater(profile.section_progress["personal_details"], 0)


SAMPLE_CV = """Thandi Mabaso
Johannesburg, South Africa
thandi.mabaso@example.com | +27 83 444 9876
https://www.linkedin.com/in/thandi-mabaso

Professional Summary
Data analyst with six years turning messy operational data into reporting that
managers actually use.

Work Experience

Senior Data Analyst at Protea Analytics        February 2020 - Present
- Owned the executive reporting suite in Power BI.
- Rebuilt the ETL pipeline, cutting the nightly run from six hours to one.

Data Analyst, Northbridge Financial            Jan 2017 - Jan 2020
- Built regulatory reports for the finance team.

Education
BCom in Information Systems
University of the Witwatersrand, 2016

Skills
SQL, Python, Power BI, Excel, dbt, Statistics

Languages
English, Afrikaans, isiZulu
"""


class CvParsingTests(TestCase):
    """The CV parse is what actually fills a profile, so the rules that matter
    are tested on text rather than through a file."""

    def setUp(self):
        from .cv_parse import parse_cv

        self.parsed = parse_cv(SAMPLE_CV)

    def test_contact_details_are_read(self):
        self.assertEqual(self.parsed["name"], "Thandi Mabaso")
        self.assertEqual(self.parsed["email"], "thandi.mabaso@example.com")
        self.assertEqual(self.parsed["phone"], "+27 83 444 9876")
        self.assertEqual(
            self.parsed["linkedin_url"],
            "https://www.linkedin.com/in/thandi-mabaso",
        )

    def test_education_is_read(self):
        row = self.parsed["education"][0]
        self.assertEqual(row["level"], "bachelor")
        self.assertEqual(row["field_of_study"], "Information Systems")
        self.assertEqual(row["institution_name"], "University of the Witwatersrand")
        self.assertEqual(row["graduation_year"], 2016)

    def test_every_role_is_read_with_its_dates_and_bullets(self):
        roles = self.parsed["experience"]
        self.assertEqual(len(roles), 2)

        first = roles[0]
        self.assertEqual(first["job_title"], "Senior Data Analyst")
        self.assertEqual(first["company_name"], "Protea Analytics")
        self.assertEqual(first["start_date"], "2020-02-01")
        self.assertTrue(first["is_current"])
        self.assertIsNone(first["end_date"])
        self.assertEqual(len(first["key_responsibilities"]), 2)

        second = roles[1]
        self.assertEqual(second["company_name"], "Northbridge Financial")
        self.assertFalse(second["is_current"])
        self.assertEqual(second["end_date"], "2020-01-28")

    def test_skills_and_languages_come_back_in_the_form_shape(self):
        names = {s["name"] for s in self.parsed["skills"]}
        self.assertIn("SQL", names)
        self.assertIn("Power BI", names)

        languages = {entry["language"] for entry in self.parsed["languages"]}
        self.assertIn("English", languages)
        self.assertIn("isiZulu", languages)

    def test_education_levels_are_values_the_model_accepts(self):
        from .models import EducationLevel

        allowed = {value for value, _ in EducationLevel.choices}
        self.assertIn(self.parsed["education"][0]["level"], allowed)

    def test_a_field_the_cv_is_silent_on_is_left_out(self):
        """An absent field must not come back empty — that would blank out
        something the candidate had already typed."""
        self.assertNotIn("gender", self.parsed)
        self.assertNotIn("current_salary_amount", self.parsed)

    def test_an_unreadable_file_is_refused_with_a_reason(self):
        from .cv_parse import UnsupportedDocument, extract_text

        with self.assertRaises(UnsupportedDocument):
            extract_text("photo.png", b"\x89PNG\r\n\x1a\n rubbish")
        with self.assertRaises(UnsupportedDocument):
            extract_text("old-cv.doc", b"\xd0\xcf\x11\xe0 rubbish")


class _IsolatedMedia(TestCase):
    """Uploads go to a temporary directory, not the real media root.

    Without this a test run leaves its avatars and CVs in media/ alongside
    real ones, and the files it wrote outlive it.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media = tempfile.mkdtemp(prefix="moc-test-media-")
        cls._override = override_settings(MEDIA_ROOT=cls._media)
        cls._override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        shutil.rmtree(cls._media, ignore_errors=True)
        super().tearDownClass()


class CvUploadEndpointTests(_IsolatedMedia):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cv@example.com",
            email="cv@example.com",
            password="portal-demo",
            role=Role.JOB_SEEKER,
        )

    def post(self, name="cv.txt", body=None):
        from django.core.files.uploadedfile import SimpleUploadedFile

        upload = SimpleUploadedFile(
            name, (body if body is not None else SAMPLE_CV).encode(), "text/plain"
        )
        return self.client.post(
            reverse("api:candidate-cv-upload"), {"cv": upload}
        )

    def test_signing_in_is_required(self):
        self.assertEqual(self.post().status_code, 403)

    def test_a_cv_fills_fields_and_is_stored(self):
        self.client.force_login(self.user)
        response = self.post()

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertGreater(body["fields"], 5)
        self.assertEqual(body["suggestions"]["name"], "Thandi Mabaso")

        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.cv)

    def test_a_file_with_no_readable_text_is_refused(self):
        self.client.force_login(self.user)
        response = self.post(body="too short")

        self.assertEqual(response.status_code, 400)
        self.assertIn("No text", response.json()["detail"])

    def test_posting_nothing_is_a_clear_error(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("api:candidate-cv-upload"), {})

        self.assertEqual(response.status_code, 400)
        self.assertIn("No file", response.json()["detail"])


class JobCreateTests(TestCase):
    """Posting a new job. The gating and the draft/publish split are the parts
    that would hurt if they broke."""

    VALID = {
        "title": "Senior Platform Engineer",
        "role_category": "Engineering",
        "company": "Kestrel Software",
        "description": "Own the platform end to end.",
        "work_setup": "remote",
        "experience_level": "senior",
        "employment_type": "full_time",
    }

    def setUp(self):
        self.manager = User.objects.create_user(
            username="boss@moc-pty.com",
            email="boss@moc-pty.com",
            password="portal-demo",
            role=Role.HIRING_MANAGER,
        )
        self.seeker = User.objects.create_user(
            username="seeker@example.com",
            email="seeker@example.com",
            password="portal-demo",
            role=Role.JOB_SEEKER,
        )

    def post(self, **overrides):
        body = {**self.VALID, **overrides}
        return self.client.post(
            reverse("api:manager-job-create"), body, content_type="application/json"
        )

    def test_anonymous_cannot_post_a_job(self):
        self.assertEqual(self.post().status_code, 403)
        self.assertFalse(Job.objects.filter(title=self.VALID["title"]).exists())

    def test_a_job_seeker_cannot_post_a_job(self):
        self.client.force_login(self.seeker)
        self.assertEqual(self.post().status_code, 403)

    def test_required_fields_are_named_back(self):
        self.client.force_login(self.manager)
        response = self.client.post(
            reverse("api:manager-job-create"),
            {"title": "Only a title"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            set(response.json()["fields"]),
            {"role_category", "company", "description"},
        )

    def test_a_draft_is_not_dated_and_stays_off_the_public_board(self):
        self.client.force_login(self.manager)
        response = self.post(status="draft")

        self.assertEqual(response.status_code, 201)
        job = Job.objects.get(pk=response.json()["id"])
        self.assertEqual(job.status, JobStatus.DRAFT)
        self.assertIsNone(job.posted_at)

        listed = self.client.get(reverse("api:job-list")).json()["results"]
        self.assertNotIn(job.id, [row["id"] for row in listed])

    def test_publishing_dates_the_posting_and_lists_it(self):
        self.client.force_login(self.manager)
        response = self.post(status="active")

        job = Job.objects.get(pk=response.json()["id"])
        self.assertEqual(job.status, JobStatus.ACTIVE)
        self.assertIsNotNone(job.posted_at)
        self.assertEqual(job.created_by, self.manager)

        listed = self.client.get(reverse("api:job-list")).json()["results"]
        self.assertIn(job.id, [row["id"] for row in listed])

    def test_an_unknown_status_falls_back_to_draft(self):
        """A value the model would reject must not reach the database."""
        self.client.force_login(self.manager)
        response = self.post(status="definitely-not-a-status")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Job.objects.get(pk=response.json()["id"]).status,
                         JobStatus.DRAFT)

    def test_lists_and_hours_are_stored(self):
        self.client.force_login(self.manager)
        response = self.post(
            key_responsibilities=["Run the platform", "Mentor the team"],
            required_skills=[{"name": "Go", "level": "required"}],
            advantageous_tools=["Jira"],
            working_hours_start=9,
            working_hours_end=17,
            closes_at="2026-12-01",
        )

        job = Job.objects.get(pk=response.json()["id"])
        self.assertEqual(len(job.key_responsibilities), 2)
        self.assertEqual(job.required_skills[0]["name"], "Go")
        self.assertEqual(job.advantageous_tools, ["Jira"])
        self.assertEqual(job.working_hours_start, 9)
        self.assertEqual(job.working_hours_end, 17)
        self.assertEqual(job.closes_at.date().isoformat(), "2026-12-01")

    def test_a_nonsense_working_hour_is_dropped_not_saved(self):
        self.client.force_login(self.manager)
        response = self.post(working_hours_start="half past nine",
                             working_hours_end=99)

        job = Job.objects.get(pk=response.json()["id"])
        self.assertIsNone(job.working_hours_start)
        self.assertIsNone(job.working_hours_end)


WRAPPED_CV = """Sipho Ndlovu
sipho.ndlovu@example.com

Work Experience

Lead Platform Engineer at Cobalt Freight          June 2021 - Present
- Rebuilt the deployment pipeline on Kubernetes, taking releases from
  fortnightly to several a day.
- On call rotation lead for a team of seven.

DevOps Engineer at Streamline Logistics (Contract)  02/2016 - 02/2018
- Automated provisioning with Terraform.
"""


class CvLayoutTests(TestCase):
    """Two things real CVs do that the first parse got wrong."""

    def setUp(self):
        from .cv_parse import parse_cv

        self.roles = parse_cv(WRAPPED_CV)["experience"]

    def test_a_bullet_wrapped_onto_a_second_line_is_one_bullet(self):
        bullets = self.roles[0]["key_responsibilities"]

        self.assertEqual(len(bullets), 2, bullets)
        self.assertIn("fortnightly to several a day", bullets[0])

    def test_a_parenthetical_type_does_not_become_the_company(self):
        role = self.roles[1]

        self.assertEqual(role["company_name"], "Streamline Logistics")
        self.assertEqual(role["employment_type"], "contract")


class ProfilePhotoTests(_IsolatedMedia):
    """Uploading a profile photo. What matters is that the bytes are proven
    to be an image before they are kept, and that what is stored is a small
    square rather than whatever came off someone's phone."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="photo@example.com",
            email="photo@example.com",
            password="portal-demo",
            role=Role.JOB_SEEKER,
        )

    @staticmethod
    def image(size=(2400, 1200), mode="RGB", fmt="JPEG"):
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        buffer = BytesIO()
        Image.new(mode, size, (12, 75, 112)).save(buffer, format=fmt)
        return SimpleUploadedFile(
            f"avatar.{fmt.lower()}", buffer.getvalue(), f"image/{fmt.lower()}"
        )

    def post(self, upload):
        return self.client.post(
            reverse("api:candidate-photo"), {"photo": upload}
        )

    def test_signing_in_is_required(self):
        self.assertEqual(self.post(self.image()).status_code, 403)

    def test_a_wide_photo_is_stored_as_a_small_square(self):
        from PIL import Image

        self.client.force_login(self.user)
        response = self.post(self.image(size=(2400, 1200)))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["photo_url"].startswith("http"))

        self.user.profile.refresh_from_db()
        with Image.open(self.user.profile.photo) as stored:
            self.assertEqual(stored.size, (512, 512))
            self.assertEqual(stored.mode, "RGB")

    def test_transparency_is_flattened_rather_than_rejected(self):
        self.client.force_login(self.user)
        response = self.post(self.image(size=(300, 300), mode="RGBA", fmt="PNG"))

        self.assertEqual(response.status_code, 200)

    def test_a_file_that_is_not_an_image_is_refused(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_login(self.user)
        response = self.post(
            SimpleUploadedFile("cv.pdf", b"%PDF-1.4 not an image", "image/jpeg")
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("could not be read as an image", response.json()["detail"])
        self.assertFalse(self.user.profile.photo)

    def test_posting_nothing_is_a_clear_error(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("api:candidate-photo"), {})

        self.assertEqual(response.status_code, 400)
        self.assertIn("No image", response.json()["detail"])

    def test_a_photo_can_be_removed_again(self):
        self.client.force_login(self.user)
        self.post(self.image())
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.photo)

        response = self.client.delete(reverse("api:candidate-photo"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["photo_url"], "")
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.photo)


class JobPostingFieldsTests(TestCase):
    """The posting form in the designs asks for more than the job list does.
    These are the fields that were added for it."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="poster@moc-pty.com",
            email="poster@moc-pty.com",
            password="portal-demo",
            role=Role.HIRING_MANAGER,
        )
        self.client.force_login(self.manager)

    def post(self, **extra):
        body = {
            "title": "Management Accountant",
            "role_category": "Accounting and Finance",
            "company": "Northbridge Financial",
            "description": "Own the monthly close.",
            **extra,
        }
        return self.client.post(
            reverse("api:manager-job-create"), body, content_type="application/json"
        )

    def test_every_new_field_round_trips(self):
        response = self.post(
            ideal_start_date="2026-12-01",
            hr_email="hr@northbridge.test",
            hr_phone="+27 21 555 0101",
            candidate_location="Anywhere in South Africa",
            night_shift="no",
            flexible_hours=True,
            citizenship_requirement="citizen",
            language_requirements=[
                {"language": "English", "proficiency": "fluent"}
            ],
            minimum_years_experience=5,
            industry_experience="required",
            education_requirement="bachelor",
            field_of_study="Accounting",
            salary_currency="ZAR",
            salary_min="55000",
            salary_max="72000",
            salary_period="monthly",
            benefits=["medical_aid", "retirement"],
        )

        self.assertEqual(response.status_code, 201)
        job = Job.objects.get(pk=response.json()["id"])

        self.assertEqual(job.ideal_start_date.isoformat(), "2026-12-01")
        self.assertEqual(job.hr_email, "hr@northbridge.test")
        self.assertEqual(job.candidate_location, "Anywhere in South Africa")
        self.assertTrue(job.flexible_hours)
        self.assertEqual(job.citizenship_requirement, "citizen")
        self.assertEqual(len(job.language_requirements), 1)
        self.assertEqual(job.minimum_years_experience, 5)
        self.assertEqual(job.education_requirement, "bachelor")
        self.assertEqual(str(job.salary_min), "55000.00")
        self.assertEqual(job.benefits, ["medical_aid", "retirement"])

    def test_a_salary_that_is_not_a_number_is_dropped(self):
        """Better empty than advertising a job that pays nothing."""
        response = self.post(salary_min="about fifty grand", salary_max="")

        job = Job.objects.get(pk=response.json()["id"])
        self.assertIsNone(job.salary_min)
        self.assertIsNone(job.salary_max)

    def test_an_absurd_year_count_is_dropped(self):
        response = self.post(minimum_years_experience=900)

        self.assertIsNone(
            Job.objects.get(pk=response.json()["id"]).minimum_years_experience
        )

    def test_a_choice_the_model_would_reject_is_ignored(self):
        response = self.post(citizenship_requirement="martian")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            Job.objects.get(pk=response.json()["id"]).citizenship_requirement, ""
        )


BRANDED_CV = """MAGNUM OPUS
C O N S U L T A N T S
careers@moc-pty.com
Prepared by Magnum Opus Consultants (Pty) Ltd · Lynnwood, Pretoria · +27 76 740 1777
Page 1
Ethan Sevenster
Full-stack Engineer
ethansevenster5@gmail.com · +27 82 447 9013 · Pretoria · South Africa
PROFILE
Full-stack engineer with eight years building recruitment platforms.
EXPERIENCE
Senior Software Engineer — Kestrel Software
Mar 2021 – Present · Full-time
· Led the rebuild of the candidate matching engine.
· Owned the AWS infrastructure and the CI/CD pipeline.
Software Engineer — Protea Analytics
Jan 2018 – Feb 2021 · Full-time
· Built internal reporting dashboards in React and TypeScript.
EDUCATION
Honours degree in Computer Science
University of Pretoria · 2017
SKILLS AND TOOLS
Skills: Python, Django, TypeScript
Prepared by Magnum Opus Consultants (Pty) Ltd · Lynnwood, Pretoria · +27 76 740 1777
"""


class BrandedCvReuploadTests(TestCase):
    """A candidate re-uploading the CV we generated for them.

    Not a strange thing to do — it is the document we hand them. Parsed
    naively it filled their profile with MOC's own letterhead.
    """

    def setUp(self):
        from .cv_parse import parse_cv

        self.parsed = parse_cv(BRANDED_CV)

    def test_our_letterhead_is_not_read_as_the_candidate(self):
        self.assertEqual(self.parsed["name"], "Ethan Sevenster")
        self.assertEqual(self.parsed["email"], "ethansevenster5@gmail.com")
        self.assertEqual(self.parsed["phone"], "+27 82 447 9013")

    def test_the_footer_repeat_does_not_swallow_the_document(self):
        """The letterhead line appears twice. Cutting at the last one threw
        away the entire CV."""
        self.assertEqual(len(self.parsed["experience"]), 2)

    def test_a_title_is_split_from_its_company_on_a_middle_dot(self):
        role = self.parsed["experience"][0]

        self.assertEqual(role["job_title"], "Senior Software Engineer")
        self.assertEqual(role["company_name"], "Kestrel Software")

    def test_the_next_role_heading_is_not_a_responsibility(self):
        """Dates sit on their own line here, so the heading fell through to
        the bullet branch and joined the role above it."""
        bullets = self.parsed["experience"][0]["key_responsibilities"]

        self.assertEqual(len(bullets), 2, bullets)
        self.assertNotIn("Protea Analytics", " ".join(bullets))

    def test_the_year_is_not_part_of_the_institution_name(self):
        row = self.parsed["education"][0]

        self.assertEqual(row["institution_name"], "University of Pretoria")
        self.assertEqual(row["graduation_year"], 2017)

    def test_an_education_row_is_complete_enough_for_the_form(self):
        """Every key the form binds to an input must be present, or React
        warns about a controlled input starting undefined."""
        row = self.parsed["education"][0]

        for key in ("level", "field_of_study", "institution_name",
                    "graduation_year", "is_current"):
            self.assertIn(key, row)
        self.assertIs(row["is_current"], False)


class CandidateFilterTests(TestCase):
    """Filtering the candidate database.

    It took one value per group, returned no counts and serialised every
    profile. These cover what replaced that.
    """

    def setUp(self):
        self.manager = User.objects.create_user(
            username="filters@moc-pty.com",
            email="filters@moc-pty.com",
            password="portal-demo",
            role=Role.HIRING_MANAGER,
        )
        self.client.force_login(self.manager)

        make_candidate(
            username="one",
            experience_level=ExperienceLevel.SENIOR,
            preferred_work_setup=WorkSetup.REMOTE,
            role_category="Engineering",
        )
        make_candidate(
            username="two",
            experience_level=ExperienceLevel.JUNIOR,
            preferred_work_setup=WorkSetup.REMOTE,
            role_category="Engineering",
        )
        make_candidate(
            username="three",
            experience_level=ExperienceLevel.SENIOR,
            preferred_work_setup=WorkSetup.OFFICE,
            role_category="Design",
            # Something none of the others carry: every fixture candidate
            # has "Design systems" in their default skills, and search now
            # covers skills as well as the headline.
            headline="Cartographer",
        )

    def get(self, query=""):
        return self.client.get(
            reverse("api:manager-candidates") + query
        ).json()

    def test_a_candidate_cannot_read_the_database(self):
        self.client.force_login(
            User.objects.create_user(
                username="nosy", email="nosy@example.com", role=Role.JOB_SEEKER
            )
        )
        response = self.client.get(reverse("api:manager-candidates"))

        self.assertEqual(response.status_code, 403)

    def test_one_group_takes_several_values(self):
        """Picking Senior and Junior widens that group rather than
        contradicting itself."""
        both = self.get("?experience_level=senior,junior")

        self.assertEqual(both["count"], 3)

    def test_groups_narrow_against_each_other(self):
        self.assertEqual(
            self.get("?experience_level=senior&work_setup=remote")["count"], 1
        )

    def test_each_option_carries_a_count(self):
        facets = self.get()["facets"]

        self.assertEqual(facets["experience_level"]["senior"], 2)
        self.assertEqual(facets["work_setup"]["remote"], 2)

    def test_a_group_counts_itself_as_if_it_were_not_applied(self):
        """Otherwise its own options would all read as the current result,
        and no option could ever widen the list."""
        facets = self.get("?experience_level=senior")["facets"]

        # Junior still shows its full count, so picking it is informed.
        self.assertEqual(facets["experience_level"]["junior"], 1)
        # Work setup is counted with the experience filter applied.
        self.assertEqual(facets["work_setup"]["remote"], 1)

    def test_the_results_are_paged(self):
        page = self.get("?limit=2")

        self.assertEqual(len(page["results"]), 2)
        self.assertEqual(page["count"], 3)
        self.assertTrue(page["has_more"])

        rest = self.get("?limit=2&offset=2")
        self.assertEqual(len(rest["results"]), 1)
        self.assertFalse(rest["has_more"])

    def test_search_covers_the_headline_and_the_skills(self):
        self.assertEqual(self.get("?search=Cartographer")["count"], 1)
        # Every fixture candidate lists "Design systems" as a skill.
        self.assertEqual(self.get("?search=Design systems")["count"], 3)


class BookmarkAndShortlistTests(TestCase):
    """Both buttons existed on the candidate profile with nothing behind
    them. These cover the endpoints that now back them."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="hm@moc-pty.com",
            email="hm@moc-pty.com",
            password="portal-demo",
            role=Role.HIRING_MANAGER,
        )
        self.candidate = make_candidate(username="pickme").user
        self.job = make_job(title="Lead Engineer", created_by=self.manager)
        self.client.force_login(self.manager)

    def bookmark(self):
        return self.client.post(
            reverse("api:manager-candidate-bookmark", args=[self.candidate.id])
        )

    def shortlist(self, **body):
        return self.client.post(
            reverse("api:manager-candidate-shortlist", args=[self.candidate.id]),
            body,
            content_type="application/json",
        )

    def test_a_job_seeker_cannot_bookmark_anyone(self):
        self.client.force_login(self.candidate)

        self.assertEqual(self.bookmark().status_code, 403)
        self.assertEqual(self.shortlist(job_id=self.job.id).status_code, 403)

    def test_bookmarking_toggles(self):
        self.assertIs(self.bookmark().json()["bookmarked"], True)
        self.assertEqual(
            CandidateBookmark.objects.filter(
                manager=self.manager, candidate=self.candidate
            ).count(),
            1,
        )

        self.assertIs(self.bookmark().json()["bookmarked"], False)
        self.assertFalse(CandidateBookmark.objects.exists())

    def test_shortlisting_toggles_against_one_position(self):
        self.assertIs(self.shortlist(job_id=self.job.id).json()["shortlisted"], True)
        self.assertEqual(
            ShortlistEntry.objects.filter(
                job=self.job, candidate=self.candidate
            ).count(),
            1,
        )

        self.assertIs(self.shortlist(job_id=self.job.id).json()["shortlisted"], False)
        self.assertFalse(ShortlistEntry.objects.exists())

    def test_shortlisting_needs_a_position(self):
        """A shortlist belongs to a job, so there is nothing to guess."""
        response = self.shortlist()

        self.assertEqual(response.status_code, 400)
        self.assertIn("which position", response.json()["detail"])

    def test_the_profile_reports_both_states(self):
        self.bookmark()
        self.shortlist(job_id=self.job.id)

        body = self.client.get(
            reverse("api:manager-candidate-detail", args=[self.candidate.id])
        ).json()

        self.assertTrue(body["is_bookmarked"])
        self.assertEqual(body["shortlisted_job_ids"], [self.job.id])

    def test_a_bookmark_is_personal_to_the_manager(self):
        """Another manager opening the same profile sees it unbookmarked."""
        self.bookmark()

        other = User.objects.create_user(
            username="other@moc-pty.com",
            email="other@moc-pty.com",
            role=Role.HIRING_MANAGER,
        )
        self.client.force_login(other)
        body = self.client.get(
            reverse("api:manager-candidate-detail", args=[self.candidate.id])
        ).json()

        self.assertFalse(body["is_bookmarked"])
        # The shortlist, by contrast, belongs to the job and is shared.
        self.assertEqual(body["shortlisted_job_ids"], [])


class JobStatusTransitionTests(TestCase):
    """Taking a posting down.

    Publishing worked; nothing could reverse it. `update` deliberately
    ignores status and `delete` refuses a posting with applicants, telling
    the manager to close it instead — but no close action existed.
    """

    def setUp(self):
        self.manager = User.objects.create_user(
            username="closer@moc-pty.com",
            email="closer@moc-pty.com",
            password="portal-demo",
            role=Role.HIRING_MANAGER,
        )
        self.job = make_job(
            title="Retiring Role", status=JobStatus.ACTIVE, created_by=self.manager
        )
        self.client.force_login(self.manager)

    def act(self, action):
        return self.client.post(
            reverse("api:manager-job-status", args=[self.job.id]),
            {"action": action},
            content_type="application/json",
        )

    def test_a_job_seeker_cannot_close_a_posting(self):
        self.client.force_login(
            User.objects.create_user(
                username="seeker", email="seeker@example.com", role=Role.JOB_SEEKER
            )
        )
        self.assertEqual(self.act("close").status_code, 403)

    def test_closing_takes_it_off_the_public_list(self):
        self.assertEqual(self.act("close").status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, JobStatus.CLOSED)

        listed = self.client.get(reverse("api:job-list")).json()["results"]
        self.assertNotIn(self.job.id, [row["id"] for row in listed])

    def test_pausing_keeps_it_listed(self):
        """Paused is "not taking new applications", not "gone"."""
        self.act("pause")
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, JobStatus.PAUSED)

        listed = self.client.get(reverse("api:job-list")).json()["results"]
        self.assertIn(self.job.id, [row["id"] for row in listed])

    def test_the_posted_date_survives_a_pause_and_reopen(self):
        """"Posted 17 Oct" means when candidates first saw it, not when it
        was last touched."""
        original = self.job.posted_at

        self.act("pause")
        self.client.post(reverse("api:manager-job-publish", args=[self.job.id]))
        self.job.refresh_from_db()

        self.assertEqual(self.job.status, JobStatus.ACTIVE)
        self.assertEqual(self.job.posted_at, original)

    def test_an_unknown_action_is_refused(self):
        response = self.act("explode")

        self.assertEqual(response.status_code, 400)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, JobStatus.ACTIVE)

    def test_repeating_an_action_is_refused(self):
        self.act("close")
        self.assertEqual(self.act("close").status_code, 409)

    def test_the_edit_form_still_cannot_change_the_status(self):
        """A stray value in a long form must not retire a live posting."""
        self.client.post(
            reverse("api:manager-job-update", args=[self.job.id]),
            {"status": "closed", "title": "Retiring Role"},
            content_type="application/json",
        )
        self.job.refresh_from_db()

        self.assertEqual(self.job.status, JobStatus.ACTIVE)
