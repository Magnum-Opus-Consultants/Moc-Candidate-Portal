import type { Metadata } from "next";

import { MaintenanceWatcher } from "@/components/maintenance-watcher";
import { SystemAction, SystemIcon, SystemPage } from "@/components/system-page";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Back soon",
  description:
    "The Magnum Opus Consultants careers portal is briefly unavailable while we carry out an update.",
  // Nothing here should be indexed: it is a temporary state, and a search
  // engine that caches it will keep showing it after the work is done.
  robots: { index: false, follow: false },
};

/**
 * The maintenance page.
 *
 * Shown while the portal is down for planned work. It renders from nothing
 * — no API call, no session — because the whole point is that it still
 * works when the backend does not.
 *
 * No back button, per the design's developer notes: going back cannot help
 * while the platform is down. The one action is "Go to home page", which
 * loads normally again once the work is finished.
 *
 * The claim that saved information is safe is kept because it is true —
 * maintenance here is a deploy against an untouched database, so profiles,
 * saved positions and submitted applications are not at risk. The notes
 * say to drop that line if it is ever not guaranteed.
 */
export default function MaintenancePage() {
  return (
    <SystemPage
      icon={
        <SystemIcon>
          <Icon name="settings" className="size-10" />
        </SystemIcon>
      }
      title="We’ll be back shortly"
      supportSubject="MOC Candidate Portal — maintenance"
      body={
        <>
          We&rsquo;re carrying out a short update to the portal.
          <br />
          Your saved information is safe, and nothing you submitted has been
          lost.
        </>
      }
      actions={
        <SystemAction href="/">
          <Icon name="home" className="size-5" />
          Go to home page
        </SystemAction>
      }
      note={<MaintenanceWatcher />}
    />
  );
}
