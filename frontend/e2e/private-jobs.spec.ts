import { test, expect, type Page } from "@playwright/test";

/**
 * Private jobs, end to end.
 *
 * What a Private posting means here (Development Plan, day 11): it is off
 * the public job board, but it is not closed. The hiring manager keeps its
 * applicants and keeps the Suggested tab, so they can go on matching
 * candidates to a role that is not being advertised.
 *
 * The transition itself is driven through the real UI, because the API
 * already had these moves — what was missing, and what this is really
 * covering, is that a manager can reach them. Signing in and creating the
 * fixture go through the API instead: they are setup, not the subject, and
 * doing them through forms made the suite fail on hydration races rather
 * than on anything to do with private jobs.
 */

/*
 * localhost, matching the origin the browser uses for the API. Mixing
 * 127.0.0.1 and localhost here splits the cookie jar as well as tripping
 * CORS, so the page would be signed in and the API calls would not.
 */
const API = process.env.E2E_API_URL ?? "http://localhost:8002";
const MANAGER = { email: "sarah.chen@moc-pty.com", password: "portal-demo" };
const SEEKER = { email: "priya.naidoo@example.com", password: "portal-demo" };

/** A title nothing else can match, so every search here is unambiguous. */
const TITLE = `E2E Private Job ${Date.now()}`;

let jobId: number;

/**
 * Sign in over the API. page.request shares the browser context's cookie
 * jar, so the pages that follow are signed in exactly as they would be
 * after using the form.
 */
async function signIn(page: Page, who: { email: string; password: string }) {
  await page.request.get(`${API}/api/jobs/`);
  const token = await csrf(page);
  const response = await page.request.post(`${API}/api/auth/login/`, {
    headers: { "X-CSRFToken": token, Referer: `${API}/` },
    data: who,
  });
  expect(response.ok(), `could not sign in as ${who.email}`).toBeTruthy();
}

async function csrf(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "csrftoken")?.value ?? "";
}

/** Is this posting on the public board right now? */
async function onPublicBoard(page: Page): Promise<boolean> {
  const response = await page.request.get(
    `${API}/api/jobs/?search=${encodeURIComponent(TITLE)}`,
  );
  const body = (await response.json()) as { results: Array<{ id: number }> };
  return body.results.some((job) => job.id === jobId);
}

/**
 * Click, then check it took, and retry if it did not.
 *
 * A click before React has hydrated goes nowhere — the handler is not
 * attached yet — and in dev that window is wide enough to matter. Retrying
 * the pair is the honest fix: it waits for the app to actually be usable,
 * rather than sleeping and hoping.
 */
async function clickUntil(page: Page, name: RegExp, expectation: () => Promise<void>) {
  const button = page.getByRole("button", { name }).first();
  await expect(button).toBeVisible({ timeout: 60_000 });
  await expect(async () => {
    await button.click({ timeout: 10_000 });
    await expectation();
  }).toPass({ timeout: 120_000 });
}

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext();
  const alive = await ctx.get(`${API}/api/jobs/`).catch(() => null);
  expect(alive?.ok(), `the Django API is not answering on ${API}`).toBeTruthy();

  // Create the fixture live, so the test owns it and can clean it up.
  let token = (await ctx.storageState()).cookies.find((c) => c.name === "csrftoken");
  await ctx.post(`${API}/api/auth/login/`, {
    headers: { "X-CSRFToken": token?.value ?? "", Referer: `${API}/` },
    data: MANAGER,
  });
  token = (await ctx.storageState()).cookies.find((c) => c.name === "csrftoken");

  const created = await ctx.post(`${API}/api/manager/jobs/create/`, {
    headers: { "X-CSRFToken": token?.value ?? "", Referer: `${API}/` },
    data: {
      title: TITLE,
      company: "Kestrel Software",
      role_category: "Engineering",
      description: "Created by the private-jobs end-to-end test.",
      status: "active",
    },
  });
  expect(created.ok(), "could not create the fixture posting").toBeTruthy();
  const body = await created.json();
  jobId = body.id ?? body.job?.id;
  expect(jobId, "the fixture posting has no id").toBeTruthy();
  await ctx.dispose();
});

test.afterAll(async ({ playwright }) => {
  // A suite that leaves litter makes the next run ambiguous.
  if (!jobId) return;
  const ctx = await playwright.request.newContext();
  await ctx.get(`${API}/api/jobs/`);
  let token = (await ctx.storageState()).cookies.find((c) => c.name === "csrftoken");
  await ctx.post(`${API}/api/auth/login/`, {
    headers: { "X-CSRFToken": token?.value ?? "", Referer: `${API}/` },
    data: MANAGER,
  });
  token = (await ctx.storageState()).cookies.find((c) => c.name === "csrftoken");
  await ctx.post(`${API}/api/manager/jobs/${jobId}/delete/`, {
    headers: { "X-CSRFToken": token?.value ?? "", Referer: `${API}/` },
  });
  await ctx.dispose();
});

test("a published job starts on the public board", async ({ page }) => {
  await signIn(page, MANAGER);
  expect(await onPublicBoard(page)).toBeTruthy();

  await page.goto(`/manager/jobs/${jobId}`);
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
});

test("the manager can make it private from the posting page", async ({ page }) => {
  await signIn(page, MANAGER);
  await page.goto(`/manager/jobs/${jobId}`);

  await clickUntil(page, /make private/i, async () => {
    await expect(
      page.getByRole("button", { name: /yes, make private/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  await page.getByRole("button", { name: /yes, make private/i }).click();
  await expect(page.getByText("Private", { exact: true }).first()).toBeVisible();
});

test("a private job is off the public board and out of search", async ({ page }) => {
  await signIn(page, MANAGER);
  expect(
    await onPublicBoard(page),
    "a private job must not be on the public board",
  ).toBeFalsy();

  // And a candidate browsing normally never comes across it.
  await signIn(page, SEEKER);
  await page.goto(`/?q=${encodeURIComponent(TITLE)}`);
  await expect(page.getByRole("heading", { name: TITLE })).toHaveCount(0);
});

test("the manager still sees matched candidates for it", async ({ page }) => {
  await signIn(page, MANAGER);
  await page.goto(`/manager/jobs/${jobId}`);

  await expect(page.getByText("Private", { exact: true }).first()).toBeVisible();

  // The half of the brief that is easy to lose: a private posting is still
  // being worked on, so matching has to keep running for it.
  const detail = await page.request.get(`${API}/api/manager/jobs/${jobId}/`);
  const body = (await detail.json()) as {
    job: { status: string };
    tabs: { suggested: unknown[] };
  };
  expect(body.job.status).toBe("private");
  expect(
    body.tabs.suggested.length,
    "a private posting should still suggest candidates",
  ).toBeGreaterThan(0);
});

test("it can be put back on the board", async ({ page }) => {
  await signIn(page, MANAGER);
  await page.goto(`/manager/jobs/${jobId}`);

  await clickUntil(page, /publish job/i, async () => {
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  expect(
    await onPublicBoard(page),
    "republishing should put it back on the board",
  ).toBeTruthy();
});
