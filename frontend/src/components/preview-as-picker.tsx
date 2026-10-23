"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/primitives";
import type { JobPreview } from "@/lib/api";

/**
 * Whose eyes to read the posting through.
 *
 * "As a job seeker sees it" answers whether the wording is right.
 * "As Thandi sees it" answers something else — whether she has already
 * applied, whether she saved it and never came back, and what the matcher
 * made of her against this role. That is the question a manager actually
 * has when they open a candidate's name, so it is worth the extra control.
 *
 * A select rather than a list of names: there can be fifty, and this is a
 * tool for checking one thing, not a second candidate list.
 */
export function PreviewAsPicker({
  jobId,
  seekers,
  current,
}: {
  jobId: number;
  seekers: JobPreview["seekers"];
  /** The id currently being viewed as, or "" for the public view. */
  current: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function choose(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("as", value);
    else next.delete("as");

    const query = next.toString();
    startTransition(() =>
      router.push(`/manager/jobs/${jobId}/preview${query ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Icon name="profile" className="size-4 shrink-0 text-ink-subtle" />
      <span className="text-ink-muted">Viewing as</span>
      <select
        value={current}
        disabled={pending}
        onChange={(event) => choose(event.target.value)}
        className={cn(
          "rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-ink",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
          pending && "opacity-60",
        )}
      >
        <option value="">Anyone (the public view)</option>
        {seekers.map((seeker) => (
          <option key={seeker.id} value={String(seeker.id)}>
            {seeker.name}
            {seeker.applied ? " — applied" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
