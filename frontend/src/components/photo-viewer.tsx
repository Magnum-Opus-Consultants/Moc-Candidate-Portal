"use client";

import { useEffect, useRef } from "react";

import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/primitives";

/**
 * A candidate's photo, openable full-screen.
 *
 * The avatar on a profile is 48px, which is not enough to recognise anyone
 * — a hiring manager about to interview someone wants to see their face.
 * Clicking it opens the picture over the page, as LinkedIn does.
 *
 * Built on <dialog showModal()> rather than a hand-rolled overlay: the
 * browser then handles the backdrop, Escape, focus trapping and returning
 * focus to the avatar on close.
 */

export function PhotoViewer({
  url,
  initials,
  name,
  size = "lg",
}: {
  /** Empty when the candidate has not uploaded one. */
  url: string;
  initials: string;
  name: string;
  size?: "md" | "lg" | "xl";
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  // Close when the backdrop itself is clicked. The dialog fills the
  // viewport, so a click lands on it rather than on anything inside.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    function onClick(event: MouseEvent) {
      if (event.target === element) element?.close();
    }
    element.addEventListener("click", onClick);
    return () => element.removeEventListener("click", onClick);
  }, []);

  // Without a photo there is nothing to open.
  if (!url)
    return size === "xl" ? (
      <Avatar initials={initials} size="2xl" tone="soft" />
    ) : (
      <Avatar initials={initials} size={size} />
    );

  const box =
    size === "xl" ? "size-16" : size === "lg" ? "size-12" : "size-9";

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        title={`View ${name}'s photo`}
        className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className={`${box} rounded-full object-cover`}
        />
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center rounded-full bg-ink-strong/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Icon name="expand" className="size-4" />
        </span>
        <span className="sr-only">View {name}&apos;s photo</span>
      </button>

      <dialog
        ref={dialog}
        aria-label={`${name}'s profile photo`}
        className="m-auto max-h-dvh max-w-dvw bg-transparent p-4 backdrop:bg-black/80 open:flex open:items-center open:justify-center"
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`${name}'s profile photo`}
            className="max-h-[80dvh] max-w-[80dvw] rounded-2xl object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full bg-card text-ink shadow-lg transition-colors hover:bg-card-muted"
          >
            <Icon name="close" className="size-4" />
            <span className="sr-only">Close</span>
          </button>
          <p className="mt-3 text-center text-sm font-medium text-white drop-shadow">
            {name}
          </p>
        </div>
      </dialog>
    </>
  );
}
