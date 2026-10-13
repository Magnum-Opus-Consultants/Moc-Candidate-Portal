"""Microsoft Graph email backend.

Sends through the same Graph mail app the MOC Workspace (Automation Platform)
uses: a client-credentials app with the Mail.Send application permission,
sending as the GRAPH_MAILBOX. Mirrors that app's _get_graph_token() +
/users/{mailbox}/sendMail. Configured by the GRAPH_* settings; the only secret
is GRAPH_CLIENT_SECRET.
"""

import logging

import msal
import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

GRAPH = "https://graph.microsoft.com/v1.0"


class GraphEmailBackend(BaseEmailBackend):
    def _token(self) -> str:
        app = msal.ConfidentialClientApplication(
            settings.GRAPH_CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{settings.GRAPH_TENANT_ID}",
            client_credential=settings.GRAPH_CLIENT_SECRET,
        )
        result = app.acquire_token_for_client(
            scopes=["https://graph.microsoft.com/.default"]
        )
        token = result.get("access_token")
        if not token:
            raise RuntimeError(
                f"Graph token error: {result.get('error_description', result)}"
            )
        return token

    def send_messages(self, email_messages) -> int:
        if not email_messages:
            return 0
        try:
            token = self._token()
        except Exception as exc:  # noqa: BLE001
            if not self.fail_silently:
                raise
            logger.warning("Graph token acquisition failed: %s", exc)
            return 0

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        sent = 0
        for message in email_messages:
            try:
                response = requests.post(
                    f"{GRAPH}/users/{settings.GRAPH_MAILBOX}/sendMail",
                    headers=headers,
                    json=self._payload(message),
                    timeout=30,
                )
                if response.status_code in (200, 202):
                    sent += 1
                else:
                    raise RuntimeError(
                        f"sendMail {response.status_code}: {response.text[:300]}"
                    )
            except Exception as exc:  # noqa: BLE001
                if not self.fail_silently:
                    raise
                logger.warning("Graph sendMail failed: %s", exc)
        return sent

    @staticmethod
    def _payload(message) -> dict:
        # Prefer the HTML alternative when the message carries one.
        content_type, content = "Text", message.body
        for alt_content, alt_type in getattr(message, "alternatives", None) or []:
            if alt_type == "text/html":
                content_type, content = "HTML", alt_content
                break

        def recipients(addresses):
            return [{"emailAddress": {"address": a}} for a in addresses]

        msg = {
            "subject": message.subject,
            "body": {"contentType": content_type, "content": content},
            "toRecipients": recipients(message.to),
        }
        if message.cc:
            msg["ccRecipients"] = recipients(message.cc)
        if message.bcc:
            msg["bccRecipients"] = recipients(message.bcc)
        return {"message": msg, "saveToSentItems": True}
