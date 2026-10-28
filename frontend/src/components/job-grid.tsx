import { JobGridCard } from "@/components/job-cards";
import { cn } from "@/components/ui/primitives";
import { type Job } from "@/lib/api";

/**
 * The jobs grid.
 *
 * Four across at full width, as the frame lays it out, falling back through
 * three and two as the window narrows.
 *
 * Deleting is not offered here. It lives on a posting's own page, where the
 * applicant count and the status are in front of you — the two things that
 * decide whether deleting is the right move at all.
 */
export function JobGrid({ jobs, view }: { jobs: Job[]; view: "grid" | "list" }) {
  return (
    <div
      className={cn(
        "grid gap-5",
        view === "grid"
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-1",
      )}
    >
      {jobs.map((job) => (
        <JobGridCard key={job.id} job={job} />
      ))}
    </div>
  );
}
