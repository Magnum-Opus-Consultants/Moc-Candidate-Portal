"""Sign a signed-in user out once they have been idle long enough.

Why this is middleware rather than only a cookie lifetime: the sign-in page
offers "Remember me", and an unchecked box calls ``set_expiry(0)`` so the
cookie dies when the browser closes. A browser-length cookie ignores
SESSION_COOKIE_AGE entirely, so a session left open on a shared machine would
stay valid for as long as the window stayed open — which on a work desktop can
be days. Stamping the last activity in the session and checking it here
applies the same idle window to both kinds of session.

The front end runs its own timer so it can show the signed-out page the moment
the window passes, rather than leaving a stale screen up until the next click.
This is the half that actually enforces it: a timer in a browser is a courtesy,
not a control, and it is gone the moment someone closes the laptop lid or
disables JavaScript.
"""

import time

from django.conf import settings
from django.contrib.auth import logout

# The key the stamp lives under. Namespaced so it cannot collide with the
# OAuth state keys, which also live in the session.
LAST_ACTIVITY = "_last_activity"


class IdleSessionMiddleware:
    """Flush the session when the gap since the last request is too long."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.idle_seconds = getattr(settings, "SESSION_IDLE_SECONDS", 0)

    def __call__(self, request):
        if self.idle_seconds > 0:
            self._enforce(request)
        return self.get_response(request)

    def _enforce(self, request) -> None:
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return

        now = time.time()
        last = request.session.get(LAST_ACTIVITY)

        if last is not None and now - last > self.idle_seconds:
            # logout() flushes the session and cycles the key, so the stamp
            # goes with it and the next request starts clean.
            logout(request)
            return

        # Only write when the stamp has moved on by a noticeable amount.
        # Writing on every request would hit the session store for each image
        # and each poll, and the idle window does not need second precision.
        if last is None or now - last > 60:
            request.session[LAST_ACTIVITY] = now
