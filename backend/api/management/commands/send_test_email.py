"""Send one test email through whatever mailer is configured.

Development Plan, Day 4: "check that test emails arrive in the inbox and not
in spam". Run it after changing the mail settings, on the droplet as well as
locally, rather than discovering a broken sender when the first candidate
applies.

    manage.py send_test_email ethan.sevenster@moc-pty.com

Prints the configured sender and the result. It never prints the client
secret: the credentials live in the environment and stay there.
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = "Send a test email to confirm the configured mailer works."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="Where to send the test.")

    def handle(self, *args, **options):
        recipient = options["recipient"]
        sender = settings.DEFAULT_FROM_EMAIL
        mailbox = getattr(settings, "GRAPH_MAILBOX", "")
        backend = (settings.MAILERS or {}).get("default", {}).get("BACKEND", "")

        self.stdout.write(f"Backend:   {backend or 'console (development default)'}")
        self.stdout.write(f"From:      {sender}")
        if mailbox:
            self.stdout.write(f"Mailbox:   {mailbox}")
        self.stdout.write(f"To:        {recipient}")

        if "graph" in backend.lower() and not settings.GRAPH_CLIENT_SECRET:
            raise CommandError(
                "GRAPH_CLIENT_SECRET is not set — the Graph backend cannot "
                "acquire a token. Set it in backend/.env."
            )

        stamp = timezone.now().strftime("%Y-%m-%d %H:%M")
        message = EmailMultiAlternatives(
            subject="MOC Candidate Portal — test email",
            body=(
                "This is a test from the MOC Candidate Portal.\n\n"
                f"Sent {stamp} from {sender}.\n\n"
                "If this reached your inbox and not your spam folder, the "
                "portal's automatic emails will send correctly."
            ),
            from_email=sender,
            to=[recipient],
            # fail_silently off: a broken sender must fail loudly here.
            connection=get_connection(fail_silently=False),
        )
        message.attach_alternative(
            "<p>This is a test from the <strong>MOC Candidate Portal</strong>.</p>"
            f"<p>Sent {stamp} from {sender}.</p>"
            "<p>If this reached your inbox and not your spam folder, the "
            "portal's automatic emails will send correctly.</p>",
            "text/html",
        )

        sent = message.send()
        if not sent:
            raise CommandError("The mailer accepted nothing — nothing was sent.")

        self.stdout.write(self.style.SUCCESS(f"Sent {sent} message to {recipient}."))
