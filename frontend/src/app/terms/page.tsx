import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalLink,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms on which you may use the Magnum Opus Consultants careers portal.",
};

/**
 * Terms of service.
 *
 * Deliberately short. This is a careers portal, not a marketplace: nobody
 * pays anything, nothing is sold, and the only real commitments are that
 * what you tell us should be true and that applying is not a job offer.
 * Padding it with clauses that do not apply would only make it less likely
 * to be read.
 *
 * Linked from the Google OAuth consent screen, so it renders without a
 * session.
 */
export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="22 October 2026"
      intro={
        <p>
          These terms apply to the Magnum Opus Consultants careers portal. By
          creating an account or applying for a position through it, you agree
          to them.
        </p>
      }
    >
      <LegalSection heading="What the portal is for">
        <p>
          The portal lets you browse positions that Magnum Opus Consultants
          (Pty) Ltd is recruiting for, build a profile, and apply. It is free to
          use. We never charge candidates a fee of any kind — not to register,
          not to apply, and not to be placed.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <LegalList
          items={[
            "You need to be 18 or older, or have permission from a parent or guardian.",
            "Keep your password to yourself. You are responsible for what happens under your account.",
            "One account per person.",
            "Tell us promptly if you think someone else has access to your account.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What you tell us must be true">
        <p>
          Your profile and your CV should be accurate. Misrepresenting your
          qualifications, employment history or right to work wastes the time of
          everyone involved, and it is a fair reason for us to withdraw an
          application or close an account.
        </p>
        <p>
          Only upload documents that are yours to upload, and do not include
          other people&rsquo;s personal information in them without good reason.
        </p>
      </LegalSection>

      <LegalSection heading="Applying is not an offer">
        <p>
          Submitting an application does not create any obligation on us or on
          an employer to interview you, to respond, or to make an offer.
          Positions can be changed, paused or withdrawn at any time, including
          after you have applied.
        </p>
        <p>
          Where we recruit on behalf of an employer, the hiring decision is
          theirs, not ours.
        </p>
      </LegalSection>

      <LegalSection heading="Recommendations">
        <p>
          The portal suggests positions it calculates as a good fit for your
          profile. These are suggestions produced automatically. A high match is
          not a statement that you will be shortlisted, and a low one is not a
          reason you should not apply.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <LegalList
          items={[
            "Do not use the portal for anything unlawful.",
            "Do not try to access accounts, data or parts of the system that are not yours.",
            "Do not scrape, copy or republish the positions listed here.",
            "Do not upload anything containing malware.",
            "Do not interfere with the running of the portal or with other people's use of it.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Availability">
        <p>
          We aim to keep the portal available, but we do not guarantee it. There
          will be times when it is down for maintenance or for reasons outside
          our control. We are not liable for anything you miss while it is
          unavailable, including a closing date.
        </p>
      </LegalSection>

      <LegalSection heading="Your information">
        <p>
          How we handle your personal information is set out in our{" "}
          <Link
            href="/privacy"
            className="font-medium text-brand-700 underline underline-offset-4 hover:text-brand-800"
          >
            Privacy Policy
          </Link>
          , which forms part of these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Closing your account">
        <p>
          You can delete your account at any time in Settings. We may suspend or
          close an account that breaks these terms, and will normally tell you
          why.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of the Republic of South Africa.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms go to{" "}
          <LegalLink href="mailto:careers@moc-pty.com">
            careers@moc-pty.com
          </LegalLink>{" "}
          or <LegalLink href="tel:+27767401777">+27 76 740 1777</LegalLink>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
