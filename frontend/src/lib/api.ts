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

export type ApplicationEvent = {
  id: number;
  from_status: string;
  from_label: string;
  to_status: string;
  to_label: string;
  note: string;
  created_at: string;
};

export type PipelineStage = { value: string; label: string };

export type Application = {
  id: number;
  job: Job;
  status: string;
  status_label: string;
  /** How far along the recruitment pipeline, 0-based. */
  stage_index: number;
  /** True once the application has ended (not successful, or job closed). */
  is_closed: boolean;
  pipeline: PipelineStage[];
  events: ApplicationEvent[];
  /** What went to the position with this application. */
  sent: {
    profile: boolean;
    profile_completion: number;
    cv: boolean;
    documents: number;
  };
  applied_at: string;
  updated_at: string;
};

export type ApplicationList = {
  results: Application[];
  counts: Record<string, number>;
  pipeline: PipelineStage[];
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

export type AuthUser = {
  id: number;
  name: string;
  initials: string;
  email: string;
  phone: string;
  role: string;
  /** Where this role lands after signing in: /portal or /manager. */
  home: string;
};

export type MutationResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/**
 * On the server, forward the browser's cookies so the Django session — and so
 * request.user — is available while rendering a signed-in page. No-op in the
 * browser, where the cookie rides along with credentials: "include".
 */
async function forwardedHeaders(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {};
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const header = store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    return header ? { cookie: header } : {};
  } catch {
    return {};
  }
}

async function get<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json", ...(await forwardedHeaders()) },
      cache: "no-store",
      credentials: "include",
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

async function send<T = unknown>(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<MutationResult<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(await forwardedHeaders()),
      },
      credentials: "include",
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.detail || data?.error || `Request failed (${response.status})`,
      };
    }
    return { ok: true, data: data as T };
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
  candidateApplications: (query = "") =>
    get<ApplicationList>(`/api/candidate/applications/${query}`),
  candidateSaved: () => get<Listed<Job>>("/api/candidate/saved/"),
  candidateRecommended: () => get<Listed<Job>>("/api/candidate/recommended/"),
  candidateRecentlyViewed: () =>
    get<Listed<Job>>("/api/candidate/recently-viewed/"),
  updateProfile: (data: Record<string, unknown>) =>
    send<CandidateProfile>("POST", "/api/candidate/profile/update/", data),

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

  // Authentication + account (email/password; social providers are later scope).
  me: () => get<AuthUser>("/api/auth/me/"),
  login: (email: string, password: string) =>
    send<AuthUser>("POST", "/api/auth/login/", { email, password }),
  register: (name: string, email: string, password: string) =>
    send<AuthUser>("POST", "/api/auth/register/", { name, email, password }),
  logout: () => send("POST", "/api/auth/logout/"),
  updateName: (name: string) =>
    send<AuthUser>("POST", "/api/account/profile/", { name }),
  updateEmail: (email: string) =>
    send<AuthUser>("POST", "/api/account/email/", { email }),
  changePassword: (current_password: string, new_password: string) =>
    send("POST", "/api/account/password/", { current_password, new_password }),
  deleteAccount: () => send("POST", "/api/account/delete/"),
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
