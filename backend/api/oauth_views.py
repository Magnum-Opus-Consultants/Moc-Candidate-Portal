"""Sign In with LinkedIn, using OpenID Connect.

What this can and cannot do, so the limit is written down rather than
rediscovered: LinkedIn's public product grants the scopes ``openid profile
email`` only. The userinfo endpoint returns the member's name, email address
and profile picture — nothing else. It does **not** return work history,
education, skills or a CV; those sit behind partner-only programmes LinkedIn
does not grant on request. So this saves a new candidate typing their name and
email and gives them a photo, and the rest of the profile is still filled in by
hand or parsed from an uploaded CV.

The flow is the standard authorisation-code exchange:

    /api/auth/linkedin/start/     -> redirect to LinkedIn
    /api/auth/linkedin/callback/  -> exchange code, sign in, redirect back

Credentials live in .env (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET). With
none configured the provider reports itself off and the buttons are hidden,
rather than sending anyone to a broken LinkedIn page.
"""

import json
import logging
import secrets
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.contrib.auth import login
from django.core.files.base import ContentFile
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.http import require_http_methods

from .models import CandidateProfile, Role, User

logger = logging.getLogger(__name__)

AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization"
TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

SCOPES = "openid profile email"
STATE_KEY = "linkedin_oauth_state"
NEXT_KEY = "linkedin_oauth_next"
TIMEOUT = 10

MODEL_BACKEND = "django.contrib.auth.backends.ModelBackend"

# Where a successful sign-in lands when the caller asked for nothing specific.
# A LinkedIn sign-up has only a name and an email, so the profile flow is the
# useful destination rather than an empty dashboard.
DEFAULT_NEXT = "/portal/profile/complete"


def linkedin_configured() -> bool:
    return bool(settings.LINKEDIN_CLIENT_ID and settings.LINKEDIN_CLIENT_SECRET)


@require_http_methods(["GET"])
def providers(request):
    """Which external sign-in buttons the front end should show."""
    return JsonResponse({"linkedin": linkedin_configured()})


def _safe_next(value: str | None) -> str:
    """Only same-site paths. An attacker-supplied absolute URL here would turn
    sign-in into an open redirect."""
    if value and value.startswith("/") and not value.startswith("//"):
        return value
    return DEFAULT_NEXT


def _frontend(path: str) -> str:
    return f"{settings.FRONTEND_URL}{path}"


def _fail(reason: str, detail: str = "") -> HttpResponseRedirect:
    """Back to sign-up with a reason, so the page can explain itself. The
    detail is logged rather than shown — it can carry provider internals."""
    if detail:
        logger.warning("LinkedIn sign-in failed (%s): %s", reason, detail)
    return HttpResponseRedirect(
        _frontend(f"/signup?{urllib.parse.urlencode({'error': reason})}")
    )


@require_http_methods(["GET"])
def linkedin_start(request):
    """Send the member to LinkedIn to approve the request."""
    if not linkedin_configured():
        return _fail("linkedin_unconfigured")

    # A one-shot random value echoed back by LinkedIn and compared on return:
    # without it a third party could feed us their own authorisation code.
    state = secrets.token_urlsafe(24)
    request.session[STATE_KEY] = state
    request.session[NEXT_KEY] = _safe_next(request.GET.get("next"))

    query = urllib.parse.urlencode(
        {
            "response_type": "code",
            "client_id": settings.LINKEDIN_CLIENT_ID,
            "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
            "state": state,
            "scope": SCOPES,
        }
    )
    return HttpResponseRedirect(f"{AUTHORIZE_URL}?{query}")


def _post_form(url: str, fields: dict) -> dict:
    body = urllib.parse.urlencode(fields).encode()
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode())


def _get_json(url: str, token: str) -> dict:
    request = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode())


@require_http_methods(["GET"])
def linkedin_callback(request):
    """Exchange the code for the member's details and sign them in."""
    if not linkedin_configured():
        return _fail("linkedin_unconfigured")

    # The member pressed Cancel on LinkedIn's consent screen.
    if request.GET.get("error"):
        return _fail("linkedin_denied", request.GET.get("error_description", ""))

    expected = request.session.pop(STATE_KEY, None)
    next_path = request.session.pop(NEXT_KEY, DEFAULT_NEXT)
    state = request.GET.get("state")
    if not expected or not state or not secrets.compare_digest(state, expected):
        return _fail("linkedin_state")

    code = request.GET.get("code")
    if not code:
        return _fail("linkedin_no_code")

    try:
        token = _post_form(
            TOKEN_URL,
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
        ).get("access_token")
        if not token:
            return _fail("linkedin_no_token")
        info = _get_json(USERINFO_URL, token)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        return _fail("linkedin_unreachable", str(exc))

    email = (info.get("email") or "").strip().lower()
    if not email:
        # Possible if the member never verified an address on LinkedIn. The
        # account is keyed on email, so there is nothing to attach them to.
        return _fail("linkedin_no_email")

    user, created = _account_for(info, email)
    login(request, user, backend=MODEL_BACKEND)

    # An existing account goes to its own home; a brand new one goes on to
    # build a profile.
    if not created:
        next_path = "/manager" if user.role == Role.HIRING_MANAGER else "/portal"
    return HttpResponseRedirect(_frontend(next_path))


def _account_for(info: dict, email: str) -> tuple[User, bool]:
    """Find the account for this LinkedIn member, or create one.

    Matched on email: someone who signed up with a password and later uses the
    LinkedIn button is the same person, and should land in the same account
    rather than a duplicate.
    """
    first = (info.get("given_name") or "").strip()
    last = (info.get("family_name") or "").strip()

    user = User.objects.filter(email__iexact=email).first()
    if user is not None:
        # Fill gaps only — never overwrite a name the member has already set
        # here with whatever LinkedIn holds.
        changed = False
        if first and not user.first_name:
            user.first_name, changed = first, True
        if last and not user.last_name:
            user.last_name, changed = last, True
        if changed:
            user.save(update_fields=["first_name", "last_name"])
        _fill_profile(user, info)
        return user, False

    user = User.objects.create_user(
        username=email,
        email=email,
        first_name=first,
        last_name=last,
        role=Role.JOB_SEEKER,
    )
    # No usable password: this account signs in through LinkedIn until the
    # member sets one in account settings.
    user.set_unusable_password()
    user.save(update_fields=["password"])
    _fill_profile(user, info)

    from .auth_views import send_welcome_email

    send_welcome_email(user)
    return user, True


def _fill_profile(user: User, info: dict) -> None:
    """Put what LinkedIn gave us into the candidate profile.

    Only the three things the OIDC scopes carry — first name, surname and
    picture. Without this the name sat on the User row alone and Personal
    Details still read 0%, which looked like the sign-in had done nothing.
    Section progress is recomputed here for the same reason: it is derived on
    save, and a LinkedIn sign-in is a save the seeker never made.
    """
    from .views import _recompute_sections

    profile, _ = CandidateProfile.objects.get_or_create(user=user)

    # A first name is the closest thing LinkedIn gives to a preferred name,
    # and only when the seeker has not set one themselves.
    given = (info.get("given_name") or "").strip()
    if given and not profile.preferred_name:
        profile.preferred_name = given

    _store_photo(profile, info.get("picture"))
    _recompute_sections(profile, user)
    profile.save()


def _store_photo(profile: CandidateProfile, url: str | None) -> None:
    """Best effort. A missing picture is not a reason to fail a sign-in."""
    if not url or profile.photo:
        return
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as response:
            data = response.read(5 * 1024 * 1024)
        profile.photo.save(
            f"linkedin-{profile.user_id}.jpg", ContentFile(data), save=False
        )
    except Exception as exc:  # noqa: BLE001 - never fatal
        logger.warning(
            "Could not fetch LinkedIn picture for user %s: %s", profile.user_id, exc
        )
