"""Clean the HTML a hiring manager's editor sends before it goes in an email.

Written rather than installed: the allowlist below is a dozen formatting
tags, and a sanitiser whose rules you can read in one screen is easier to
trust than a dependency whose defaults you have to go and look up.

A hiring manager is not an attacker, but their browser extension might be,
their clipboard certainly is — pasting from Word brings a mountain of
markup with it — and a stored email body is rendered in other people's
mail clients. So the editor's output is treated as untrusted input, which
is the only safe way to treat markup that arrives over HTTP.

Everything not on the allowlist is dropped and its text kept, so removing
a tag never deletes a sentence.
"""

from html import escape
from html.parser import HTMLParser

# Formatting a manager can apply, and nothing else. No <img> (an email body
# with a remote image is a tracking pixel waiting to happen), no <style>,
# no <script>, no <iframe>, no tables for now — the toolbar offers none.
ALLOWED_TAGS: dict[str, set[str]] = {
    "p": set(),
    "br": set(),
    "strong": set(),
    "b": set(),
    "em": set(),
    "i": set(),
    "u": set(),
    "s": set(),
    "strike": set(),
    "h2": set(),
    "h3": set(),
    "ul": set(),
    "ol": set(),
    "li": set(),
    "blockquote": set(),
    "div": set(),
    "span": set(),
    "a": {"href", "title"},
}

VOID_TAGS = {"br"}

# Only schemes that do something harmless when clicked. javascript: and
# data: are the two that do not.
SAFE_SCHEMES = ("http://", "https://", "mailto:", "tel:")

# The editor writes alignment as a style, which is the one style worth
# keeping — anything else (colours, fonts, display) is either pasted junk
# or a way to hide text.
SAFE_TEXT_ALIGN = {"left", "center", "right", "justify"}


class _Sanitiser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.open: list[str] = []

    # --- tags ------------------------------------------------------------
    def handle_starttag(self, tag: str, attrs) -> None:
        if tag not in ALLOWED_TAGS:
            return
        kept = self._attributes(tag, attrs)
        if tag in VOID_TAGS:
            self.out.append(f"<{tag} />")
            return
        self.out.append(f"<{tag}{kept}>")
        self.open.append(tag)

    def handle_startendtag(self, tag: str, attrs) -> None:
        if tag in ALLOWED_TAGS:
            self.out.append(f"<{tag} />" if tag in VOID_TAGS else f"<{tag}></{tag}>")

    def handle_endtag(self, tag: str) -> None:
        if tag not in ALLOWED_TAGS or tag in VOID_TAGS:
            return
        # Close only what is actually open, so a stray </div> from a paste
        # cannot close a tag it never opened.
        if tag in self.open:
            while self.open:
                current = self.open.pop()
                self.out.append(f"</{current}>")
                if current == tag:
                    break

    def handle_data(self, data: str) -> None:
        self.out.append(escape(data, quote=False))

    # --- attributes ------------------------------------------------------
    def _attributes(self, tag: str, attrs) -> str:
        allowed = ALLOWED_TAGS[tag]
        parts: list[str] = []

        for name, value in attrs:
            name = (name or "").lower()
            value = value or ""

            if name == "style":
                align = _text_align(value)
                if align:
                    parts.append(f' style="text-align:{align}"')
                continue

            if name not in allowed:
                continue

            if name == "href":
                if not value.lower().startswith(SAFE_SCHEMES):
                    continue
                # A link out of an email opens in a new tab, and noopener
                # keeps the opened page from reaching back into this one.
                parts.append(f' href="{escape(value, quote=True)}"')
                parts.append(' target="_blank" rel="noopener noreferrer"')
                continue

            parts.append(f' {name}="{escape(value, quote=True)}"')

        return "".join(parts)

    def close_all(self) -> str:
        while self.open:
            self.out.append(f"</{self.open.pop()}>")
        return "".join(self.out)


def _text_align(style: str) -> str | None:
    for declaration in style.split(";"):
        prop, _, value = declaration.partition(":")
        if prop.strip().lower() == "text-align":
            cleaned = value.strip().lower()
            if cleaned in SAFE_TEXT_ALIGN:
                return cleaned
    return None


def sanitize_html(markup: str) -> str:
    """Return `markup` with everything but the allowed formatting removed."""
    parser = _Sanitiser()
    parser.feed(markup or "")
    parser.close()
    return parser.close_all()


class _TextExtractor(HTMLParser):
    """Markup reduced to the words, for the plain-text part of an email."""

    BREAKS = {"p", "br", "h2", "h3", "li", "blockquote", "div"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.BREAKS:
            self.parts.append("\n")
        if tag == "li":
            self.parts.append("- ")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.BREAKS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def html_to_text(markup: str) -> str:
    """A readable plain-text version, for the multipart alternative.

    Every email goes out with both parts. A text part that is just the raw
    tags is worse than none, and some clients — and most screen readers
    reading a forwarded message — show it.
    """
    extractor = _TextExtractor()
    extractor.feed(markup or "")
    extractor.close()

    text = "".join(extractor.parts)
    # Collapse the runs of blank lines the block tags leave behind.
    lines = [line.strip() for line in text.splitlines()]
    out: list[str] = []
    for line in lines:
        if line or (out and out[-1]):
            out.append(line)
    return "\n".join(out).strip()
