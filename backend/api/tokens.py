"""Signed, expiring links for verifying an address and resetting a password.

No token table. Django's PasswordResetTokenGenerator builds a token from
values already on the user row plus a timestamp, signed with SECRET_KEY, so
a link proves itself without anything being stored — and because the hash
includes state that the link's own success changes, using a link
invalidates it.

That last part is the reason each generator names different fields in
``_make_hash_value``:

- password reset includes the password hash and last_login, so a reset
  link dies the moment the password changes or the user signs in;
- verification includes ``email_verified`` and the address itself, so a
  verification link dies once used, and a link mailed to an old address
  cannot verify a new one.
"""

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from .models import User


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """One-shot link proving the address belongs to whoever opened it."""

    def _make_hash_value(self, user, timestamp: int) -> str:
        return f"{user.pk}{timestamp}{user.email_verified}{user.email}"


verification_token = EmailVerificationTokenGenerator()


def encode_uid(user: User) -> str:
    return urlsafe_base64_encode(force_bytes(user.pk))


def user_from_uid(uidb64: str) -> User | None:
    """The user a link refers to, or None if the id is unusable.

    Returns None rather than raising for every failure mode — a mangled id,
    a deleted account — because the caller's answer is the same in each
    case and should not leak which it was.
    """
    try:
        pk = force_str(urlsafe_base64_decode(uidb64))
        return User.objects.get(pk=pk)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return None
