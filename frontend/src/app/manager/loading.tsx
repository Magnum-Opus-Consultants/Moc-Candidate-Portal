import { LoadingPanel } from "@/components/loading-page";

export default function Loading() {
  return (
    <LoadingPanel
      title="Loading your workspace"
      body="One moment while we fetch your postings and applicants."
    />
  );
}
