/**
 * Client for the Django API.
 *
 * Every call returns an ApiResult rather than throwing, so a backend that is
 * down renders as a visible state on the page instead of a 500 — which is the
 * common case in local development, when only one half is running.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type MatchReason = { label: string; level: "match" | "partial" };
export type Match = { score: number; reasons: MatchReason[] };

export type Job = {
  id: number;
  title: string;
  role_category: string;
  company: string;
  location: string;
  description: string;
  work_setup: string;
  work_setup_label: string;
  salary_label: string;
  experience_level: string;
  experience_label: string;
  employment_type: string;
  employment_label: string;
  timezone_label: string;
  status: string;
  status_label: string;
  required_skills: string[];
  posted_at: string | null;
  closes_at: string | null;
  updated_at: string;
  applicant_count: number;
  new_applicant_count: number;
  match?: Match;
  saved_at?: string;
  viewed_at?: string;
  has_applied?: boolean;
  is_saved?: boolean;
};

export type UserSummary = {
  id: number;
  name: string;
  initials: string;
  email: string;
  phone: string;
  role: string;
};

export type ProfileSection = {
  slug: string;
  label: string;
  progress: number;
  completed: boolean;
};

export type CandidateProfile = {
  id: number;
  user: UserSummary;
  headline: string;
  location: string;
  summary: string;
  skills: string[];
  role_category: string;
  experience_level: string;
  preferred_work_setup: string;
  completion: number;
  strength: string;
  can_download_branded_cv: boolean;
  sections: ProfileSection[];
  updated_at: string;
};

export type Application = {
  id: number;
  job: Job;
  status: string;
  status_label: string;
  applied_at: string;
  updated_at: string;
};

export type Applicant = {
  id: number;
  candidate: UserSummary;
  headline: string;
  location: string;
  status: string;
  status_label: string;
  applied_at: string;
  match: Match;
};

export type SuggestedCandidate = {
  candidate: UserSummary;
  headline: string;
  location: string;
  match: Match;
};

export type Activity = {
  id: number;
  actor: UserSummary;
  verb: string;
  target: string;
  created_at: string;
};

export type AutomaticEmail = {
  id: number;
  event: string;
  label: string;
  subject: string;
  body: string;
  updated_at: string;
};

export type JobCategory = {
  name: string;
  job_count: number;
  new_count: number;
};

export type CandidateDashboard = {
  user: UserSummary;
  profile: CandidateProfile;
  stats: {
    active_applications: number;
    total_applications: number;
    saved_jobs: number;
    shortlisted: number;
  };
  recent_applications: Application[];
  recommended_jobs: Job[];
};

export type ManagerDashboard = {
  user: UserSummary | null;
  stats: {
    open_jobs: number;
    draft_jobs: number;
    total_applicants: number;
    new_applicants: number;
  };
  jobs: Job[];
  activity: Activity[];
};

export type ManagerJobDetail = {
  job: Job;
  tabs: {
    all: Applicant[];
    shortlisted: Applicant[];
    favourites: Applicant[];
    suggested: SuggestedCandidate[];
  };
};

async function get<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, error: `${response.status} ${response.statusText}` };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

type Listed<T> = { results: T[] };

export const api = {
  jobs: (query = "") => get<Listed<Job>>(`/api/jobs/${query}`),
  jobCategories: () => get<Listed<JobCategory>>("/api/jobs/categories/"),
  job: (id: number | string) => get<Job>(`/api/jobs/${id}/`),

  candidateDashboard: () => get<CandidateDashboard>("/api/candidate/dashboard/"),
  candidateProfile: () => get<CandidateProfile>("/api/candidate/profile/"),
  candidateApplications: () =>
    get<Listed<Application>>("/api/candidate/applications/"),
  candidateSaved: () => get<Listed<Job>>("/api/candidate/saved/"),
  candidateRecommended: () => get<Listed<Job>>("/api/candidate/recommended/"),
  candidateRecentlyViewed: () =>
    get<Listed<Job>>("/api/candidate/recently-viewed/"),

  managerDashboard: () => get<ManagerDashboard>("/api/manager/dashboard/"),
  managerJobs: (query = "") => get<Listed<Job>>(`/api/manager/jobs/${query}`),
  managerJob: (id: number | string) =>
    get<ManagerJobDetail>(`/api/manager/jobs/${id}/`),
  managerCandidates: (query = "") =>
    get<Listed<CandidateProfile>>(`/api/manager/candidates/${query}`),
  managerCandidate: (id: number | string) =>
    get<{ profile: CandidateProfile; applications: Application[] }>(
      `/api/manager/candidates/${id}/`,
    ),
  managerEmails: () => get<Listed<AutomaticEmail>>("/api/manager/emails/"),
};

/* --- Formatting helpers shared by the pages -------------------------------- */

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function relativeDays(value: string | null | undefined): string {
  if (!value) return "";
  const days = Math.round(
    (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
