"""Sign in with LinkedIn and with Google, both over OpenID Connect.

The two are the same flow with different endpoints, so they share everything
below the provider constants:

    /api/auth/<provider>/start/     -> redirect to the provider
    /api/auth/<provider>/callback/  -> exchange code, sign in, redirect back

What each one can give us, written down rather than rediscovered:

**LinkedIn** grants the scopes ``openid profile email`` only. Userinfo returns
name, email address and picture — nothing else. It does *not* return work
history, education, skills or a CV; those sit behind partner-only programmes
LinkedIn does not grant on request. So it saves a new candidate typing their
name and email, and the rest of the profile is filled in by hand or parsed
from an uploaded CV.

**Google** grants the same three scopes and returns the same three things,
reliably including a picture. Deliberately nothing more: asking for anything
beyond ``openid email profile`` would put the app into Google's verification
review, which is weeks of delay for data the portal does not use. No API needs
enabling in the Cloud console either — sign-in is not a Google API.

Credentials live in .env. With none configured a provider reports itself off
and its button is hidden, rather than sending anyone to a broken page.
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

LINKEDIN_AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

SCOPES = "openid profile email"
TIMEOUT = 10

MODEL_BACKEND = "django.contrib.auth.backends.ModelBackend"

# Where a successful sign-in lands when the caller asked for nothing specific.
# A social sign-up carries only a name and an email, so the profile flow is the
# useful destination rather than an empty dashboard.
DEFAULT_NEXT = "/portal/profile/complete"


class Provider:
    """One OIDC provider's endpoints, credentials and session keys.

    A class rather than two near-identical modules: the flow is genuinely the
    same, and the only honest difference is the four values below. Keeping it
    in one place means a fix to the state check or the account matching
    applies to both, instead of to whichever one someone remembered.
    """

    def __init__(self, name, label, authorize_url, token_url, userinfo_url):
        self.name = name
        self.label = label
        self.authorize_url = authorize_url
        self.token_url = token_url
        self.userinfo_url = userinfo_url
        self.state_key = f"{name}_oauth_state"
        self.next_key = f"{name}_oauth_next"

    @property
    def client_id(self) -> str:
        return getattr(settings, f"{self.name.upper()}_CLIENT_ID", "")

    @property
    def client_secret(self) -> str:
        return getattr(settings, f"{self.name.upper()}_CLIENT_SECRET", "")

    @property
    def redirect_uri(self) -> str:
        return getattr(settings, f"{self.name.upper()}_REDIRECT_URI", "")

    @property
    def configured(self) -> bool:
        return bool(self.client_id and self.client_secret)


LINKEDIN = Provider(
    "linkedin",
    "LinkedIn",
    LINKEDIN_AUTHORIZE_URL,
    LINKEDIN_TOKEN_URL,
    LINKEDIN_USERINFO_URL,
)

GOOGLE = Provider(
    "google",
    "Google",
    GOOGLE_AUTHORIZE_URL,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
)


def linkedin_configured() -> bool:
    return LINKEDIN.configured


def google_configured() -> bool:
    return GOOGLE.configured


@require_http_methods(["GET"])
def providers(request):
    """Which external sign-in buttons the front end should show."""
    return JsonResponse(
        {"linkedin": LINKEDIN.configured, "google": GOOGLE.configured}
    )


def _safe_next(value: str | None) -> str:
    """Only same-site paths. An attacker-supplied absolute URL here would turn
    sign-in into an open redirect."""
    if value and value.startswith("/") and not value.startswith("//"):
        return value
    return DEFAULT_NEXT


def _frontend(path: str) -> str:
    return f"{settings.FRONTEND_URL}{path}"


def _fail(provider: Provider, reason: str, detail: str = "") -> HttpResponseRedirect:
    """Back to sign-up with a reason, so the page can explain itself. The
    detail is logged rather than shown — it can carry provider internals."""
    if detail:
        logger.warning("%s sign-in failed (%s): %s", provider.label, reason, detail)
    return HttpResponseRedirect(
        _frontend(f"/signup?{urllib.parse.urlencode({'error': reason})}")
    )


def _start(request, provider: Provider):
    """Send the visitor to the provider to approve the request."""
    if not provider.configured:
        return _fail(provider, f"{provider.name}_unconfigured")

    # A one-shot random value echoed back by the provider and compared on
    # return: without it a third party could feed us their own authorisation
    # code.
    state = secrets.token_urlsafe(24)
    request.session[provider.state_key] = state
    request.session[provider.next_key] = _safe_next(request.GET.get("next"))

    params = {
        "response_type": "code",
        "client_id": provider.client_id,
        "redirect_uri": provider.redirect_uri,
        "state": state,
        "scope": SCOPES,
    }
    if provider is GOOGLE:
        # Google remembers a previous approval and would otherwise sign the
        # visitor straight back into the same account with no way to pick
        # another — which looks broken on a shared machine.
        params["prompt"] = "select_account"
    return HttpResponseRedirect(
        f"{provider.authorize_url}?{urllib.parse.urlencode(params)}"
    )


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


def _callback(request, provider: Provider):
    """Exchange the code for the visitor's details and sign them in."""
    if not provider.configured:
        return _fail(provider, f"{provider.name}_unconfigured")

    # They pressed Cancel on the provider's consent screen.
    if request.GET.get("error"):
        return _fail(
            provider,
            f"{provider.name}_denied",
            request.GET.get("error_description", ""),
        )

    expected = request.session.pop(provider.state_key, None)
    next_path = request.session.pop(provider.next_key, DEFAULT_NEXT)
    state = request.GET.get("state")
    if not expected or not state or not secrets.compare_digest(state, expected):
        return _fail(provider, f"{provider.name}_state")

    code = request.GET.get("code")
    if not code:
        return _fail(provider, f"{provider.name}_no_code")

    try:
        token = _post_form(
            provider.token_url,
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": provider.redirect_uri,
                "client_id": provider.client_id,
                "client_secret": provider.client_secret,
            },
        ).get("access_token")
        if not token:
            return _fail(provider, f"{provider.name}_no_token")
        info = _get_json(provider.userinfo_url, token)
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        return _fail(provider, f"{provider.name}_unreachable", str(exc))

    email = (info.get("email") or "").strip().lower()
    if not email:
        # Possible if they never verified an address with the provider. The
        # account is keyed on email, so there is nothing to attach them to.
        return _fail(provider, f"{provider.name}_no_email")

    # Accounts are matched on email, so an unverified address would let
    # somebody claim an existing account by signing up elsewhere with its
    # address. Google states verification explicitly; LinkedIn only returns
    # verified addresses, and omits the field.
    if info.get("email_verified") is False:
        return _fail(provider, f"{provider.name}_unverified_email")

    user, created = _account_for(provider, info, email)
    login(request, user, backend=MODEL_BACKEND)

    # An existing account goes to its own home; a brand new one goes on to
    # build a profile.
    if not created:
        next_path = "/manager" if user.role == Role.HIRING_MANAGER else "/portal"
    return HttpResponseRedirect(_frontend(next_path))


@require_http_methods(["GET"])
def linkedin_start(request):
    return _start(request, LINKEDIN)


@require_http_methods(["GET"])
def linkedin_callback(request):
    return _callback(request, LINKEDIN)


@require_http_methods(["GET"])
def google_start(request):
    return _start(request, GOOGLE)


@require_http_methods(["GET"])
def google_callback(request):
    return _callback(request, GOOGLE)


def _account_for(provider: Provider, info: dict, email: str) -> tuple[User, bool]:
    """Find the account for this person, or create one.

    Matched on email: someone who signed up with a password and later uses a
    social button is the same person, and should land in the same account
    rather than a duplicate. The same holds across providers — a Gmail address
    used on both LinkedIn and Google is one candidate, not two.
    """
    first = (info.get("given_name") or "").strip()
    last = (info.get("family_name") or "").strip()

    user = User.objects.filter(email__iexact=email).first()
    if user is not None:
        # Fill gaps only — never overwrite a name they have already set here
        # with whatever the provider holds.
        changed = False
        if first and not user.first_name:
            user.first_name, changed = first, True
        if last and not user.last_name:
            user.last_name, changed = last, True
        if changed:
            user.save(update_fields=["first_name", "last_name"])
        _fill_profile(provider, user, info)
        return user, False

    user = User.objects.create_user(
        username=email,
        email=email,
        first_name=first,
        last_name=last,
        role=Role.JOB_SEEKER,
    )
    # No usable password: this account signs in through the provider until
    # they set one in account settings.
    user.set_unusable_password()
    # Google and LinkedIn only release an address they have checked, and
    # the callback refuses an unverified one, so this account arrives
    # proved — asking them to verify it again would be theatre.
    user.email_verified = True
    user.save(update_fields=["password", "email_verified"])
    _fill_profile(provider, user, info)

    from .automatic_mail import context_for, send_automatic_email
    from .models import EmailTrigger

    # "social" rather than the provider name, because the two social
    # templates are one template: the wording differs from a password
    # sign-up, not between Google and LinkedIn. provider_label carries the
    # name for the sentence that mentions it.
    send_automatic_email(
        EmailTrigger.ACCOUNT_CREATED,
        user.email,
        context_for(user=user, provider="social", provider_label=provider.label),
    )
    return user, True


def _fill_profile(provider: Provider, user: User, info: dict) -> None:
    """Put what the provider gave us into the candidate profile.

    Only the three things the OIDC scopes carry — first name, surname and
    picture. Without this the name sat on the User row alone and Personal
    Details still read 0%, which looked like the sign-in had done nothing.
    Section progress is recomputed here for the same reason: it is derived on
    save, and a social sign-in is a save the seeker never made.

    A hiring manager has no candidate profile, and creating an empty one for
    them would put a candidate row behind a manager account.
    """
    if user.role != Role.JOB_SEEKER:
        return

    from .views import _recompute_sections

    profile, _ = CandidateProfile.objects.get_or_create(user=user)

    # A first name is the closest thing these scopes give to a preferred name,
    # and only when the seeker has not set one themselves.
    given = (info.get("given_name") or "").strip()
    if given and not profile.preferred_name:
        profile.preferred_name = given

    _store_photo(provider, profile, info.get("picture"))
    _recompute_sections(profile, user)
    profile.save()


def _store_photo(provider: Provider, profile: CandidateProfile, url: str | None) -> None:
    """Best effort. A missing picture is not a reason to fail a sign-in."""
    if not url or profile.photo:
        return
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as response:
            data = response.read(5 * 1024 * 1024)
        profile.photo.save(
            f"{provider.name}-{profile.user_id}.jpg", ContentFile(data), save=False
        )
    except Exception as exc:  # noqa: BLE001 - never fatal
        logger.warning(
            "Could not fetch %s picture for user %s: %s",
            provider.label,
            profile.user_id,
            exc,
        )
