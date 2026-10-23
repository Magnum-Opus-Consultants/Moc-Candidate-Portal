"""Load the Client's automated email library into the portal.

Idempotent and non-destructive by default: an email a hiring manager has
since edited in the portal is left alone, because the library is the
starting wording, not the final say. --reset overwrites them back to the
supplied text.
"""

from django.core.management.base import BaseCommand

from api.email_library import LIBRARY
from api.models import AutomaticEmail


class Command(BaseCommand):
    help = "Seed or refresh the 13 supplied automated email templates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Overwrite existing wording with the supplied text.",
        )

    def handle(self, *args, **options):
        reset = options["reset"]
        created = updated = skipped = 0

        for entry in LIBRARY:
            fields = {
                "label": entry["label"],
                "trigger": entry["trigger"],
                "conditions": entry["conditions"],
                "subject": entry["subject"],
                "preheader": entry["preheader"],
                "body": entry["body"],
            }
            email, was_created = AutomaticEmail.objects.get_or_create(
                event=entry["event"], defaults=fields
            )
            if was_created:
                created += 1
                continue
            if not reset:
                skipped += 1
                continue
            for key, value in fields.items():
                setattr(email, key, value)
            email.save(update_fields=list(fields))
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Email library: {created} created, {updated} updated, "
                f"{skipped} left as edited."
            )
        )
