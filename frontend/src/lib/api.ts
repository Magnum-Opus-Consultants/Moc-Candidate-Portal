/**
 * Client for the Django API.
 *
 * Every call returns an ApiResult rather than throwing, so a backend that is
 * down renders as a visible state on the page instead of a 500 — which is the
 * common case in local development, when only one half is running.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Where to send API requests.
 * - Browser: the configured URL, or "" (relative) in dev so requests ride the
 *   same-origin /api rewrite — which keeps cookies and CORS happy.
 * - Server (SSR): must be absolute — the configured URL, else the dev backend.
 */
function apiBase(): string {
  if (typeof window !== "undefined") return API_BASE_URL;
  return API_BASE_URL || process.env.DEV_API_PROXY || "http://127.0.0.1:8001";
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** "none" is an outright mismatch, which the designs colour red. */
export type MatchReason = {
  label: string;
  level: "match" | "partial" | "none";
};
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
  /** {name, level} where level is required / preferred / optional. */
  required_skills: Array<
    { name: string; level?: string; proficiency?: string } | string
  >;
  posted_at: string | null;
  closes_at: string | null;
  updated_at: string;
  applicant_count: number;
  new_applicant_count: number;
  /** Closing inside the next week, so the UI can warn. */
  closes_soon: boolean;
  days_until_close: number | null;

  // The detail view
  company_industry: string;
  company_location: string;
  about_company: string;
  key_responsibilities: string[];
  software_tools: SkillEntry[];
  advantageous_tools: string[];
  working_hours_start: number | null;
  working_hours_end: number | null;
  working_hours_label: string;
  working_hours_count: number | null;
  // The posting form — everything the hiring manager can set. Serialised by
  // JobSerializer, so an edit can seed the form from what is stored.
  ideal_start_date: string | null;
  hr_email: string;
  hr_phone: string;
  candidate_location: string;
  night_shift: string;
  flexible_hours: boolean;
  citizenship_requirement: string;
  language_requirements: Array<{ language: string; proficiency: string }>;
  minimum_years_experience: number | null;
  industry_experience: string;
  education_requirement: string;
  field_of_study: string;
  salary_currency: string;
  salary_min: string | null;
  salary_max: string | null;
  salary_period: string;
  benefits: string[];
  /** Who the posting belongs to, for "Last edited by". */
  created_by_name?: string;

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

export type SkillEntry = {
  name: string;
  proficiency: string;
  importance?: string;
};

export type LanguageEntry = { language: string; proficiency: string };

export type WorkExperienceEntry = {
  id?: number;
  job_title: string;
  company_name: string;
  employment_type: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  reason_for_leaving: string;
  key_responsibilities: string[];
};

export type CandidateProfile = {
  id: number;
  user: UserSummary;

  // Personal details
  headline: string;
  preferred_name: string;
  country_of_residence: string;
  location: string;
  profile_status: string;
  languages: LanguageEntry[];
  linkedin_url: string;
  portfolio_url: string;
  photo_url: string;
  summary: string;

  // Optional EE information
  gender: string;
  nationality: string;
  citizenship: string;
  ethnicity: string;
  has_disability: boolean | null;
  disability_detail: string;

  // Career details
  role_category: string;
  secondary_role_category: string;
  employment_status: string;
  availability: string;
  experience_level: string;
  preferred_work_setup: string;
  timezone_availability: string;
  night_shift: string;

  // Education
  highest_education_level: string;
  field_of_study: string;
  graduation_year: number | null;
  institution_name: string;

  // Experience
  experience: WorkExperienceEntry[];
  education: Array<{
    id?: number;
    level: string;
    level_label?: string;
    field_of_study: string;
    institution_name: string;
    graduation_year: number | string | null;
    is_current: boolean;
  }>;

  // Remuneration & benefits
  current_salary_currency: string;
  current_salary_amount: string | null;
  current_salary_period: string;
  expected_salary_currency: string;
  expected_salary_amount: string | null;
  expected_salary_period: string;
  benefits: string[];

  // Skills & tools. Older rows hold plain strings.
  skills: Array<SkillEntry | string>;
  software_tools: SkillEntry[];

  // Privacy & profile sharing
  do_not_share_with: string;
  sharing_agreed: boolean;

  // Derived
  completion: number;
  strength: string;
  can_download_branded_cv: boolean;
  sections: ProfileSection[];
  updated_at: string;
};

/** Choice lists for the profile form's dropdowns, from /api/options/. */
export type ProfileOptions = {
  profile_status: Array<{ value: string; label: string }>;
  employment_status: Array<{ value: string; label: string }>;
  availability: Array<{ value: string; label: string }>;
  experience_level: Array<{ value: string; label: string }>;
  work_setup: Array<{ value: string; label: string }>;
  employment_type: Array<{ value: string; label: string }>;
  night_shift: Array<{ value: string; label: string }>;
  education_level: Array<{ value: string; label: string }>;
  proficiency: Array<{ value: string; label: string }>;
  salary_period: Array<{ value: string; label: string }>;
  importance: Array<{ value: string; label: string }>;
  role_categories: Array<{ value: string; label: string }>;
  language: Array<{ value: string; label: string }>;
  citizenship_requirement: Array<{ value: string; label: string }>;
  industry_experience: Array<{ value: string; label: string }>;
  years_experience: Array<{ value: string; label: string }>;
  language_proficiency: Array<{ value: string; label: string }>;
  gender: Array<{ value: string; label: string }>;
  ethnicity: Array<{ value: string; label: string }>;
  nationality: Array<{ value: string; label: string }>;
  citizenship: Array<{ value: string; label: string }>;
  country: Array<{ value: string; label: string }>;
  timezone: Array<{ value: string; label: string }>;
  benefits: Array<{ value: string; label: string }>;
  currency: Array<{ value: string; label: string }>;
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
  /** Matching the current tab, not every application. */
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  pipeline: PipelineStage[];
};

/**
 * What the candidate pane beside the applicant list shows.
 *
 * The same shape on an applicant and on a suggestion: the pane is the same
 * pane whichever tab opened it, and a manager comparing the two should not
 * find half the detail missing on one of them.
 */
export type CandidatePane = {
  role_title: string;
  summary: string;
  years_experience: number | null;
  availability_label: string;
  skills: string[];
  education: string;
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
  saved: boolean;
  pane: CandidatePane;
};

export type SuggestedCandidate = {
  candidate: UserSummary;
  headline: string;
  location: string;
  match: Match;
  saved: boolean;
  pane: CandidatePane;
};

export type Activity = {
  id: number;
  actor: UserSummary;
  verb: string;
  target: string;
  created_at: string;
};

/** A trigger an automatic email can fire on, and how it can be narrowed. */
export type EmailTrigger = {
  value: string;
  label: string;
  placeholders: string[];
  conditions: Array<{
    field: string;
    label: string;
    options: Array<{ value: string; label: string }>;
  }>;
};

/** One email the portal has sent, or tried to. */
export type EmailLogEntry = {
  id: number;
  trigger: string;
  trigger_label: string;
  template_label: string;
  recipient: string;
  subject: string;
  body: string;
  status: "sent" | "failed";
  status_label: string;
  error: string;
  about: string;
  created_at: string;
};

export type EmailsPage = {
  results: AutomaticEmail[];
  triggers: EmailTrigger[];
  log: EmailLogEntry[];
};

export type AutomaticEmail = {
  id: number;
  event: string;
  label: string;
  subject: string;
  /** The line a mail client shows beside the subject. */
  preheader: string;
  body: string;
  /** True once the wording has been edited in the rich editor. */
  body_is_html: boolean;
  trigger: string;
  trigger_label: string;
  conditions: Record<string, string>;
  is_active: boolean;
  /** False for the three the Client supplied: switchable off, not deletable. */
  is_custom: boolean;
  send_count: number;
  updated_at: string;
};

export type JobCategory = {
  name: string;
  job_count: number;
  new_count: number;
  /** A discipline MOC recruits for with nothing live right now. */
  coming_soon: boolean;
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

/** A posting rendered as a seeker sees it, and who else can be looked through. */
export type JobPreview = {
  job: Job & { viewing_as: UserSummary | null };
  seekers: Array<UserSummary & { applied: boolean }>;
};

export type ManagerJobDetail = {
  job: Job;
  /** The three counts along the top of the job detail view. */
  stats: { total: number; saved: number; new: number };
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
    const response = await fetch(`${apiBase()}${path}`, {
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


/**
 * The Django CSRF token for the current session.
 *
 * Auth is a session cookie, so every state-changing request must carry the
 * matching CSRF token or Django rejects it. In the browser the token is read
 * from the csrftoken cookie, and if it is not there yet one GET of /auth/me/
 * (which is decorated with ensure_csrf_cookie) issues it. On the server the
 * token comes from the forwarded cookie header.
 */
function readCookie(jar: string, name: string): string {
  const match = jar.match(new RegExp(`(?:^|;\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function csrfToken(forwarded: Record<string, string>): Promise<string> {
  if (typeof window === "undefined") {
    return readCookie(forwarded.cookie ?? "", "csrftoken");
  }

  const existing = readCookie(document.cookie, "csrftoken");
  if (existing) return existing;

  // No cookie yet — this is the visitor's first state-changing request.
  try {
    await fetch(`${apiBase()}/api/auth/me/`, {
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    /* offline; the request below will surface the real error */
  }
  return readCookie(document.cookie, "csrftoken");
}

/**
 * Post the job posting form, create or edit.
 *
 * Its own path rather than `send`, because a validation failure names which
 * fields were rejected and why, and the form rings those fields and scrolls
 * to the first of them.
 */
async function postJobForm(
  path: string,
  job: Record<string, unknown>,
): Promise<CreateJobResult> {
  try {
    const forwarded = await forwardedHeaders();
    const token = await csrfToken(forwarded);

    const response = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...forwarded,
        ...(token ? { "X-CSRFToken": token } : {}),
      },
      credentials: "include",
      body: JSON.stringify(job),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data.detail ?? `${response.status} ${response.statusText}`,
        fields: Array.isArray(data.fields) ? data.fields : undefined,
        fieldErrors:
          data.field_errors && typeof data.field_errors === "object"
            ? (data.field_errors as Record<string, string>)
            : undefined,
      };
    }
    // Create answers with the job itself; edit wraps it alongside a message.
    return { ok: true, data: (data.job ?? data) as Job };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function send<T = unknown>(
  method: "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<MutationResult<T>> {
  try {
    const forwarded = await forwardedHeaders();
    const token = await csrfToken(forwarded);

    const response = await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...forwarded,
        ...(token ? { "X-CSRFToken": token } : {}),
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

/**
 * The job list, with a count per filter option so the page can show what
 * each choice would do before it is clicked.
 */
export type ManagerJobList = {
  results: Job[];
  count: number;
  /** Every posting per status, so headings count more than one page. */
  status_counts: Record<string, number>;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type JobList = {
  results: Job[];
  facets: Record<string, Record<string, number>>;
  /** Matching this search and these filters. */
  count: number;
  /** Every publicly listed posting, regardless of filters. */
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

/**
 * The status moves a manager can make on a posting, matching the backend's
 * JOB_TRANSITIONS. Publishing is deliberately absent: it is the one move the
 * server validates the posting for, so it has its own endpoint and its own
 * error shape.
 */
export type JobStatusAction = "pause" | "close" | "private" | "draft";

/** Which external identity providers have credentials configured. */
export type AuthProviders = {
  linkedin: boolean;
  google: boolean;
};

/** What a parsed CV offers to fill in, keyed as the profile update expects. */
export type CvSuggestions = {
  suggestions: Record<string, unknown>;
  fields: number;
  cv_name: string;
};

/** Creating a job names the required fields that were left empty. */
/** A hiring manager's note on a candidate, seen by the whole team. */
export type CandidateComment = {
  id: number;
  author: { id: number; name: string; initials: string };
  body: string;
  created_at: string;
};

export type CreateJobResult =
  | { ok: true; data: Job }
  | {
      ok: false;
      error: string;
      /** Field names the server rejected, in the order to visit them. */
      fields?: string[];
      /** Why each one was rejected, keyed by field name. */
      fieldErrors?: Record<string, string>;
    };

/** The Recommended Jobs page: the same shape as the job list, plus `ranked`. */
export type RecommendedList = {
  results: Job[];
  facets: Record<string, Record<string, number>>;
  count: number;
  /** How many of `count` were actually scored. */
  ranked: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

/** The candidate database: multi-select filters with counts, and paging. */
export type CandidateList = {
  results: CandidateProfile[];
  facets: Record<string, Record<string, number>>;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export const api = {
  jobs: (query = "") => get<JobList>(`/api/jobs/${query}`),
  jobCategories: () => get<Listed<JobCategory>>("/api/jobs/categories/"),
  profileOptions: () => get<ProfileOptions>("/api/options/"),
  job: (id: number | string) => get<Job>(`/api/jobs/${id}/`),

  candidateDashboard: () => get<CandidateDashboard>("/api/candidate/dashboard/"),
  candidateProfile: () => get<CandidateProfile>("/api/candidate/profile/"),
  /**
   * Upload a CV and get suggested profile fields back.
   *
   * Multipart rather than JSON, so it cannot go through `send`: the browser
   * has to set its own multipart boundary, which means no Content-Type
   * header of ours.
   */
  /** Upload a profile photo. Multipart, so it cannot go through `send`. */
  uploadPhoto: async (file: File): Promise<MutationResult<{ photo_url: string }>> => {
    try {
      const forwarded = await forwardedHeaders();
      const token = await csrfToken(forwarded);
      const form = new FormData();
      form.append("photo", file);

      const response = await fetch(`${apiBase()}/api/candidate/profile/photo/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...forwarded,
          ...(token ? { "X-CSRFToken": token } : {}),
        },
        credentials: "include",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: data.detail ?? `${response.status} ${response.statusText}`,
        };
      }
      return { ok: true, data: data as { photo_url: string } };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
  removePhoto: () =>
    send<{ photo_url: string }>("DELETE", "/api/candidate/profile/photo/"),
  uploadCv: async (file: File): Promise<MutationResult<CvSuggestions>> => {
    try {
      const forwarded = await forwardedHeaders();
      const token = await csrfToken(forwarded);
      const form = new FormData();
      form.append("cv", file);

      const response = await fetch(`${apiBase()}/api/candidate/profile/cv/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...forwarded,
          ...(token ? { "X-CSRFToken": token } : {}),
        },
        credentials: "include",
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: data.detail ?? `${response.status} ${response.statusText}`,
        };
      }
      return { ok: true, data: data as CvSuggestions };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
  updateCandidateProfile: (patch: Record<string, unknown>) =>
    send<CandidateProfile>("POST", "/api/candidate/profile/update/", patch),
  candidateApplications: (query = "") =>
    get<ApplicationList>(`/api/candidate/applications/${query}`),
  candidateSaved: (query = "") =>
    get<Listed<Job>>(`/api/candidate/saved/${query}`),
  candidateRecommended: (query = "") =>
    get<RecommendedList>(`/api/candidate/recommended/${query}`),
  candidateRecentlyViewed: () =>
    get<Listed<Job>>("/api/candidate/recently-viewed/"),
  updateProfile: (data: Record<string, unknown>) =>
    send<CandidateProfile>("POST", "/api/candidate/profile/update/", data),
  applyToJob: (id: number | string) =>
    send<{ detail: string; application: Application }>(
      "POST",
      `/api/jobs/${id}/apply/`,
    ),
  toggleSave: (id: number | string) =>
    send<{ saved: boolean }>("POST", `/api/jobs/${id}/save/`),

  /**
   * Post a new job. Shares `postJobForm` with the edit route, because both
   * answer with the fields that failed and the form marks them.
   */
  createJob: (job: Record<string, unknown>) =>
    postJobForm("/api/manager/jobs/create/", job),
  managerDashboard: () => get<ManagerDashboard>("/api/manager/dashboard/"),
  managerJobs: (query = "") => get<ManagerJobList>(`/api/manager/jobs/${query}`),
  managerJob: (id: number | string) =>
    get<ManagerJobDetail>(`/api/manager/jobs/${id}/`),
  /**
   * A posting as a job seeker sees it. With `as`, as that seeker sees it —
   * their saved and applied state, and their match.
   */
  managerJobPreview: (id: number | string, as?: string) =>
    get<JobPreview>(
      `/api/manager/jobs/${id}/preview/${as ? `?as=${encodeURIComponent(as)}` : ""}`,
    ),
  /**
   * Publish an approved posting. 409 means it is already live; 400 carries
   * `fields` when a draft is still missing something the public list needs.
   */
  publishJob: (id: number | string) =>
    send<{ detail: string; job: Job }>("POST", `/api/manager/jobs/${id}/publish/`),
  /**
   * Move a posting between states: pause, close, make private, or send it
   * back to draft. Publishing has its own call because it is the one
   * transition the server validates the posting for.
   */
  setJobStatus: (id: number | string, action: JobStatusAction) =>
    send<{ detail: string; job: Job }>("POST", `/api/manager/jobs/${id}/status/`, {
      action,
    }),
  /** Save edits to an existing posting. A live job updates on the board at once. */
  updateJob: (id: number | string, job: Record<string, unknown>) =>
    postJobForm(`/api/manager/jobs/${id}/update/`, job),
  /** Copy a posting into a new draft, carrying no applicants or posted date. */
  duplicateJob: (id: number | string) =>
    send<{ detail: string; job: Job }>(
      "POST",
      `/api/manager/jobs/${id}/duplicate/`,
    ),
  /** Delete a posting nobody has applied to; 409 when it has applicants. */
  deleteJob: (id: number | string) =>
    send<{ detail: string }>("POST", `/api/manager/jobs/${id}/delete/`),
  /**
   * Delete several at once. Partial by design: postings with applicants are
   * kept and named back in `detail`, rather than failing the whole batch.
   */
  deleteJobs: (ids: number[]) =>
    send<{ detail: string; deleted: number; kept: string[] }>(
      "POST",
      "/api/manager/jobs/delete/",
      { ids },
    ),
  managerCandidates: (query = "") =>
    get<CandidateList>(`/api/manager/candidates/${query}`),
  /** Leave a note on a candidate for the whole hiring team to see. */
  addCandidateComment: (id: number | string, body: string) =>
    send<{ comment: CandidateComment }>(
      "POST",
      `/api/manager/candidates/${id}/comments/`,
      { body },
    ),
  /** Remove a note you wrote. The server refuses someone else's. */
  deleteCandidateComment: (id: number | string, commentId: number) =>
    send<{ detail: string }>(
      "POST",
      `/api/manager/candidates/${id}/comments/${commentId}/delete/`,
    ),
  managerCandidate: (id: number | string) =>
    get<{
      profile: CandidateProfile;
      applications: Application[];
      comments: CandidateComment[];
      is_bookmarked: boolean;
      shortlisted_job_ids: number[];
    }>(
      `/api/manager/candidates/${id}/`,
    ),
  /** Personal to the manager; returns the state it landed in. */
  bookmarkCandidate: (candidateId: number) =>
    send<{ bookmarked: boolean }>(
      "POST",
      `/api/manager/candidates/${candidateId}/bookmark/`,
    ),
  /** Shared with the hiring team, so it belongs to a posting. */
  shortlistCandidate: (candidateId: number, jobId: number) =>
    send<{ shortlisted: boolean; job_id: number }>(
      "POST",
      `/api/manager/candidates/${candidateId}/shortlist/`,
      { job_id: jobId },
    ),
  managerEmails: () => get<EmailsPage>("/api/manager/emails/"),
  /** Save an email's wording. Sends after this use it; the log keeps history. */
  saveEmail: (id: number, data: Record<string, unknown>) =>
    send<{ detail: string; email: AutomaticEmail }>(
      "POST",
      `/api/manager/emails/${id}/save/`,
      data,
    ),
  /** Add an email on one of the supported triggers. */
  createEmail: (data: Record<string, unknown>) =>
    send<{ detail: string; email: AutomaticEmail }>(
      "POST",
      "/api/manager/emails/create/",
      data,
    ),
  /** Delete an email added in the portal; the supplied three return 409. */
  deleteEmail: (id: number) =>
    send<{ detail: string }>("POST", `/api/manager/emails/${id}/delete/`),

  // Authentication + account.
  me: () => get<AuthUser>("/api/auth/me/"),
  /** Which external sign-in buttons are configured on the backend. */
  authProviders: () => get<AuthProviders>("/api/auth/providers/"),
  login: (email: string, password: string, remember = true) =>
    send<AuthUser>("POST", "/api/auth/login/", { email, password, remember }),
  register: (
    name: string,
    email: string,
    password: string,
    remember = true,
  ) =>
    send<AuthUser>("POST", "/api/auth/register/", {
      name,
      email,
      password,
      remember,
    }),
  logout: () => send("POST", "/api/auth/logout/"),
  /**
   * Ask for a reset link. Always reports success, whether or not the
   * address has an account — the server answers the same way on purpose,
   * because "no account with that email" tells a stranger who has been
   * job hunting.
   */
  requestPasswordReset: (email: string) =>
    send<{ detail: string }>("POST", "/api/auth/password-reset/", { email }),
  /** Set a new password from a link. 400 means the link has expired. */
  confirmPasswordReset: (uid: string, token: string, new_password: string) =>
    send<{ detail: string }>("POST", "/api/auth/password-reset/confirm/", {
      uid,
      token,
      new_password,
    }),
  /** Another verification link, for an address that has not been proved. */
  resendVerification: (email: string) =>
    send<{ detail: string }>("POST", "/api/auth/verify/resend/", { email }),
  updateName: (name: string) =>
    send<AuthUser>("POST", "/api/account/profile/", { name }),
  updateEmail: (email: string) =>
    send<AuthUser>("POST", "/api/account/email/", { email }),
  changePassword: (current_password: string, new_password: string) =>
    send("POST", "/api/account/password/", { current_password, new_password }),
  deleteAccount: () => send("POST", "/api/account/delete/"),
};

/* --- Formatting helpers shared by the pages -------------------------------- */

/**
 * A skill's name, whichever shape it is in.
 *
 * The profile form stores {name, proficiency, importance} objects; older rows
 * and the seed hold plain strings. Mirrors CandidateProfile.skill_names on the
 * backend.
 */
export function skillName(entry: { name: string } | string): string {
  return typeof entry === "string" ? entry : entry.name;
}

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
  // Wording follows the designs: "1 day ago" rather than "Yesterday", and
  // whole weeks once past six days.
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
