"""The MOC-branded CV (Development Plan, Day 7).

Builds one PDF in a single house layout from whatever the job seeker has put
in their profile, so every CV a hiring company receives from MOC looks the
same whoever wrote it.

Gating lives in the view, not here: this module renders whatever profile it
is handed.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
)

from .models import PROFILE_SECTIONS, CandidateProfile

# Magnum Opus Consultants' brand colours, as used across the portal.
BRAND = colors.HexColor("#054B70")
ACCENT = colors.HexColor("#8BB7C4")
INK = colors.HexColor("#1D2B36")
MUTED = colors.HexColor("#56666F")
RULE = colors.HexColor("#E4E7EA")

MARGIN = 18 * mm
HEADER_HEIGHT = 30 * mm


def _styles() -> dict[str, ParagraphStyle]:
    base = ParagraphStyle(
        "base",
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=INK,
        alignment=TA_LEFT,
    )
    return {
        "name": ParagraphStyle(
            "name", parent=base, fontName="Helvetica-Bold", fontSize=20, leading=24,
            textColor=BRAND, spaceAfter=2,
        ),
        "headline": ParagraphStyle(
            "headline", parent=base, fontSize=11, leading=15, textColor=MUTED,
        ),
        "contact": ParagraphStyle(
            "contact", parent=base, fontSize=8.5, leading=13, textColor=MUTED,
        ),
        "section": ParagraphStyle(
            "section", parent=base, fontName="Helvetica-Bold", fontSize=10.5,
            leading=14, textColor=BRAND, spaceBefore=2, spaceAfter=4,
        ),
        "role": ParagraphStyle(
            "role", parent=base, fontName="Helvetica-Bold", fontSize=10, leading=13,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base, fontSize=8.5, leading=12, textColor=MUTED,
        ),
        "body": base,
        "bullet": ParagraphStyle(
            "bullet", parent=base, leftIndent=10, bulletIndent=2, spaceAfter=1,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base, fontSize=7.5, leading=10, textColor=MUTED,
        ),
    }


def _esc(value) -> str:
    """Profile text is user-entered and goes into reportlab's mini-HTML."""
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _label(choices, value) -> str:
    return dict(choices).get(value, value or "")


def _salary(amount, currency, period) -> str:
    if amount is None:
        return ""

    return f"{currency or 'ZAR'} {amount:,.0f} {period or ''}".strip()


def _period(entry) -> str:
    start = entry.start_date.strftime("%b %Y") if entry.start_date else ""
    if entry.is_current:
        end = "Present"
    else:
        end = entry.end_date.strftime("%b %Y") if entry.end_date else ""
    return " – ".join(p for p in (start, end) if p)


def build_cv(profile: CandidateProfile) -> bytes:
    """Render the profile as an MOC-branded CV and return the PDF bytes."""
    from .models import EducationLevel, EmploymentType, ExperienceLevel, WorkSetup

    s = _styles()
    user = profile.user
    buffer = BytesIO()

    def page(canvas, doc):
        """The brand band across the top and the footer on every page."""
        canvas.saveState()
        canvas.setFillColor(BRAND)
        canvas.rect(
            0, A4[1] - HEADER_HEIGHT, A4[0], HEADER_HEIGHT, stroke=0, fill=1
        )
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 13)
        canvas.drawString(MARGIN, A4[1] - 17 * mm, "MAGNUM OPUS")
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(ACCENT)
        canvas.drawString(MARGIN, A4[1] - 22 * mm, "C O N S U L T A N T S")

        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.white)
        canvas.drawRightString(
            A4[0] - MARGIN, A4[1] - 19 * mm, "careers@moc-pty.com"
        )

        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(
            MARGIN,
            12 * mm,
            "Prepared by Magnum Opus Consultants (Pty) Ltd · "
            "Lynnwood, Pretoria · +27 76 740 1777",
        )
        canvas.drawRightString(A4[0] - MARGIN, 12 * mm, f"Page {doc.page}")
        canvas.restoreState()

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=HEADER_HEIGHT + 8 * mm,
        bottomMargin=20 * mm,
        title=f"{user.display_name} — CV",
        author="Magnum Opus Consultants",
    )
    doc.addPageTemplates(
        PageTemplate(
            id="moc",
            frames=[
                Frame(
                    doc.leftMargin,
                    doc.bottomMargin,
                    doc.width,
                    doc.height,
                    id="body",
                )
            ],
            onPage=page,
        )
    )

    story: list = []

    def heading(text: str) -> None:
        story.append(Spacer(1, 7))
        story.append(Paragraph(_esc(text).upper(), s["section"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=RULE))
        story.append(Spacer(1, 5))

    # --- Identity ----------------------------------------------------------
    story.append(Paragraph(_esc(user.display_name), s["name"]))
    if profile.headline:
        story.append(Paragraph(_esc(profile.headline), s["headline"]))

    contact = [user.email, user.phone, profile.location, profile.country_of_residence]
    if profile.linkedin_url:
        contact.append(profile.linkedin_url)
    if profile.portfolio_url:
        contact.append(profile.portfolio_url)
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(" · ".join(_esc(c) for c in contact if c), s["contact"])
    )

    if profile.summary:
        heading("Profile")
        story.append(Paragraph(_esc(profile.summary), s["body"]))

    # --- What they are looking for ----------------------------------------
    facts = []
    if profile.role_category:
        facts.append(("Discipline", profile.role_category))
    if profile.experience_level:
        facts.append(
            ("Experience", _label(ExperienceLevel.choices, profile.experience_level))
        )
    if profile.preferred_work_setup:
        facts.append(
            ("Work setup", _label(WorkSetup.choices, profile.preferred_work_setup))
        )
    if profile.timezone_availability:
        facts.append(("Time zone", profile.timezone_availability))
    if profile.availability:
        facts.append(("Availability", profile.get_availability_display()))
    expected = _salary(
        profile.expected_salary_amount,
        profile.expected_salary_currency,
        profile.get_expected_salary_period_display()
        if profile.expected_salary_period
        else "",
    )
    if expected:
        facts.append(("Expected salary", expected))

    if facts:
        heading("At a glance")
        for term, value in facts:
            story.append(
                Paragraph(
                    f"<b>{_esc(term)}:</b> {_esc(value)}", s["body"]
                )
            )

    # --- Experience --------------------------------------------------------
    roles = list(profile.experience.all())
    if roles:
        heading("Experience")
        for role in roles:
            block = [
                Paragraph(
                    f"{_esc(role.job_title)}"
                    + (f" — {_esc(role.company_name)}" if role.company_name else ""),
                    s["role"],
                )
            ]
            meta = [
                _period(role),
                _label(EmploymentType.choices, role.employment_type),
            ]
            meta_line = " · ".join(m for m in meta if m)
            if meta_line:
                block.append(Paragraph(_esc(meta_line), s["meta"]))
            for item in role.key_responsibilities or []:
                block.append(
                    Paragraph(_esc(item), s["bullet"], bulletText="•")
                )
            block.append(Spacer(1, 6))
            story.append(KeepTogether(block))

    # --- Education ---------------------------------------------------------
    if profile.highest_education_level or profile.institution_name:
        heading("Education")
        line = _label(EducationLevel.choices, profile.highest_education_level)
        if profile.field_of_study:
            line = f"{line} in {profile.field_of_study}" if line else profile.field_of_study
        story.append(Paragraph(_esc(line), s["role"]))
        tail = [profile.institution_name, str(profile.graduation_year or "")]
        tail_line = " · ".join(t for t in tail if t)
        if tail_line:
            story.append(Paragraph(_esc(tail_line), s["meta"]))

    # --- Skills and tools --------------------------------------------------
    if profile.skills or profile.software_tools:
        heading("Skills and tools")
        if profile.skills:
            story.append(
                Paragraph(
                    "<b>Skills:</b> " + _esc(", ".join(profile.skill_names)),
                    s["body"],
                )
            )
        tools = [
            t.get("name", "") if isinstance(t, dict) else str(t)
            for t in (profile.software_tools or [])
        ]
        tools = [t for t in tools if t]
        if tools:
            story.append(
                Paragraph("<b>Software:</b> " + _esc(", ".join(tools)), s["body"])
            )

    # --- Languages ---------------------------------------------------------
    if profile.languages:
        heading("Languages")
        story.append(
            Paragraph(
                _esc(
                    ", ".join(
                        f"{l.get('language', '')} ({l.get('proficiency', '')})".strip()
                        for l in profile.languages
                        if l.get("language")
                    )
                ),
                s["body"],
            )
        )

    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=0.6, color=RULE))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "Magnum Opus Consultants is the legal employer in South Africa and "
            "handles onboarding, HR, payroll and compliance.",
            s["footer"],
        )
    )

    doc.build(story)
    return buffer.getvalue()


def cv_filename(profile: CandidateProfile) -> str:
    safe = "".join(
        ch if ch.isalnum() or ch in " -_" else "" for ch in profile.user.display_name
    ).strip().replace(" ", "-")
    return f"{safe or 'candidate'}-MOC-CV.pdf"


# Kept so the gate and the sections stay in step if one of them changes.
assert len(PROFILE_SECTIONS) == 8
