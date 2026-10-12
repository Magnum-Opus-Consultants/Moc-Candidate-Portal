import { Suspense } from "react";

import {
  ManagerShell,
  ManagerSidebar,
  ManagerSidebarSkeleton,
} from "@/components/manager-shell";

export default function ManagerLayout({ children }: LayoutProps<"/manager">) {
  return (
    <ManagerShell
      sidebar={
        <Suspense fallback={<ManagerSidebarSkeleton />}>
          <ManagerSidebar />
        </Suspense>
      }
    >
      {children}
    </ManagerShell>
  );
}
