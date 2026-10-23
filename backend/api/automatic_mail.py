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
from django.utils.html import escape
from django.utils import timezone

from .html_sanitize import html_to_text, sanitize_html
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


def _date(value) -> str:
    """dd/mm/yyyy, as the Client's implementation notes require."""
    if not value:
        return ""
    return value.strftime("%d/%m/%Y")


def _portal(path: str) -> str:
    base = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    return f"{base}{path}"


def context_for(user=None, job=None, application=None, **extra) -> dict:
    """Every placeholder the Client's email library can use, in one place.

    Built centrally rather than at each call site: thirteen templates draw
    on the same handful of facts, and a context assembled per call is how
    one email ends up rendering "{job_reference}" to a candidate because
    that one site forgot it.

    Unknown placeholders are left as written by `render`, so a template
    naming something not supplied is visible in the log rather than
    silently losing a line.
    """
    context: dict = {}

    if user is not None:
        profile = getattr(user, "profile", None)
        # Preferred name, falling back to first name, then to something
        # that still reads as a greeting rather than "Hi ,".
        preferred = (getattr(profile, "preferred_name", "") or "").strip()
        context.update(
            {
                "preferred_name": preferred or user.first_name or "there",
                "first_name": user.first_name or "",
                "candidate_name": user.display_name,
                "email": user.email,
                "profile_url": _portal("/portal/profile"),
                "signin_url": _portal("/signin"),
                "cv_url": _portal("/portal/profile"),
            }
        )
        if profile is not None:
            context.update(
                {
                    "profile_percentage": profile.completion,
                    "profile_status": profile.get_profile_status_display()
                    if profile.profile_status
                    else "Getting started",
                }
            )

    if job is not None:
        context.update(
            {
                "job_title": job.title,
                "company": job.company,
                # No separate reference field on a posting, so the id is the
                # reference a candidate can quote back to us.
                "job_reference": f"MOC-{job.id}",
                # The *_label fields the front end reads are built by the
                # serializer; on the model itself these are the display
                # methods, so take them from the source rather than
                # serialising a whole posting to format one email.
                "employment_type": job.get_employment_type_display(),
                "work_setup": job.get_work_setup_display(),
                "working_hours": job.working_hours_label or "To be confirmed",
                "employer_timezone": job.timezone_label or "To be confirmed",
                "closing_date": _date(job.closes_at),
                "job_url": _portal(f"/jobs/{job.id}"),
            }
        )

    if application is not None:
        context.update(
            {
                "application_url": _portal("/portal/applications"),
                "status": application.status,
                "status_label": application.get_status_display(),
            }
        )

    context.setdefault("date", _date(timezone.now().date()))
    context.update(extra)
    return context


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
        if deliver(email, recipient, context, trigger=trigger, about=about):
            sent += 1
    return sent


def deliver(
    email: AutomaticEmail,
    recipient: str,
    context: dict,
    *,
    trigger: str = "",
    about: str = "",
) -> bool:
    """Render and send one email, logging the attempt. True if it went.

    Split out of send_automatic_email so one template can be sent on its
    own — which is what the test command does, and what a "send me a
    sample" button would do. The trigger path is the same code, so a
    sample exercises exactly what a candidate receives rather than a
    parallel implementation of it.
    """
    subject = render(email.subject, context)
    body = render(email.body, context)
    # The copy kept in the log is what a person would read, so an HTML
    # body is logged as its text. The markup is reconstructed for the HTML
    # part only.
    text_body = _buttons_as_text(
        html_to_text(body) if email.body_is_html else body
    )

    log = EmailLog(
        template=email,
        trigger=trigger or email.trigger,
        recipient=recipient,
        subject=subject,
        body=text_body,
        about=about,
    )
    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
            connection=get_connection(fail_silently=False),
        )
        message.attach_alternative(_as_html(body, email.body_is_html), "text/html")
        message.send()
    except Exception as exc:  # noqa: BLE001 — see the module docstring
        log.status = EmailLog.Status.FAILED
        log.error = str(exc)[:1000]
        logger.warning("Automatic email %s failed: %s", email.event, exc)
        log.save()
        return False

    log.status = EmailLog.Status.SENT
    log.save()
    return True


# The Client's library writes its call to action as [Label](url). That is
# the right thing to type into a plain textarea, and the wrong thing to
# put in somebody's inbox — unconverted it arrives as literal brackets
# with a raw URL beside them.
CTA = re.compile(r"\[([^\]\n]{1,80})\]\(\s*([^)\s]+)\s*\)")

# Inline-block, so the button is valid inside a paragraph. Table-free and
# style-attribute only, because that is what mail clients agree on.
BUTTON = (
    '<a href="{href}" '
    'style="display:inline-block;background:#054b70;color:#ffffff;'
    "text-decoration:none;padding:11px 20px;border-radius:8px;"
    'font-weight:600;margin:6px 0">{label}</a>'
)


def _buttons(markup: str) -> str:
    """Turn [Label](url) into a branded button."""

    def swap(match: re.Match) -> str:
        label, href = match.group(1), match.group(2)
        if not href.lower().startswith(("http://", "https://", "mailto:", "tel:")):
            # Not a link we can safely make clickable — leave the words.
            return label
        return BUTTON.format(href=escape(href), label=label)

    return CTA.sub(swap, markup)


def _buttons_as_text(body: str) -> str:
    """The same calls to action, readable in the plain-text part."""
    return CTA.sub(lambda m: f"{m.group(1)}: {m.group(2)}", body)


def _as_html(body: str, is_html: bool = False) -> str:
    """The HTML part of the email.

    A body written in the rich editor is already markup and is sanitised
    rather than escaped — see html_sanitize for what survives. A body
    still in the Client's supplied plain text becomes one paragraph per
    blank line, which is what it was written for.
    """
    if is_html:
        # The rich editor makes real links, but wording carried over from
        # the supplied library can still hold the bracket form.
        return _buttons(sanitize_html(body))

    paragraphs = [block.strip() for block in (body or "").split("\n\n") if block.strip()]
    return "".join(
        f"<p>{_buttons(escape(block).replace(chr(10), '<br />'))}</p>"
        for block in paragraphs
    )


__all__ = [
    "EmailTrigger",
    "send_automatic_email",
    "deliver",
    "emails_for",
    "render",
    "context_for",
]
