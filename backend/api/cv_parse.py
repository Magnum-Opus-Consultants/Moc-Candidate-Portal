"""Read an uploaded CV and suggest profile fields from it.

This is what actually fills a candidate's profile. LinkedIn's public API hands
back a name, an email and a picture and nothing else, so everything that
matters — work history, education, skills — has to come from the document the
candidate already has.

Deliberately heuristic, not clever. A CV is free-form prose with no schema, so
the aim is a good first draft the candidate corrects in the form, never a
silent overwrite: ``parse_cv`` returns *suggestions*, the endpoint stores the
file, and the form shows the values as unsaved edits for review.

Text extraction covers PDF (pymupdf, already a dependency for CV previews),
DOCX (a zip of XML — no extra package needed) and plain text. Anything else is
rejected with a message rather than silently producing nothing.
"""

import logging
import re
import zipfile
from datetime import date
from io import BytesIO

logger = logging.getLogger(__name__)

MAX_BYTES = 10 * 1024 * 1024

# --------------------------------------------------------------------------
# Text extraction
# --------------------------------------------------------------------------


class UnsupportedDocument(Exception):
    """The upload is not a document we can read."""


def extract_text(name: str, data: bytes) -> str:
    """Plain text from a PDF, DOCX or TXT upload."""
    if len(data) > MAX_BYTES:
        raise UnsupportedDocument("That file is larger than 10 MB.")

    lowered = (name or "").lower()

    # Sniff the magic bytes rather than trusting the extension: a .pdf that is
    # really a Word file would otherwise fail deep inside the PDF reader.
    if data[:4] == b"%PDF":
        return _pdf_text(data)
    if data[:2] == b"PK" and lowered.endswith(".docx"):
        return _docx_text(data)
    if lowered.endswith(".txt"):
        return data.decode("utf-8", errors="replace")
    if lowered.endswith(".doc"):
        raise UnsupportedDocument(
            "Old .doc files cannot be read — please save as PDF or .docx."
        )
    raise UnsupportedDocument("Please upload a PDF, .docx or .txt CV.")


def _pdf_text(data: bytes) -> str:
    import pymupdf

    try:
        with pymupdf.open(stream=data, filetype="pdf") as document:
            return "\n".join(page.get_text() for page in document)
    except Exception as exc:  # noqa: BLE001 - any reader failure is the same to us
        raise UnsupportedDocument("That PDF could not be read.") from exc


def _docx_text(data: bytes) -> str:
    """A .docx is a zip; the body is one XML part.

    Paragraph tags become newlines so the line-based rules below still work,
    then the remaining tags are stripped.
    """
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            xml = archive.read("word/document.xml").decode("utf-8", errors="replace")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise UnsupportedDocument("That .docx could not be read.") from exc

    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab[^>]*/>", " ", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    return _unescape(text)


def _unescape(text: str) -> str:
    for entity, char in (
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&quot;", '"'), ("&apos;", "'"),
    ):
        text = text.replace(entity, char)
    return text


# --------------------------------------------------------------------------
# Field rules
# --------------------------------------------------------------------------

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
# South African numbers plus the common international shapes. Deliberately
# loose: a wrong guess is corrected in the form, a missed one is retyped.
PHONE = re.compile(r"(?:\+?\d{1,3}[\s-]?)?(?:\(0\)[\s-]?)?0?\d{2}[\s-]?\d{3}[\s-]?\d{4}")
LINKEDIN = re.compile(r"(?:https?://)?(?:[\w-]+\.)?linkedin\.com/in/[\w%-]+", re.I)
URL = re.compile(r"https?://[\w.-]+(?:/[\w./%-]*)?", re.I)
YEAR = re.compile(r"\b(19[6-9]\d|20[0-4]\d)\b")

# Section headings as they are actually written on CVs. Matched on a line of
# its own, case-insensitively.
HEADINGS = {
    "experience": [
        "work experience", "professional experience", "employment history",
        "career history", "experience", "employment",
    ],
    "education": [
        "education and training", "education & training", "education",
        "qualifications", "academic background", "academic qualifications",
    ],
    "skills": [
        "skills and tools", "technical skills", "key skills", "core skills",
        "skills", "competencies", "areas of expertise",
    ],
    "languages": ["languages", "language proficiency"],
    "summary": [
        "professional summary", "personal statement", "profile summary",
        "summary", "about me", "profile", "objective",
    ],
    "other": [
        "references", "interests", "hobbies", "certifications", "awards",
        "publications", "projects", "achievements",
    ],
}

# Highest education level, longest first so "honours degree" is not matched as
# "degree". The value on the right must exist in the model's choices.
EDUCATION_LEVELS = [
    ("doctorate", "doctorate"), ("phd", "doctorate"), ("d.phil", "doctorate"),
    ("master", "master"), ("msc", "master"), ("m.sc", "master"),
    ("mba", "master"), ("ma ", "master"),
    ("honours", "honours"), ("honors", "honours"), ("bhons", "honours"),
    ("bachelor", "bachelor"), ("bsc", "bachelor"), ("b.sc", "bachelor"),
    ("b.com", "bachelor"), ("bcom", "bachelor"), ("ba ", "bachelor"),
    ("btech", "bachelor"), ("degree", "bachelor"),
    ("national diploma", "diploma"), ("diploma", "diploma"),
    ("higher certificate", "certificate"), ("certificate", "certificate"),
    ("matric", "matric"), ("national senior certificate", "matric"),
    ("grade 12", "matric"),
]

INSTITUTION_WORDS = (
    "university", "universiteit", "college", "institute", "academy",
    "polytechnic", "school of", "tut", "unisa", "wits",
)

# Skills worth recognising. Kept explicit rather than guessing at capitalised
# words, which turns every company name into a "skill".
SKILL_VOCABULARY = [
    # Engineering
    "Python", "Django", "Flask", "FastAPI", "JavaScript", "TypeScript",
    "React", "Next.js", "Node.js", "Vue", "Angular", "Java", "Kotlin",
    "Swift", "C#", ".NET", "PHP", "Laravel", "Ruby", "Rails", "Go", "Rust",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Linux",
    "Git", "CI/CD", "Jenkins", "Testing", "Selenium", "Cypress",
    # Data
    "Power BI", "Tableau", "Looker", "dbt", "Airflow", "Snowflake",
    "Pandas", "NumPy", "Machine Learning", "Statistics", "Excel", "R",
    # Design
    "Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "InDesign",
    "User Research", "Prototyping", "Wireframing", "Design Systems",
    "Accessibility", "Usability Testing",
    # Marketing
    "SEO", "Google Ads", "Google Analytics", "HubSpot", "Mailchimp",
    "Copywriting", "Content Strategy", "Social Media",
    # Finance / ops
    "Xero", "Sage", "SAP", "QuickBooks", "Pastel", "IFRS", "Payroll",
    "Reconciliations", "Forecasting", "Budgeting",
    # Support / general
    "Zendesk", "Salesforce", "Jira", "Confluence", "Slack", "Notion",
    "Trello", "Asana", "Project Management", "Agile", "Scrum",
    "Customer Service", "Communication", "Leadership",
]

LANGUAGE_VOCABULARY = [
    "English", "Afrikaans", "Zulu", "isiZulu", "Xhosa", "isiXhosa", "Sotho",
    "Sesotho", "Tswana", "Setswana", "Tsonga", "Venda", "Swati", "Ndebele",
    "Northern Sotho", "Sepedi", "French", "German", "Portuguese", "Spanish",
    "Mandarin", "Dutch", "Italian", "Arabic",
]

EMPLOYMENT_HINTS = {
    "full-time": "full_time", "full time": "full_time", "permanent": "full_time",
    "part-time": "part_time", "part time": "part_time",
    "contract": "contract", "freelance": "freelance", "consultant": "contract",
    "internship": "internship", "intern": "internship", "learnership": "internship",
}

MONTHS = {
    m: i
    for i, m in enumerate(
        ["jan", "feb", "mar", "apr", "may", "jun",
         "jul", "aug", "sep", "oct", "nov", "dec"],
        start=1,
    )
}

CURRENT_WORDS = ("present", "current", "to date", "ongoing", "now")

# "March 2019 - Present", "03/2019 – 12/2021", "2019 to 2021"
DATE_RANGE = re.compile(
    r"(?P<from>(?:[A-Za-z]{3,9}\s+)?(?:\d{1,2}[/-])?\d{4})"
    r"\s*(?:-|–|—|to|until)\s*"
    r"(?P<to>present|current|to date|ongoing|now|(?:[A-Za-z]{3,9}\s+)?(?:\d{1,2}[/-])?\d{4})",
    re.I,
)

# The characters a CV marks a bullet with. A line starting with none of
# them, under a role, is the tail of the bullet above.
BULLET_CHARS = ("•", "-", "–", "—", "*", "·", "‣", "◦")

# A parenthetical employment type on the end of a title or company.
TRAILING_TYPE = re.compile(
    r"^(.*?)\s*[\(\[]\s*(?:"
    + "|".join(re.escape(word) for word in EMPLOYMENT_HINTS)
    + r")\s*[\)\]]\s*$",
    re.I,
)

# "Senior Developer at Kestrel Software", "Analyst, Northbridge Financial"
# "Senior Developer at Kestrel", "Analyst, Northbridge", and the forms our
# own branded CV uses: "Title · Company" and "Title — Company".
TITLE_AT_COMPANY = re.compile(
    r"^(?P<title>[^,|@·–—]{3,60}?)\s*(?:\bat\b|,|\||@|·|–|—|-)\s*"
    r"(?P<company>[^,|·–—]{2,60})$"
)


# Our own branded CV carries this line under the logo. Everything above it
# is MOC's letterhead — our address, our email, our phone — and belongs to
# us, not the candidate holding the document.
LETTERHEAD = re.compile(r"^\s*Prepared by Magnum Opus Consultants", re.I)
PAGE_MARK = re.compile(r"^\s*Page \d+\s*$", re.I)


def _strip_letterhead(lines: list[str]) -> list[str]:
    """Drop our own header block, and any repeat of it further down.

    The line appears twice — once under the logo and once as the page
    footer. Cutting at the *last* one would throw away the whole CV, so cut
    at the first and filter the rest out wherever they fall.
    """
    start = 0
    for index, line in enumerate(lines):
        if LETTERHEAD.match(line):
            start = index + 1
            break
    return [
        line
        for line in lines[start:]
        if not LETTERHEAD.match(line) and not PAGE_MARK.match(line)
    ]


def parse_cv(text: str) -> dict:
    """Suggested profile fields, using the keys the update endpoint accepts.

    Only keys worth filling are returned — a field the CV says nothing about
    is left out entirely rather than sent as an empty string, so it cannot
    blank out something the candidate already typed.
    """
    lines = _strip_letterhead([line.strip() for line in text.splitlines()])
    # The contact rules below scan the whole document, so they have to scan
    # the stripped one or they find ours.
    text = "\n".join(lines)
    sections = _split_sections(lines)

    out: dict = {}

    _add(out, "email", _first(EMAIL, text))
    _add(out, "phone", _phone(text))
    _add(out, "linkedin_url", _linkedin(text))
    _add(out, "portfolio_url", _portfolio(text))
    _add(out, "name", _name(lines))
    _add(out, "summary", _summary(sections))

    education = _education(sections.get("education", []), text)
    if education:
        # A list, because education is now a table of its own: the profile's
        # flat fields are derived from the rows rather than written directly.
        # is_current must be present: the form binds it to a checkbox, and
        # React warns when a controlled input starts undefined.
        education.setdefault("is_current", False)
        education.setdefault("field_of_study", "")
        education.setdefault("institution_name", "")
        education.setdefault("graduation_year", None)
        out["education"] = [education]

    experience = _experience(sections.get("experience", []))
    if experience:
        out["experience"] = experience

    skills = _skills(sections.get("skills", []) or lines)
    if skills:
        out["skills"] = skills

    languages = _languages(sections.get("languages", []) or lines)
    if languages:
        out["languages"] = languages

    return out


def _add(out: dict, key: str, value) -> None:
    if value:
        out[key] = value


def _first(pattern: re.Pattern, text: str) -> str:
    match = pattern.search(text)
    return match.group(0).strip() if match else ""


def _split_sections(lines: list[str]) -> dict[str, list[str]]:
    """Group the lines under whichever heading they fall below."""
    found: dict[str, list[str]] = {}
    current: str | None = None

    for line in lines:
        heading = _heading_of(line)
        if heading:
            current = heading
            found.setdefault(current, [])
            continue
        if current and line:
            found[current].append(line)

    return found


def _heading_of(line: str) -> str | None:
    """The section a line announces, if it is a heading and not prose."""
    cleaned = line.strip().strip(":").strip()
    if not cleaned or len(cleaned) > 40:
        return None
    lowered = cleaned.lower()
    for name, variants in HEADINGS.items():
        if lowered in variants:
            return name
    return None


def _phone(text: str) -> str:
    """The first number that is not a year, an ID or a postcode."""
    for match in PHONE.finditer(text):
        candidate = match.group(0).strip()
        digits = re.sub(r"\D", "", candidate)
        if 9 <= len(digits) <= 15:
            return candidate
    return ""


def _linkedin(text: str) -> str:
    found = _first(LINKEDIN, text)
    if not found:
        return ""
    return found if found.startswith("http") else f"https://{found}"


def _portfolio(text: str) -> str:
    """A personal site, if there is one that is not LinkedIn or an email host."""
    skip = ("linkedin.com", "mailto:", "gmail.com", "outlook.com", "example.com")
    for match in URL.finditer(text):
        url = match.group(0).rstrip(".,);")
        if not any(bad in url.lower() for bad in skip):
            return url
    return ""


def _name(lines: list[str]) -> str:
    """CVs put the name first. Take the first line that reads like one."""
    for line in lines[:8]:
        if not line or len(line) > 60 or "@" in line or any(c.isdigit() for c in line):
            continue
        if _heading_of(line):
            continue
        words = line.replace(",", " ").split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
            return " ".join(words)
    return ""


def _summary(sections: dict[str, list[str]]) -> str:
    body = " ".join(sections.get("summary", [])).strip()
    return body[:1000] if len(body) > 40 else ""


def _education(lines: list[str], whole: str) -> dict:
    """One qualification: level, field, institution and the year it finished.

    A CV usually lists several, but telling them apart reliably needs more
    structure than free text gives. The top one is worth having; the rest the
    candidate adds in the form, which now takes as many as they like.
    """
    out: dict = {}
    haystack = ("\n".join(lines) or whole).lower()

    for needle, level in EDUCATION_LEVELS:
        if needle in haystack:
            out["level"] = level
            break

    for line in lines:
        lowered = line.lower()
        if "institution_name" not in out and any(
            word in lowered for word in INSTITUTION_WORDS
        ):
            # "University of Pretoria · 2017" is a school and a year, not a
            # school called "University of Pretoria · 2017".
            name = re.sub(r"\s*[,|·–—]\s*(?:19|20)\d{2}\s*$", "", line)
            name = re.sub(r"\s*[,|].*$", "", name)
            out["institution_name"] = name.strip()[:160]

        if "field_of_study" not in out:
            # "BSc Computer Science", "Bachelor of Arts in Psychology"
            match = re.search(
                r"(?:in|of)\s+([A-Z][\w&\s-]{3,60})$", line.strip().rstrip(".")
            )
            if match:
                out["field_of_study"] = match.group(1).strip()[:120]

    years = [int(y) for y in YEAR.findall("\n".join(lines))]
    if years:
        # The latest year in the education block is when they finished.
        out["graduation_year"] = max(years)

    return out


def _experience(lines: list[str]) -> list[dict]:
    """Roles, each as the form's experience editor expects them.

    A role is recognised by a date range; the title and company are read from
    that line or the one above it, and the bullets beneath become the
    responsibilities.
    """
    roles: list[dict] = []
    current: dict | None = None

    for index, line in enumerate(lines):
        dates = DATE_RANGE.search(line)

        # Our branded CV puts the role on one line and its dates on the
        # next, so that heading would otherwise be swallowed as a bullet of
        # the role above. Only an unbulleted line can be a heading, though:
        # blank lines are already gone by here, so without that condition
        # this also ate the last real bullet before every new role.
        if (
            not dates
            and not line.lstrip().startswith(BULLET_CHARS)
            and index + 1 < len(lines)
            and DATE_RANGE.search(lines[index + 1])
        ):
            continue

        if dates:
            if current:
                roles.append(current)

            start = _as_date(dates.group("from"), end=False)
            raw_end = dates.group("to").lower()
            is_current = any(word in raw_end for word in CURRENT_WORDS)

            # The role name is usually on this line beside the dates, or on
            # the line just above it.
            without_dates = line[: dates.start()].strip(" ,|-–—\t")
            heading = without_dates or (lines[index - 1] if index else "")

            title, company = _title_and_company(heading)
            current = {
                "job_title": title[:120],
                "company_name": company[:120],
                "employment_type": _employment_type(line),
                "start_date": start.isoformat() if start else None,
                "end_date": None if is_current else _iso(_as_date(raw_end, end=True)),
                "is_current": is_current,
                "reason_for_leaving": "",
                "key_responsibilities": [],
            }
            continue

        # A bullet under the role in hand.
        if current is not None:
            marked = line.lstrip().startswith(BULLET_CHARS)
            bullet = line.lstrip("•-*·‣◦ \t").strip()
            bullets = current["key_responsibilities"]

            # A bullet too long for one line wraps onto the next. Without
            # this the continuation became a bullet of its own, so a CV with
            # three responsibilities listed four.
            if not marked and bullets and _continues(bullets[-1], bullet):
                bullets[-1] = f"{bullets[-1]} {bullet}".strip()
            elif 10 <= len(bullet) <= 300 and len(bullets) < 8:
                bullets.append(bullet)

    if current:
        roles.append(current)

    # Only roles we could actually name are worth suggesting.
    return [r for r in roles if r["job_title"]][:10]


def _continues(previous: str, line: str) -> bool:
    """Is this line the tail of the bullet above it?

    Only when the previous bullet was left hanging — no full stop — and this
    line reads like prose rather than a new heading.
    """
    if not line or len(line) > 200:
        return False
    if previous.endswith((".", ":", "!", "?")):
        return False
    # A new role's heading is title-cased and short; a wrapped sentence is
    # usually not capitalised at all.
    return not line[0].isupper()


def _title_and_company(heading: str) -> tuple[str, str]:
    heading = heading.strip(" ,|-–—\t")
    if not heading:
        return "", ""
    match = TITLE_AT_COMPANY.match(heading)
    title, company = (
        (match.group("title").strip(), match.group("company").strip())
        if match
        else (heading, "")
    )
    return _strip_type(title), _strip_type(company)


def _strip_type(value: str) -> str:
    """Drop a trailing "(Contract)" and the like.

    The employment type is read separately, so leaving it on the end turns
    "Streamline Logistics" into a company that does not exist.
    """
    match = TRAILING_TYPE.match(value)
    return match.group(1).strip() if match else value.strip()


def _employment_type(line: str) -> str:
    lowered = line.lower()
    for needle, value in EMPLOYMENT_HINTS.items():
        if needle in lowered:
            return value
    return ""


def _as_date(raw: str, *, end: bool) -> date | None:
    """A month and year off a CV, as a real date.

    CVs give months at best, so the day is the first of the month for a start
    and the last we can safely assume (the 28th) for an end.
    """
    raw = (raw or "").strip().lower()
    if not raw or any(word in raw for word in CURRENT_WORDS):
        return None

    year_match = YEAR.search(raw)
    if not year_match:
        return None
    year = int(year_match.group(0))

    month = None
    for name, number in MONTHS.items():
        if name in raw:
            month = number
            break
    if month is None:
        numeric = re.match(r"(\d{1,2})[/-]\d{4}", raw)
        if numeric:
            month = min(max(int(numeric.group(1)), 1), 12)
    if month is None:
        month = 12 if end else 1

    return date(year, month, 28 if end else 1)


def _iso(value: date | None) -> str | None:
    return value.isoformat() if value else None


def _skills(lines: list[str]) -> list[dict]:
    """Known skills found in the text, in the shape the form stores."""
    haystack = "\n".join(lines)
    lowered = haystack.lower()
    found = []
    for skill in SKILL_VOCABULARY:
        # Word boundaries so "R" does not match every capital R, and "Go"
        # does not match "Google".
        if re.search(rf"(?<![\w.]){re.escape(skill.lower())}(?![\w.])", lowered):
            found.append({"name": skill, "proficiency": "", "importance": ""})
        if len(found) >= 25:
            break
    return found


def _languages(lines: list[str]) -> list[dict]:
    haystack = "\n".join(lines).lower()
    seen: list[dict] = []
    names: set[str] = set()
    for language in LANGUAGE_VOCABULARY:
        if re.search(rf"\b{re.escape(language.lower())}\b", haystack):
            # isiZulu and Zulu are the same language under two names.
            key = language.lower().removeprefix("isi").removeprefix("se")
            if key in names:
                continue
            names.add(key)
            # The form stores a language under "language", not "name".
            seen.append({"language": language, "proficiency": ""})
    return seen[:10]
