"""Candidate-to-job matching.

One score, used in both directions: it ranks suggested candidates on a position
and recommended jobs for a job seeker. The designs show the reasons next to the
score as chips ("Skill 1 match", "Working hours partial match"), so scoring
returns the reasons alongside the number rather than just a total.
"""

from dataclasses import dataclass, field

from .models import CandidateProfile, Job

# Weights sum to 100. Role category carries the most because a candidate in the
# wrong discipline is not a near miss, however well the other fields line up.
WEIGHT_ROLE_CATEGORY = 35
WEIGHT_SKILLS = 30
WEIGHT_SOFTWARE_TOOLS = 10
WEIGHT_EXPERIENCE = 15
WEIGHT_WORK_SETUP = 10

# Reason levels, which the designs colour: a match is green, a partial match
# amber and an outright mismatch red.
MATCH = "match"
PARTIAL = "partial"
NONE = "none"


@dataclass
class MatchResult:
    score: int
    reasons: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"score": self.score, "reasons": self.reasons}


def _normalise(values) -> set[str]:
    return {str(v).strip().lower() for v in values if str(v).strip()}


def _names(entries) -> list[str]:
    """Names out of a list that may hold strings or {"name": ...} objects."""
    out = []
    for entry in entries or []:
        name = entry.get("name", "") if isinstance(entry, dict) else entry
        if str(name).strip():
            out.append(str(name))
    return out


def score_match(profile: CandidateProfile | None, job: Job) -> MatchResult:
    """Score one candidate against one position, 0-100, with the reasons.

    The score is out of the dimensions the position actually asks for, not out
    of every dimension that exists. A job that lists no software tools cannot
    be judged on them, so its candidates are not quietly capped below 100 for
    failing to match something that was never required.
    """
    if profile is None:
        return MatchResult(score=0, reasons=[])

    total = 0
    # The weight of every dimension this position can be judged on.
    applicable = 0
    reasons: list[dict] = []

    # Role category — full marks on an exact match, partial when one name
    # contains the other ("Design" vs "Product Design").
    job_cat = (job.role_category or "").strip().lower()
    cand_cat = (profile.role_category or "").strip().lower()
    if job_cat and cand_cat:
        applicable += WEIGHT_ROLE_CATEGORY
        if job_cat == cand_cat:
            total += WEIGHT_ROLE_CATEGORY
            reasons.append({"label": "Discipline matches", "level": MATCH})
        elif job_cat in cand_cat or cand_cat in job_cat:
            total += WEIGHT_ROLE_CATEGORY // 2
            reasons.append({"label": "Discipline close", "level": PARTIAL})

    # Skills — proportional to how much of the job's required list is covered.
    required = _normalise(job.required_skill_names)
    held = _normalise(profile.skill_names)
    if required:
        applicable += WEIGHT_SKILLS
        overlap = required & held
        if overlap:
            total += round(WEIGHT_SKILLS * len(overlap) / len(required))
            label = (
                f"{len(overlap)} skill match"
                if len(overlap) == 1
                else f"{len(overlap)} skills match"
            )
            level = "match" if overlap == required else "partial"
            reasons.append({"label": label, "level": level})

    # Experience level — adjacent levels still count for something.
    levels = [choice[0] for choice in profile._meta.get_field("experience_level").choices]
    if profile.experience_level and job.experience_level:
        applicable += WEIGHT_EXPERIENCE
        try:
            distance = abs(
                levels.index(profile.experience_level) - levels.index(job.experience_level)
            )
        except ValueError:
            distance = len(levels)
        if distance == 0:
            total += WEIGHT_EXPERIENCE
            reasons.append({"label": "Experience level matches", "level": MATCH})
        elif distance == 1:
            total += WEIGHT_EXPERIENCE // 2
            reasons.append({"label": "Experience level close", "level": PARTIAL})

    # Software tools — a smaller signal than skills, but the designs show it
    # as its own chip, so it earns its own weight rather than riding along.
    job_tools = _normalise(_names(job.software_tools))
    held_tools = _normalise(_names(profile.software_tools))
    if job_tools:
        applicable += WEIGHT_SOFTWARE_TOOLS
        overlap = job_tools & held_tools
        if overlap:
            total += round(WEIGHT_SOFTWARE_TOOLS * len(overlap) / len(job_tools))
            label = (
                "1 software tool match"
                if len(overlap) == 1
                else f"{len(overlap)} software tools match"
            )
            reasons.append(
                {
                    "label": label,
                    "level": MATCH if overlap == job_tools else PARTIAL,
                }
            )

    # Work setup — hybrid sits between remote and office, so it part-matches both.
    if profile.preferred_work_setup and job.work_setup:
        applicable += WEIGHT_WORK_SETUP
        if profile.preferred_work_setup == job.work_setup:
            total += WEIGHT_WORK_SETUP
            reasons.append({"label": "Working hours match", "level": MATCH})
        elif "hybrid" in {profile.preferred_work_setup, job.work_setup}:
            total += WEIGHT_WORK_SETUP // 2
            reasons.append({"label": "Working hours partial match", "level": PARTIAL})
        else:
            # Remote against in-office: worth saying so rather than staying
            # silent, since it is usually the reason a good match is not one.
            reasons.append({"label": "Working hours don't match", "level": NONE})

    if not applicable:
        return MatchResult(score=0, reasons=reasons)

    return MatchResult(
        score=min(round(100 * total / applicable), 100), reasons=reasons
    )
