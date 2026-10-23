"""Verifying an address, resetting a password, and moving an application.

A module of its own rather than more of tests.py: these three flows were
added together for the Client's email library, and keeping them here makes
it obvious what covers them.
"""

import json

from django.contrib.auth.tokens import default_token_generator
from django.test import TestCase
from django.urls import reverse

from .models import (
    Application,
    ApplicationStatus,
    JobStatus,
    Role,
    User,
)
from .tests import make_candidate, make_job
from .tokens import encode_uid, verification_token


class EmailVerificationTests(TestCase):
    """Proving an address, and the one-shot link that does it."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="verify@example.com",
            email="verify@example.com",
            password="correct-horse-battery",
            role=Role.JOB_SEEKER,
        )

    def _link(self, user):
        return reverse(
            "api:auth-verify",
            args=[encode_uid(user), verification_token.make_token(user)],
        )

    def test_a_valid_link_verifies_the_address(self):
        response = self.client.get(self._link(self.user))

        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)
        self.assertIn("verify=ok", response["Location"])

    def test_a_link_cannot_be_used_twice(self):
        """The hash includes email_verified, so success kills the link."""
        link = self._link(self.user)
        self.client.get(link)

        response = self.client.get(link)

        self.assertIn("verify=expired", response["Location"])

    def test_a_tampered_token_is_refused(self):
        response = self.client.get(
            reverse("api:auth-verify", args=[encode_uid(self.user), "not-a-token"])
        )

        self.user.refresh_from_db()
        self.assertFalse(self.user.email_verified)
        self.assertIn("verify=invalid", response["Location"])

    def test_resend_answers_the_same_for_an_unknown_address(self):
        """Confirming which addresses have accounts hands a stranger a list
        of who has been job hunting."""
        known = self.client.post(
            reverse("api:auth-verify-resend"),
            data=json.dumps({"email": "verify@example.com"}),
            content_type="application/json",
        )
        unknown = self.client.post(
            reverse("api:auth-verify-resend"),
            data=json.dumps({"email": "nobody@example.com"}),
            content_type="application/json",
        )

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.json(), unknown.json())


class PasswordResetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reset@example.com",
            email="reset@example.com",
            password="the-old-password",
            role=Role.JOB_SEEKER,
        )

    def _confirm(self, **overrides):
        payload = {
            "uid": encode_uid(self.user),
            "token": default_token_generator.make_token(self.user),
            "new_password": "a-brand-new-password",
        }
        payload.update(overrides)
        return self.client.post(
            reverse("api:auth-password-reset-confirm"),
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_a_reset_sets_the_new_password(self):
        response = self._confirm()

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("a-brand-new-password"))

    def test_a_reset_also_proves_the_address(self):
        """The link only reached them because the mailbox is theirs."""
        self._confirm()

        self.user.refresh_from_db()
        self.assertTrue(self.user.email_verified)

    def test_a_link_cannot_be_used_twice(self):
        token = default_token_generator.make_token(self.user)
        self._confirm(token=token)

        again = self._confirm(token=token)

        self.assertEqual(again.status_code, 400)

    def test_a_short_password_is_refused(self):
        response = self._confirm(new_password="short")

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("the-old-password"))

    def test_requesting_answers_the_same_for_an_unknown_address(self):
        known = self.client.post(
            reverse("api:auth-password-reset"),
            data=json.dumps({"email": "reset@example.com"}),
            content_type="application/json",
        )
        unknown = self.client.post(
            reverse("api:auth-password-reset"),
            data=json.dumps({"email": "nobody@example.com"}),
            content_type="application/json",
        )

        self.assertEqual(known.json(), unknown.json())


class ApplicationStatusTests(TestCase):
    """Moving an application, and the email that rides on the transition."""

    def setUp(self):
        self.manager = User.objects.create_user(
            username="mover", role=Role.HIRING_MANAGER
        )
        self.profile = make_candidate(username="moved@example.com")
        self.profile.user.email = "moved@example.com"
        self.profile.user.save(update_fields=["email"])
        self.job = make_job(title="Moved Role", status=JobStatus.ACTIVE)
        self.application = Application.objects.create(
            job=self.job, candidate=self.profile.user
        )
        self.url = reverse("api:manager-application-status", args=[self.application.id])
        self.client.force_login(self.manager)

    def _post(self, status):
        return self.client.post(
            self.url,
            data=json.dumps({"status": status}),
            content_type="application/json",
        )

    def test_a_status_change_is_saved_and_recorded(self):
        response = self._post(ApplicationStatus.SHORTLISTED)

        self.assertEqual(response.status_code, 200)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, ApplicationStatus.SHORTLISTED)
        self.assertTrue(
            self.application.events.filter(
                from_status=ApplicationStatus.APPLIED,
                to_status=ApplicationStatus.SHORTLISTED,
            ).exists()
        )

    def test_repeating_a_status_changes_nothing(self):
        """The email rides on the saved transition, so a double-click must
        not tell a candidate twice that they have been shortlisted."""
        self._post(ApplicationStatus.SHORTLISTED)
        before = self.application.events.count()

        self._post(ApplicationStatus.SHORTLISTED)

        self.assertEqual(self.application.events.count(), before)

    def test_an_unknown_status_is_refused(self):
        response = self._post("promoted")

        self.assertEqual(response.status_code, 400)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, ApplicationStatus.APPLIED)

    def test_a_job_seeker_cannot_move_an_application(self):
        self.client.force_login(self.profile.user)

        response = self._post(ApplicationStatus.SHORTLISTED)

        # 403, not 401: the view raises NotAuthenticated, and DRF turns that
        # into 403 when the request *is* authenticated but by the wrong kind
        # of account — there is no credential to go and fetch.
        self.assertEqual(response.status_code, 403)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, ApplicationStatus.APPLIED)
