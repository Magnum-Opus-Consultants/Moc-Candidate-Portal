from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .matching import score_match
from .models import (
    Application,
    ApplicationStatus,
    CandidateProfile,
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
            {"label": "Role category", "level": "match"}, result.reasons
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

        self.assertEqual(result.score, 5)
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

        response = self.client.get(
            reverse("api:manager-job-detail", args=[job.id])
        )

        self.assertEqual(response.status_code, 200)
        tabs = response.json()["tabs"]
        self.assertEqual(len(tabs["all"]), 1)
        self.assertEqual(len(tabs["shortlisted"]), 1)
        self.assertEqual(len(tabs["suggested"]), 1)
        self.assertEqual(tabs["suggested"][0]["match"]["score"], 100)


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
