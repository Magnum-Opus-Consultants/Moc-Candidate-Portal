"""Authentication and account endpoints (Development Plan, Day 2).

Session-based: ``login()`` sets the Django session cookie, which the Next.js
server forwards on SSR so ``request.user`` is the signed-in account. These are
plain Django views (not DRF) and CSRF-exempt because the front end is a
same-origin JSON client authenticated by a SameSite=Lax session cookie.

Email/password is built here; Google, LinkedIn, Apple and SSO are later scope
and need provider credentials, so the front end shows them but they are not
wired to a backend yet.
"""

import json
import logging

from django.conf import settings
from django.contrib.auth import (
    authenticate,
    login,
    logout,
    update_session_auth_hash,
)
from django.core.mail import EmailMultiAlternatives
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import Role, User

logger = logging.getLogger(__name__)

MODEL_BACKEND = "django.contrib.auth.backends.ModelBackend"

PORTAL_URL = "https://careers.demo.moc-pty.com"


def send_welcome_email(user: User) -> None:
    """A 'thank you for joining' note to a new job seeker. Never raises — a mail
    problem must not fail the registration itself (and with the console backend
    it just prints, so development needs no credentials)."""
    try:
        first = user.first_name or "there"
        subject = "Thank you for joining Magnum Opus Consultants"
        text = (
            f"Hi {first},\n\n"
            "Thank you for creating your Magnum Opus Consultants careers profile.\n\n"
            "You can now apply to every MOC role with a single profile and track "
            "each application in one place. The more of your profile you complete, "
            "the better we can match you — and at 80% you can download a branded CV.\n\n"
            f"Browse open roles: {PORTAL_URL}\n\n"
            "— The MOC Careers Team"
        )
        html = f"""\
<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1d2b36">
  <div style="background:linear-gradient(135deg,#04304a,#054b70 55%,#155e7e);padding:28px 32px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;color:#e9f1f5;font-size:20px">Welcome to Magnum Opus Consultants</h1>
  </div>
  <div style="border:1px solid #e4e7ea;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
    <p>Hi {first},</p>
    <p>Thank you for creating your MOC careers profile. You can now apply to
    every role with a single profile and track each application in one place.</p>
    <p>The more of your profile you complete, the better we match you — and at
    80% you can download a branded CV.</p>
    <p style="margin:24px 0">
      <a href="{PORTAL_URL}" style="background:#054b70;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;display:inline-block">Browse open roles</a>
    </p>
    <p style="color:#56666f;font-size:13px">— The MOC Careers Team</p>
  </div>
</div>"""
        message = EmailMultiAlternatives(
            subject, text, settings.DEFAULT_FROM_EMAIL, [user.email]
        )
        message.attach_alternative(html, "text/html")
        message.send(fail_silently=False)
        logger.info("welcome email sent to %s", user.email)
    except Exception as exc:  # noqa: BLE001 - mail must never break sign-up
        logger.warning("welcome email to %s failed: %s", user.email, exc)


def _payload(user: User) -> dict:
    """The shape the front end stores as the signed-in user."""
    return {
        "id": user.id,
        "name": user.display_name,
        "initials": user.initials,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "home": "/manager" if user.role == Role.HIRING_MANAGER else "/portal",
    }


def _body(request) -> dict:
    try:
        return json.loads(request.body or b"{}")
    except (json.JSONDecodeError, ValueError):
        return {}


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """Create a job-seeker account and sign them in."""
    data = _body(request)
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return JsonResponse({"detail": "Email and password are required."}, status=400)
    if len(password) < 8:
        return JsonResponse(
            {"detail": "Password must be at least 8 characters."}, status=400
        )
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse(
            {"detail": "An account with that email already exists."}, status=409
        )

    first, _, last = name.partition(" ")
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first,
        last_name=last,
        role=Role.JOB_SEEKER,
    )
    login(request, user, backend=MODEL_BACKEND)
    send_welcome_email(user)
    return JsonResponse(_payload(user), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """Sign in by email + password, for either role (one shared page)."""
    data = _body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    account = User.objects.filter(email__iexact=email).first()
    if account is None:
        return JsonResponse(
            {"detail": "Those details don't match an account."}, status=401
        )
    user = authenticate(request, username=account.username, password=password)
    if user is None or not user.is_active:
        return JsonResponse(
            {"detail": "Those details don't match an account."}, status=401
        )
    login(request, user)
    return JsonResponse(_payload(user))


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
@ensure_csrf_cookie
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not signed in."}, status=401)
    return JsonResponse(_payload(request.user))


@require_http_methods(["POST"])
def update_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not signed in."}, status=401)
    data = _body(request)
    user = request.user
    name = (data.get("name") or "").strip()
    if name:
        first, _, last = name.partition(" ")
        user.first_name, user.last_name = first, last
    if "phone" in data:
        user.phone = (data.get("phone") or "").strip()
    user.save()
    return JsonResponse(_payload(user))


@require_http_methods(["POST"])
def change_email(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not signed in."}, status=401)
    email = (_body(request).get("email") or "").strip().lower()
    if not email or "@" not in email:
        return JsonResponse({"detail": "Enter a valid email address."}, status=400)
    if User.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
        return JsonResponse({"detail": "That email is already in use."}, status=409)
    request.user.email = email
    request.user.save(update_fields=["email"])
    return JsonResponse(_payload(request.user))


@require_http_methods(["POST"])
def change_password(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not signed in."}, status=401)
    data = _body(request)
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""
    if not request.user.check_password(current):
        return JsonResponse({"detail": "Your current password is incorrect."}, status=400)
    if len(new) < 8:
        return JsonResponse(
            {"detail": "New password must be at least 8 characters."}, status=400
        )
    request.user.set_password(new)
    request.user.save()
    update_session_auth_hash(request, request.user)  # stay signed in
    return JsonResponse({"ok": True})


@require_http_methods(["POST", "DELETE"])
def delete_account(request):
    """Remove access. Per the SOW the candidate's data is retained so MOC can
    contact them about future roles, so this deactivates rather than erases."""
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not signed in."}, status=401)
    user = request.user
    user.is_active = False
    user.save(update_fields=["is_active"])
    logout(request)
    return JsonResponse({"ok": True})
