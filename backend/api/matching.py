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
WEIGHT_ROLE_CATEGORY = 40
WEIGHT_SKILLS = 35
WEIGHT_EXPERIENCE = 15
WEIGHT_WORK_SETUP = 10


@dataclass
class MatchResult:
    score: int
    reasons: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"score": self.score, "reasons": self.reasons}


def _normalise(values) -> set[str]:
    return {str(v).strip().lower() for v in values if str(v).strip()}


def score_match(profile: CandidateProfile | None, job: Job) -> MatchResult:
    """Score one candidate against one position, 0-100, with the reasons."""
    if profile is None:
        return MatchResult(score=0, reasons=[])

    total = 0
    reasons: list[dict] = []

    # Role category — full marks on an exact match, partial when one name
    # contains the other ("Design" vs "Product Design").
    job_cat = (job.role_category or "").strip().lower()
    cand_cat = (profile.role_category or "").strip().lower()
    if job_cat and cand_cat:
        if job_cat == cand_cat:
            total += WEIGHT_ROLE_CATEGORY
            reasons.append({"label": "Role category", "level": "match"})
        elif job_cat in cand_cat or cand_cat in job_cat:
            total += WEIGHT_ROLE_CATEGORY // 2
            reasons.append({"label": "Role category partial match", "level": "partial"})

    # Skills — proportional to how much of the job's required list is covered.
    required = _normalise(job.required_skills)
    held = _normalise(profile.skills)
    if required:
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
        try:
            distance = abs(
                levels.index(profile.experience_level) - levels.index(job.experience_level)
            )
        except ValueError:
            distance = len(levels)
        if distance == 0:
            total += WEIGHT_EXPERIENCE
            reasons.append({"label": "Experience level", "level": "match"})
        elif distance == 1:
            total += WEIGHT_EXPERIENCE // 2
            reasons.append({"label": "Experience level close", "level": "partial"})

    # Work setup — hybrid sits between remote and office, so it part-matches both.
    if profile.preferred_work_setup and job.work_setup:
        if profile.preferred_work_setup == job.work_setup:
            total += WEIGHT_WORK_SETUP
            reasons.append({"label": "Working hours match", "level": "match"})
        elif "hybrid" in {profile.preferred_work_setup, job.work_setup}:
            total += WEIGHT_WORK_SETUP // 2
            reasons.append({"label": "Working hours partial match", "level": "partial"})

    return MatchResult(score=min(total, 100), reasons=reasons)
