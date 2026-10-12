import { Suspense } from "react";

import {
  AvatarSkeleton,
  CandidateAvatar,
  CandidateShell,
} from "@/components/candidate-shell";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <CandidateShell
      avatar={
        <Suspense fallback={<AvatarSkeleton />}>
          <CandidateAvatar />
        </Suspense>
      }
    >
      {children}
    </CandidateShell>
  );
}
