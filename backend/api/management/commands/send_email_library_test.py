"""Send one of every automatic email to a single address, to read them.

The thirteen templates are only proved by looking at them: that the
placeholders fill, that the links point somewhere, that the wording reads
the way it was written. This sends each one through the real send path —
same rendering, same sanitising, same log — so what lands in the inbox is
what a candidate would get.

    manage.py send_email_library_test --to someone@moc-pty.com

Every message is prefixed [TEST] in the subject, because thirteen emails
arriving at once from a careers portal should not be mistakable for the
real thing.
"""

from django.core.management.base import BaseCommand, CommandError

from api.automatic_mail import context_for, deliver
from api.models import AutomaticEmail, Job, User

# Values for placeholders that have no object behind them in a dry run.
EXTRA = {
    "provider": "social",
    "provider_label": "Google",
    "missing_sections": "- Education\n- Skills & tools\n- Remuneration & benefits",
    "verify_url": "https://careers.demo.moc-pty.com/api/auth/verify/SAMPLE/TOKEN/",
    "reset_url": "https://careers.demo.moc-pty.com/reset-password?uid=SAMPLE&token=TOKEN",
}


class Command(BaseCommand):
    help = "Send every automatic email to one address, for review."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Where to send them.")
        parser.add_argument(
            "--event",
            help="Send only this one, by event key (e.g. welcome_verify_email).",
        )
        parser.add_argument(
            "--no-prefix",
            action="store_true",
            help="Leave the subjects exactly as written, with no [TEST].",
        )

    def handle(self, *args, **options):
        recipient = options["to"]
        only = options.get("event")
        prefix = not options["no_prefix"]

        emails = AutomaticEmail.objects.filter(is_active=True).order_by("label")
        if only:
            emails = emails.filter(event=only)
        if not emails.exists():
            raise CommandError("No active emails match that.")

        # Real rows, so the placeholders fill with something that looks
        # like an email rather than with the word "placeholder".
        user = (
            User.objects.filter(email__iexact=recipient).first()
            or User.objects.filter(profile__isnull=False).first()
        )
        job = Job.objects.filter(status="active").first()
        if user is None or job is None:
            raise CommandError(
                "Needs at least one candidate profile and one active job to "
                "fill the placeholders. Run `manage.py seed` first."
            )

        self.stdout.write(f"Sending {emails.count()} emails to {recipient}\n")

        sent = failed = 0
        for email in emails:
            context = context_for(user=user, job=job, **EXTRA)
            # Conditions are matched against the context, but here the
            # template is already chosen, so nothing has to match.
            context.setdefault("status", "shortlisted")
            context.setdefault("status_label", "Shortlisted")

            original = email.subject
            if prefix:
                email.subject = f"[TEST] {original}"

            ok = deliver(email, recipient, context, about="Email library test")
            email.subject = original

            if ok:
                sent += 1
                self.stdout.write(self.style.SUCCESS(f"  sent     {email.label}"))
            else:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  FAILED   {email.label}"))

        self.stdout.write("")
        style = self.style.SUCCESS if failed == 0 else self.style.WARNING
        self.stdout.write(style(f"{sent} sent, {failed} failed."))
        if failed:
            self.stdout.write(
                "Reasons are on each EmailLog row, and in the Sent tab of the "
                "portal's Automatic emails page."
            )
