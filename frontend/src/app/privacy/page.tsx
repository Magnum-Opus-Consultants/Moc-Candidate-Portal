import type { Metadata } from "next";

import {
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Magnum Opus Consultants collects, uses and protects the personal information you give the careers portal.",
};

/**
 * The privacy policy.
 *
 * Written against what the portal actually does rather than from a template:
 * the account, the profile, the CV and its parsing, the photo, applications,
 * the matching, the emails and the cookies are each named because each is a
 * real processing activity in this codebase. A policy that describes a
 * different system is worse than none, because it is a statement the company
 * cannot stand behind.
 *
 * Google's OAuth consent screen links here, so it must be publicly reachable
 * without a session.
 */
export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="22 October 2026"
      intro={
        <>
          <p>
            This policy explains what personal information Magnum Opus
            Consultants (Pty) Ltd collects through this careers portal, why we
            collect it, who sees it and what you can do about it.
          </p>
          <p className="mt-4">
            It is written for the portal specifically. It covers the account you
            create here, the profile you build, the CV you upload and the
            applications you submit.
          </p>
        </>
      }
    >
      <LegalSection heading="Who we are">
        <p>
          Magnum Opus Consultants (Pty) Ltd is a recruitment company in South
          Africa. For the purposes of the Protection of Personal Information
          Act, 2013 (POPIA), we are the responsible party for the information
          described below.
        </p>
        <p>
          You can reach us at{" "}
          <LegalLink href="mailto:careers@moc-pty.com">
            careers@moc-pty.com
          </LegalLink>{" "}
          or <LegalLink href="tel:+27767401777">+27 76 740 1777</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>Only what the portal needs in order to work:</p>
        <LegalList
          items={[
            <>
              <strong className="font-medium text-ink-strong">
                Account details
              </strong>{" "}
              — your name, email address and a password. If you sign in with
              Google or LinkedIn instead, we receive your name, email address
              and profile picture from them, and nothing else. We never see your
              Google or LinkedIn password.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Your profile
              </strong>{" "}
              — contact details, location, work history, education, skills,
              languages, availability, salary expectation, work setup preference
              and the other fields in the profile form. Some of these are
              optional and marked as such.
            </>,
            <>
              <strong className="font-medium text-ink-strong">Your CV</strong> —
              the file you upload. We read text from it to suggest values for
              your profile, so you do not have to retype what the CV already
              says. The suggestions are yours to accept or change, and we keep
              the file itself so it can be sent with an application.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Your profile photo
              </strong>{" "}
              — if you add one. We resize it and strip the metadata that cameras
              attach, including location, before storing it.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Your activity on the portal
              </strong>{" "}
              — the positions you apply to, save or view, so the portal can show
              you your applications and recommend relevant roles.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Equity information
              </strong>{" "}
              — if you choose to provide it. This section is optional and you
              can leave it blank.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Why we use it">
        <LegalList
          items={[
            "To create and run your account, and to let you sign back in.",
            "To put your application in front of the hiring manager for a position you applied to.",
            "To match you against open positions and recommend ones that fit, based on your skills, experience, location and preferences.",
            "To email you about your account and your applications — for example confirming an application or telling you its status has changed.",
            "To keep the portal secure and working, and to meet our legal obligations.",
          ]}
        />
        <p>
          We do not sell your information, and we do not use it for advertising.
        </p>
      </LegalSection>

      <LegalSection heading="Who sees it">
        <LegalList
          items={[
            <>
              <strong className="font-medium text-ink-strong">
                Our recruitment team
              </strong>{" "}
              — so they can consider you for positions.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Employers we recruit for
              </strong>{" "}
              — when you apply to one of their positions, or where you have
              agreed we may put you forward. We share your profile and CV for
              that purpose.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Service providers
              </strong>{" "}
              — the hosting and email providers that run the portal on our
              behalf, under agreements that limit them to that purpose.
            </>,
            <>
              <strong className="font-medium text-ink-strong">
                Anyone the law requires
              </strong>{" "}
              — where we are obliged to disclose.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          The portal sets a cookie to keep you signed in and a second one to
          protect forms against cross-site request forgery. Both are necessary
          for the portal to function and neither tracks you across other sites.
        </p>
        <p>
          Your light or dark theme choice is stored in your own browser and
          never reaches us.
        </p>
        <p>We do not use advertising or analytics cookies.</p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          We keep your profile for as long as your account exists, so that you
          do not have to rebuild it each time you apply. If you delete your
          account we remove your profile, your CV and your photo.
        </p>
        <p>
          Records of applications you have submitted may be retained for as long
          as we are required to keep them, or for as long as is necessary to
          deal with a dispute.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>Under POPIA you may:</p>
        <LegalList
          items={[
            "Ask what personal information we hold about you.",
            "Correct anything that is wrong — most of it you can edit yourself in your profile.",
            "Ask us to delete your information, or delete your account yourself in Settings.",
            "Object to how we are using your information.",
            "Complain to the Information Regulator of South Africa.",
          ]}
        />
        <p>
          To exercise any of these, email{" "}
          <LegalLink href="mailto:careers@moc-pty.com">
            careers@moc-pty.com
          </LegalLink>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Security">
        <p>
          The portal is served over HTTPS, passwords are stored hashed rather
          than in a readable form, and access to candidate information is
          limited to the people who need it. No system is perfectly secure, but
          we take reasonable steps to protect what you give us.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          If we change this policy we will update the date at the top of the
          page. Where a change materially affects you, we will tell you.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
