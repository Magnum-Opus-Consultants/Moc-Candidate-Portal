"""The MOC-branded candidate profile (Development Plan, Day 7).

Renders a job seeker's profile into the two-page document the operations
team sends to client companies: a dashboard page of who the person is and
how well they match, and a page of their work history.

The layout is the house template ("MOC - Candidate Profile Template 2026"),
reproduced to its own measurements — every position, size and colour in
MEASURE below was read out of that PDF rather than estimated, so a change to
the template can be re-measured and applied here the same way.

Page one is drawn straight onto the canvas instead of flowed: its two
columns are independent of each other and both are anchored to fixed bands,
which is exactly what platypus frames are bad at. Page two is a list that
can run long, so it flows and starts a new page when it fills.

Gating lives in the view, not here: this module renders whatever profile it
is handed.
"""

from io import BytesIO
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

from .models import PROFILE_SECTIONS, CandidateProfile

PAGE_W, PAGE_H = A4

ASSETS = Path(__file__).resolve().parent / "assets"
LOGO = ASSETS / "moc-logo.png"

# The template's palette. The first four are the design system's Brand
# Primary/600, Neutral/300 and the accent; PANEL is that accent at the 30%
# the template lays it down at, flattened so nothing has to be drawn
# transparent.
NAVY = HexColor("#064b70")
ACCENT = HexColor("#8bb7c4")
PANEL = HexColor("#ddeaed")
SIDEBAR = HexColor("#d5dbde")
WHITE = HexColor("#ffffff")
INK = HexColor("#000000")
GREY = HexColor("#a6a6a6")

# Poppins is the brand face, and the portal's. Vendored rather than relied on
# from the system: the PDF is built on a server with no fonts installed.
FONTS = {
    "Poppins": "Poppins-Regular.ttf",
    "Poppins-Bold": "Poppins-Bold.ttf",
    "Poppins-Italic": "Poppins-Italic.ttf",
    "Poppins-SemiBold": "Poppins-SemiBold.ttf",
}

REGULAR, BOLD, ITALIC = "Poppins", "Poppins-Bold", "Poppins-Italic"


def _register_fonts() -> None:
    for name, filename in FONTS.items():
        if name in pdfmetrics.getRegisteredFontNames():
            continue
        pdfmetrics.registerFont(TTFont(name, str(ASSETS / "fonts" / filename)))


# Measured off the template, in points from the top-left of an A4 page.
# Converted to reportlab's bottom-left origin by `_y` at the point of use, so
# these read the same way round as the design.
MEASURE = {
    "sidebar_w": 218.5,
    "side_x": 16.4,          # left edge of everything in the sidebar
    "side_w": 185.6,         # photo frame and section bars share this width
    "photo_top": 14.7,
    "photo_h": 228.3,
    "photo_inset": 10.7,     # white frame around the portrait
    "bar_h": 22.1,
    "bar_pad": 3.9,          # bar drawn this far left of its own text
    "bar_size": 16,
    "bar_tracking": 0.59,
    "right_x": 233.4,        # left edge of the right-hand column
    "right_w": 341.6,        # ... and its width, so it ends at 575.0
    "header_top": 27.9,
    "header_h": 122.4,
    "name_size": 31,
    "position_size": 20,
    "criteria_top": 170.4,   # the MATCHING CRITERIA bar
    "criterion_step": 55.2,  # from one criterion's label to the next
    "scale_h": 3,
    "marker_w": 17.5,
    "panel_top": 426.5,      # the personality panel, alternating row bands
    "panel_row_h": 81.4,
    "panel_x": 224.5,
    "panel_w": 363.0,
}


def _y(top: float) -> float:
    """Template coordinate (down from the top) to reportlab's (up)."""
    return PAGE_H - top


def _text(value) -> str:
    return str(value or "").strip()


def _wrap(text: str, font: str, size: float, width: float) -> list[str]:
    """Greedy line breaking, because the canvas has no paragraph of its own."""
    words, lines, line = _text(text).split(), [], ""
    for word in words:
        trial = f"{line} {word}".strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _draw_wrapped(
    c: Canvas, text: str, x: float, top: float, width: float,
    font: str, size: float, leading: float, colour=INK,
) -> float:
    """Draw wrapped text downwards; return the top of the next free line."""
    c.setFont(font, size)
    c.setFillColor(colour)
    for line in _wrap(text, font, size, width):
        c.drawString(x, _y(top + size), line)
        top += leading
    return top


def _bullets(
    c: Canvas, items, x: float, top: float, width: float,
    size: float = 9, leading: float = 12, gap: float = 9.0,
) -> float:
    """A bulleted list, each item wrapping under its own text, not its dot."""
    for item in items:
        c.setFont(REGULAR, size)
        c.setFillColor(INK)
        c.drawString(x, _y(top + size), "•")
        top = _draw_wrapped(
            c, item, x + gap, top, width - gap, REGULAR, size, leading
        )
    return top


def _bar_width(text: str) -> float:
    """How wide the heading runs, tracking included."""
    size = MEASURE["bar_size"]
    return (
        pdfmetrics.stringWidth(text, BOLD, size)
        + max(len(text) - 1, 0) * MEASURE["bar_tracking"]
    )


def _bar(c: Canvas, text: str, text_x: float, top: float, width: float | None = None):
    """A section heading: white Poppins Bold on a navy block.

    These headings are letter-spaced - measured at 0.59pt per gap at 16pt,
    which is every section bar in the template and nothing else in it. Set
    flat rather than as a ratio because that is how it was measured.
    """
    size = MEASURE["bar_size"]
    pad = MEASURE["bar_pad"]
    height = MEASURE["bar_h"]
    if width is None:
        width = _bar_width(text) + pad * 2
    c.setFillColor(NAVY)
    c.rect(text_x - pad, _y(top + height), width, height, stroke=0, fill=1)
    c.setFillColor(WHITE)
    # Centred on the block by cap height, which is what the eye reads as
    # centred - font ascent would sit it noticeably high. Drawn through a
    # text object because only that carries character spacing.
    cap = pdfmetrics.getAscent(BOLD, size) * 0.72
    # Character spacing is graphics state, not text state: left set, it
    # leaks into every string drawn afterwards and quietly widens the whole
    # document. Hence the save/restore rather than setting it back by hand.
    c.saveState()
    label = c.beginText(text_x, _y(top + (height + cap) / 2))
    label.setFont(BOLD, size)
    label.setFillColor(WHITE)
    label.setCharSpace(MEASURE["bar_tracking"])
    label.textOut(text)
    c.drawText(label)
    c.restoreState()
    return top + height


def _scale(c: Canvas, top: float, score, x: float, width: float) -> None:
    """A 1-10 rule with the score marked on it and called out in navy."""
    steps = 10
    step = width / steps
    centres = [x + step * (n + 0.5) for n in range(steps)]

    c.setFillColor(NAVY)
    c.rect(x, _y(top + MEASURE["scale_h"]), width, MEASURE["scale_h"], stroke=0, fill=1)

    if score:
        marker = MEASURE["marker_w"]
        centre = centres[min(max(int(score), 1), steps) - 1]
        c.setFillColor(ACCENT)
        c.rect(
            centre - marker / 2, _y(top + MEASURE["scale_h"]),
            marker, MEASURE["scale_h"], stroke=0, fill=1,
        )

    label_top = top + 7.2
    for n, centre in enumerate(centres, start=1):
        hit = score and int(score) == n
        c.setFont(BOLD if hit else REGULAR, 8)
        c.setFillColor(NAVY if hit else GREY)
        c.drawCentredString(centre, _y(label_top + 8), str(n))


# The two scored blocks. Fixed sets, because the template draws exactly these
# four of each and a fifth would have nowhere to go.
MATCHING_CRITERIA = (
    ("english", "English proficiency"),
    ("requirement", "Requirement match"),
    ("experience", "Experience"),
    ("client", "Client interaction"),
)

PERSONALITY_TRAITS = (
    ("extraverted", "Extraverted", "Introverted"),
    ("thinking", "Thinking", "Feeling"),
    ("judging", "Judging", "Prospecting"),
    ("assertive", "Assertive", "Turbulent"),
)

NQF = {
    "matric": 4,
    "certificate": 5,
    "diploma": 6,
    "bachelor": 7,
    "honours": 8,
    "master": 9,
    "doctorate": 10,
}


def _period(entry) -> str:
    start = entry.start_date.strftime("%B %Y") if entry.start_date else ""
    if entry.is_current:
        end = "Present"
    else:
        end = entry.end_date.strftime("%B %Y") if entry.end_date else ""
    return " – ".join(p for p in (start, end) if p)


def _skills(profile) -> list[str]:
    names = []
    for skill in profile.skills or []:
        name = skill.get("name", "") if isinstance(skill, dict) else str(skill)
        if _text(name):
            names.append(_text(name))
    return names


def _languages(profile) -> list[str]:
    out = []
    for entry in profile.languages or []:
        if not isinstance(entry, dict):
            if _text(entry):
                out.append(_text(entry))
            continue
        name = _text(entry.get("language"))
        if not name:
            continue
        level = _text(entry.get("proficiency"))
        out.append(f"{name} ({level})" if level else name)
    return out


def _education(profile) -> list[tuple[str, str, str]]:
    """(year, institution, qualification line) newest first."""
    rows = []
    entries = sorted(
        profile.education.all(),
        key=lambda e: (e.is_current, e.graduation_year or 0),
        reverse=True,
    )
    for entry in entries:
        year = str(entry.graduation_year) if entry.graduation_year else (
            "Current" if entry.is_current else ""
        )
        nqf = NQF.get(entry.level)
        qualification = _text(entry.field_of_study) or entry.get_level_display()
        line = f"NQF {nqf} | {qualification}" if nqf else qualification
        rows.append((year, _text(entry.institution_name).upper(), line))
    return rows


def _draw_cover(c: Canvas, image: ImageReader, x: float, y: float,
                width: float, height: float) -> None:
    """Fill the box with the image, cropping the overflow.

    The template's portrait fills its frame edge to edge. Fitting the image
    inside instead would letterbox anything that is not the frame's own 4:5,
    and almost no photograph someone uploads is - a square phone crop would
    sit in the middle with white bands above and below it.
    """
    source_w, source_h = image.getSize()
    if not source_w or not source_h:
        return
    scale = max(width / source_w, height / source_h)
    drawn_w, drawn_h = source_w * scale, source_h * scale

    c.saveState()
    path = c.beginPath()
    path.rect(x, y, width, height)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(
        image,
        x - (drawn_w - width) / 2,
        y - (drawn_h - height) / 2,
        drawn_w, drawn_h,
        mask="auto",
    )
    c.restoreState()


def _draw_page_one(c: Canvas, profile) -> None:
    m = MEASURE
    user = profile.user
    assessment = profile.assessment or {}

    # --- the two background columns ---------------------------------------
    c.setFillColor(SIDEBAR)
    c.rect(0, 0, m["sidebar_w"], PAGE_H, stroke=0, fill=1)

    # Full width, not just the right-hand column: in the template the band
    # runs behind the portrait and shows again in the strip to its left.
    c.setFillColor(NAVY)
    c.rect(
        0, _y(m["header_top"] + m["header_h"]),
        PAGE_W, m["header_h"], stroke=0, fill=1,
    )

    # --- portrait ----------------------------------------------------------
    frame_x, frame_top = m["side_x"], m["photo_top"]
    c.setFillColor(WHITE)
    c.rect(
        frame_x, _y(frame_top + m["photo_h"]), m["side_w"], m["photo_h"],
        stroke=0, fill=1,
    )
    inset = m["photo_inset"]
    box = (
        frame_x + inset, _y(frame_top + m["photo_h"] - inset),
        m["side_w"] - inset * 2, m["photo_h"] - inset * 2,
    )
    if profile.photo:
        try:
            _draw_cover(c, ImageReader(profile.photo.path), *box)
        except Exception:
            # A missing or unreadable upload must not cost the whole profile.
            pass

    # --- name and position -------------------------------------------------
    name = _text(user.display_name).upper()
    c.setFillColor(WHITE)
    size = m["name_size"]
    # Long names are stepped down rather than clipped by the navy band.
    while size > 18 and pdfmetrics.stringWidth(name, BOLD, size) > 336:
        size -= 1
    c.setFont(BOLD, size)
    c.drawString(239.0, _y(84.6), name)
    c.setFont(REGULAR, m["position_size"])
    c.drawString(237.8, _y(111.4), _text(profile.headline))

    # --- matching criteria -------------------------------------------------
    matching = assessment.get("matching") or {}
    if any(matching.get(key) for key, _ in MATCHING_CRITERIA):
        _bar(c, "MATCHING CRITERIA", 237.4, m["criteria_top"])
        top = 208.3
        for key, label in MATCHING_CRITERIA:
            c.setFont(BOLD, 9)
            c.setFillColor(NAVY)
            c.drawString(m["right_x"], _y(top + 9), label)
            _scale(c, top + 16.3, matching.get(key), 233.5, m["right_w"])
            top += m["criterion_step"]

    # --- sidebar sections --------------------------------------------------
    top = 270.5
    education = _education(profile)
    if education:
        top = _bar(c, "EDUCATION", m["side_x"], top, m["side_w"] + 3.9) + 6
        for year, institution, line in education:
            c.setFont(BOLD, 10)
            c.setFillColor(INK)
            c.drawString(17.9, _y(top + 10), year)
            top += 13.9
            top = _draw_wrapped(
                c, institution, 17.9, top, m["side_w"], REGULAR, 10, 13
            )
            top = _draw_wrapped(c, line, 17.9, top, m["side_w"], REGULAR, 8, 11)
            top += 9
        top += 8

    if _text(profile.summary):
        top = _bar(c, "EXPERTISE", m["side_x"], top, m["side_w"] + 3.9) + 5.4
        top = _draw_wrapped(
            c, profile.summary, 17.9, top, m["side_w"] - 2, REGULAR, 9, 12
        )
        top += 14

    skills = _skills(profile)
    if skills:
        top = _bar(c, "COMPETENCIES", m["side_x"], top, m["side_w"] + 3.9) + 5.4
        top = _bullets(c, skills, 22.0, top, m["side_w"] - 6)
        top += 14

    languages = _languages(profile)
    if languages:
        top = _bar(c, "LANGUAGES", m["side_x"], top, m["side_w"] + 3.9) + 5.4
        _bullets(c, languages, 24.7, top, m["side_w"] - 9)

    # --- personality traits ------------------------------------------------
    traits = assessment.get("traits") or {}
    scored = [
        (key, left, right, traits.get(key) or {})
        for key, left, right in PERSONALITY_TRAITS
        if (traits.get(key) or {}).get("percent")
    ]
    if not scored:
        return

    panel_top, row_h = m["panel_top"], m["panel_row_h"]
    heading_h = 50.5  # the band the PERSONALITY TRAITS bar sits on
    c.setFillColor(PANEL)
    c.rect(
        m["panel_x"], _y(panel_top + heading_h), m["panel_w"], heading_h,
        stroke=0, fill=1,
    )
    _bar(c, "PERSONALITY TRAITS", 244.1, 441.0)

    top = panel_top + heading_h
    for index, (key, left, right, trait) in enumerate(scored):
        # Rows alternate so each trait reads as its own block; the first one
        # after the heading band is white.
        if index % 2:
            c.setFillColor(PANEL)
            c.rect(m["panel_x"], _y(top + row_h), m["panel_w"], row_h, stroke=0, fill=1)

        percent = int(trait["percent"])
        rule_x, rule_w = 240.9, 331.3

        # The rule runs from the first pole on the left to the second on the
        # right, so a 67% Extraverted reading sits a third of the way in from
        # the Extraverted end - not two thirds. The percentage is called out
        # above the marker, which is why it moves along with it.
        marker = MEASURE["marker_w"]
        along = (100 - max(0.0, min(100.0, percent))) / 100
        centre = rule_x + along * rule_w
        centre = min(max(centre, rule_x + marker / 2), rule_x + rule_w - marker / 2)

        label = f"{percent}% {left}"
        label_x = min(
            max(centre, rule_x + pdfmetrics.stringWidth(label, BOLD, 9) / 2),
            rule_x + rule_w - pdfmetrics.stringWidth(label, BOLD, 9) / 2,
        )
        # Offsets within the row. The template's own four rows are not quite
        # regular - they drift by a few points - so these are the middle of
        # that spread rather than any one row copied.
        c.setFont(BOLD, 9)
        c.setFillColor(NAVY)
        c.drawCentredString(label_x, _y(top + 20.0), label)

        c.setFillColor(NAVY)
        c.rect(rule_x, _y(top + 30.3), rule_w, 3, stroke=0, fill=1)
        c.setFillColor(ACCENT)
        c.rect(centre - marker / 2, _y(top + 30.3), marker, 3, stroke=0, fill=1)

        c.setFont(BOLD, 8)
        c.setFillColor(INK)
        c.drawString(240.7, _y(top + 44.6), left)
        c.drawRightString(572.6, _y(top + 44.6), right)

        _draw_wrapped(
            c, trait.get("note", ""), 240.2, top + 49.7, 332.0,
            ITALIC, 7, 9.3, GREY,
        )
        top += row_h


def _draw_page_two_chrome(c: Canvas, first: bool) -> None:
    """The band, heading and footer that frame the experience list."""
    c.setFillColor(PANEL)
    c.rect(0, _y(78.6), PAGE_W, 78.6, stroke=0, fill=1)
    if first:
        _bar(c, "EXPERIENCE", 54.6, 37.4)

    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, 36.7, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont(BOLD, 10)
    c.drawString(26.8, _y(825.0), "OPERATIONS TEAM | MOC")
    c.setFont(REGULAR, 9)
    c.drawRightString(
        574.1, _y(824.6),
        "E-mail: info@moc-pty.com | Cell: +27 (76) 740-1777 | "
        "Website: www.moc-pty.com",
    )


def _draw_experience(c: Canvas, profile) -> None:
    roles = list(profile.experience.all())
    top = 98.3
    bottom = 740.0
    timeline_from = 104.6

    def new_page():
        nonlocal top, timeline_from
        _timeline(c, timeline_from, bottom)
        c.showPage()
        _draw_page_two_chrome(c, first=False)
        top = 98.3
        timeline_from = 104.6

    def _timeline(canvas, start, end):
        canvas.setFillColor(ACCENT)
        canvas.rect(55.3, _y(end), 0.8, end - start, stroke=0, fill=1)

    for role in roles:
        responsibilities = [
            _text(item) for item in (role.key_responsibilities or []) if _text(item)
        ]
        # Measure the block before committing to it, so a role is not split
        # across the page break with its heading stranded on its own.
        height = 34.9 + sum(
            13.5 * len(_wrap(item, REGULAR, 9, 455.0 - 15.3))
            for item in responsibilities
        ) + 22.8
        if top > 98.3 and top + height > bottom:
            new_page()

        c.setFillColor(ACCENT)
        c.circle(55.7, _y(top + 2.5), 4.1, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.circle(55.7, _y(top + 2.5), 2.3, stroke=0, fill=1)

        c.setFont(BOLD, 10)
        c.setFillColor(INK)
        c.drawString(72.8, _y(top + 10), _text(role.company_name))
        period = _period(role)
        if period:
            c.drawRightString(542.9, _y(top + 11.6), period)
        top += 14.9

        top = _draw_wrapped(c, role.job_title, 72.8, top, 240.0, REGULAR, 12, 16)
        top += 4.1

        if responsibilities:
            c.setFont(BOLD, 9)
            c.setFillColor(INK)
            c.drawString(72.8, _y(top + 9), "Responsibilities:")
            top += 13.5
            top = _bullets(
                c, responsibilities, 72.8, top, 455.0,
                size=9, leading=13.5, gap=15.3,
            )
        top += 22.8

    _timeline(c, timeline_from, min(max(top, timeline_from + 10), bottom))

    if LOGO.exists():
        width = 170.0
        reader = ImageReader(str(LOGO))
        iw, ih = reader.getSize()
        height = width * ih / iw
        c.drawImage(
            reader, (PAGE_W - width) / 2, _y(795.0), width, height,
            preserveAspectRatio=True, anchor="s", mask="auto",
        )


def build_cv(profile: CandidateProfile) -> bytes:
    """Render the profile as the MOC-branded candidate profile; PDF bytes."""
    _register_fonts()

    buffer = BytesIO()
    c = Canvas(buffer, pagesize=A4)
    c.setTitle(f"{profile.user.display_name} — MOC Candidate Profile")
    c.setAuthor("Magnum Opus Consultants")

    _draw_page_one(c, profile)
    c.showPage()

    _draw_page_two_chrome(c, first=True)
    _draw_experience(c, profile)
    c.showPage()

    c.save()
    return buffer.getvalue()


def cv_filename(profile: CandidateProfile) -> str:
    safe = "".join(
        ch if ch.isalnum() or ch in " -_" else "" for ch in profile.user.display_name
    ).strip().replace(" ", "-")
    return f"{safe or 'candidate'}-MOC-Candidate-Profile.pdf"


# Kept so the gate and the sections stay in step if one of them changes.
assert len(PROFILE_SECTIONS) == 8
