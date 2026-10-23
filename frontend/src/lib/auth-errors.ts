/**
 * What each external sign-in failure means, in words a candidate can act on.
 *
 * The backend redirects back with a short code rather than a sentence, so the
 * wording lives here. A plain module, not part of auth-layout: a "use client"
 * module exposes only client references to the server, so a Server Component
 * reading this table out of one would silently get undefined for every key.
 */
export const AUTH_ERRORS: Record<string, string> = {
  linkedin_unconfigured:
    "LinkedIn sign-in is not switched on yet. Please sign up with your email address.",
  linkedin_denied: "LinkedIn sign-in was cancelled.",
  linkedin_state: "That sign-in link has expired. Please try again.",
  linkedin_no_code: "LinkedIn did not finish the sign-in. Please try again.",
  linkedin_no_token: "LinkedIn did not finish the sign-in. Please try again.",
  linkedin_unreachable: "Could not reach LinkedIn just now. Please try again.",
  linkedin_no_email:
    "Your LinkedIn account has no verified email address, so we cannot create an account from it.",

  google_unconfigured:
    "Google sign-in is not switched on yet. Please sign up with your email address.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "That sign-in link has expired. Please try again.",
  google_no_code: "Google did not finish the sign-in. Please try again.",
  google_no_token: "Google did not finish the sign-in. Please try again.",
  google_unreachable: "Could not reach Google just now. Please try again.",
  google_no_email:
    "Your Google account has no email address we can use, so we cannot create an account from it.",
  // Only reachable while the OAuth app is in Testing, where Google will not
  // release an unverified address — but a candidate should still be told
  // something they can act on rather than shown a bare code.
  google_unverified_email:
    "That Google account's email address is not verified. Please verify it with Google and try again.",
};
