
import { JobChips } from "@/components/job-cards";
import { SaveForLaterButton, ShareButton } from "@/components/job-actions";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Card,
  JOB_STATUS_TONE,
  MatchChip,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/primitives";
import { formatDate, skillName, type Job } from "@/lib/api";

/**
 * A posting as a job seeker sees it.
 *
 * Shared by the public job page and the hiring manager's Preview, so the
 * preview is the candidate's view by construction rather than by a second
 * copy of this markup that would drift.
 *
 * `readOnly` is for Preview: the manager is looking at a candidate's page,
 * not using it, so Apply and Save are shown in place but inert.
 */
export function JobDetailView({
  job,
  readOnly = false,
}: {
  job: Job;
  readOnly?: boolean;
}) {
  return (
    <>
      {/* Job details overview — the section header from the designs. */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-strong">
                {job.title}
              </h1>
              <StatusBadge
                label={job.status_label}
                tone={JOB_STATUS_TONE[job.status] ?? "grey"}
              />
            </div>
            <p className="mt-1 text-sm font-medium text-brand-700">
              {job.role_category}
            </p>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Icon name="building" className="mt-0.5 size-4 text-ink-subtle" />
              <div>
                <dt className="text-xs text-ink-subtle">Hiring company</dt>
                <dd className="font-medium text-ink">{job.company}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Icon name="calendar" className="mt-0.5 size-4 text-ink-subtle" />
              <div>
                <dt className="text-xs text-ink-subtle">Applications close</dt>
                <dd className="font-medium text-ink">{formatDate(job.closes_at)}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <JobChips job={job} />
        </div>

        {job.match && job.match.reasons.length > 0 ? (
          <div className="mt-5 rounded-lg bg-brand-50 p-4">
            <p className="text-sm font-medium text-ink-strong">
              {job.match.score}% match with your profile
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.match.reasons.map((reason) => (
                <MatchChip
                  key={reason.label}
                  label={reason.label}
                  level={reason.level}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          {readOnly ? (
            <>
              <Button disabled>Apply now</Button>
              <Button variant="outline" disabled>
                <Icon name="bookmark" className="size-3.5" />
                Save for later
              </Button>
            </>
          ) : (
            <>
              <Button
                href={
                  job.has_applied || job.status === "closed"
                    ? undefined
                    : `/signup?apply=${job.id}`
                }
                disabled={job.has_applied || job.status === "closed"}
              >
                {job.has_applied ? "Already applied" : "Apply now"}
              </Button>
              <SaveForLaterButton
                jobId={job.id}
                initialSaved={job.is_saved ?? false}
              />
              <ShareButton jobId={job.id} />
            </>
          )}
          <span className="ml-auto text-xs text-ink-subtle">
            Last updated {formatDate(job.updated_at)}
          </span>
        </div>
      </Card>

      <section className="mt-6">
        <SectionHeading title="Job specification" />
        <Card className="p-6">
          <p className="leading-relaxed text-ink-muted">{job.description}</p>

          {job.required_skills.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ink-strong">
                Skills and tools
              </h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {job.required_skills.map((skill) => (
                  <li
                    key={skillName(skill)}
                    className="rounded-md border border-line px-2 py-1 text-xs text-ink-muted"
                  >
                    {skillName(skill)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </section>
    </>
  );
}
