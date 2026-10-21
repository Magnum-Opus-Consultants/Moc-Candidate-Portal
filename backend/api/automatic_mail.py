"""Sending the automatic emails, and keeping a record of what went out.

Development Plan, Day 4: the portal sends the emails the Client supplied when
their events happen, using the wording saved on the edit page. One call site
per event raises a trigger here; this module decides which emails that trigger
fires, fills in the placeholders and sends each from careers@moc-pty.com.

Every attempt is written to EmailLog, successes and failures alike. A send
that fails must never take down the thing that caused it — a candidate's
application is saved whether or not their confirmation email left the
building — so failures are recorded and swallowed, not raised.
"""

from __future__ import annotations

import logging
import re

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection

from .models import AutomaticEmail, EmailLog, EmailTrigger

logger = logging.getLogger(__name__)

# {candidate_name} and friends. Deliberately not Django's template engine:
# the wording is edited by hiring managers in a plain text area, and a stray
# brace in prose should come out as a stray brace, not a TemplateSyntaxError.
PLACEHOLDER = re.compile(r"\{(\w+)\}")


def render(text: str, context: dict) -> str:
    """Fill in {placeholders} from `context`, leaving unknown ones alone.

    An unknown placeholder stays as written rather than becoming an empty
    string, so a typo in the wording is visible in the log instead of
    silently deleting a sentence's subject.
    """

    def swap(match: re.Match) -> str:
        key = match.group(1)
        return str(context[key]) if key in context else match.group(0)

    return PLACEHOLDER.sub(swap, text or "")


def emails_for(trigger: str, context: dict) -> list[AutomaticEmail]:
    """The active emails that should go out for one event."""
    return [
        email
        for email in AutomaticEmail.objects.filter(trigger=trigger, is_active=True)
        if email.matches(context)
    ]


def send_automatic_email(
    trigger: str,
    recipient: str,
    context: dict,
    *,
    about: str = "",
) -> int:
    """Send every email configured for `trigger`. Returns how many went out.

    `context` supplies the placeholder values and is also what conditions are
    matched against, so {"status": "shortlisted"} both fills in the wording
    and decides whether a stage-specific email applies.
    """
    if not recipient:
        return 0

    sent = 0
    for email in emails_for(trigger, context):
        subject = render(email.subject, context)
        body = render(email.body, context)

        log = EmailLog(
            template=email,
            trigger=trigger,
            recipient=recipient,
            subject=subject,
            body=body,
            about=about,
        )
        try:
            message = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[recipient],
                connection=get_connection(fail_silently=False),
            )
            message.attach_alternative(_as_html(body), "text/html")
            message.send()
        except Exception as exc:  # noqa: BLE001 — see the module docstring
            log.status = EmailLog.Status.FAILED
            log.error = str(exc)[:1000]
            logger.warning("Automatic email %s failed: %s", email.event, exc)
        else:
            log.status = EmailLog.Status.SENT
            sent += 1
        log.save()

    return sent


def _as_html(body: str) -> str:
    """The plain wording as simple HTML, one paragraph per blank line."""
    from django.utils.html import escape

    paragraphs = [block.strip() for block in (body or "").split("\n\n") if block.strip()]
    return "".join(
        f"<p>{escape(block).replace(chr(10), '<br />')}</p>" for block in paragraphs
    )


__all__ = ["EmailTrigger", "send_automatic_email", "emails_for", "render"]
