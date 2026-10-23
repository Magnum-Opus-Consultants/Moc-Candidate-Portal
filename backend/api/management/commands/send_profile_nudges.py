"""Nudge job seekers whose profile is still unfinished.

A scheduled job rather than a trigger, because "the profile is incomplete"
is a state, not an event — there is no moment to hang it on. Run it from
cron or a scheduled task; once a week is plenty.

Three guards, so a nudge is a reminder rather than nagging:

- only profiles below 80%, since at 80% the CV unlocks and the Client's
  other email covers it;
- only profiles with something on them, because somebody who signed up and
  typed nothing gets the welcome email instead;
- never twice inside --cooldown days, checked against the send log.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.automatic_mail import context_for, send_automatic_email
from api.models import CandidateProfile, EmailLog, EmailTrigger, PROFILE_SECTIONS


class Command(BaseCommand):
    help = "Email job seekers whose profile is still incomplete."

    def add_arguments(self, parser):
        parser.add_argument("--cooldown", type=int, default=14)
        parser.add_argument("--min-completion", type=int, default=10)
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report who would be emailed without sending anything.",
        )

    def handle(self, *args, **options):
        cooldown = timezone.now() - timedelta(days=options["cooldown"])
        floor = options["min_completion"]
        dry = options["dry_run"]

        recently = set(
            EmailLog.objects.filter(
                trigger=EmailTrigger.PROFILE_INCOMPLETE, created_at__gte=cooldown
            ).values_list("recipient", flat=True)
        )

        sent = skipped = 0
        for profile in CandidateProfile.objects.select_related("user"):
            user = profile.user
            if not user.is_active or not user.email:
                continue
            completion = profile.completion
            if completion >= 80 or completion < floor:
                continue
            if user.email in recently:
                skipped += 1
                continue

            missing = _missing_sections(profile)
            if not missing:
                continue

            if dry:
                self.stdout.write(f"  would email {user.email} ({completion}%)")
            else:
                send_automatic_email(
                    EmailTrigger.PROFILE_INCOMPLETE,
                    user.email,
                    context_for(user=user, missing_sections=missing),
                )
            sent += 1

        verb = "would send" if dry else "sent"
        self.stdout.write(
            self.style.SUCCESS(
                f"Profile nudges: {verb} {sent}, {skipped} still in cooldown."
            )
        )


def _missing_sections(profile: CandidateProfile) -> str:
    """The unfinished sections as a readable list.

    The Client's note asks for actual section names rather than an empty
    placeholder, so this reads the saved progress and names what is left.
    """
    progress = profile.section_progress or {}
    names = [
        label
        for slug, label in PROFILE_SECTIONS
        if progress.get(slug, 0) < 100
    ]
    return "\n".join(f"- {name}" for name in names)
