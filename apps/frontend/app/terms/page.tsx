import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — WatchStash",
  description:
    "WatchStash Terms of Service. Read the terms governing your use of WatchStash.",
};

const LAST_UPDATED = "August 8, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <nav className="mb-8 text-sm">
          <Link
            href="/"
            className="text-muted transition-colors hover:text-secondary"
          >
            WatchStash
          </Link>
          <span className="mx-2 text-subtle">/</span>
          <span className="text-secondary">Terms of Service</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose-custom mt-10 space-y-8 text-[15px] leading-relaxed text-secondary">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using WatchStash (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree
              to these terms, you must not access or use the Service.
            </p>
          </Section>

          <Section title="2. User Accounts">
            <p>
              To use certain features you must create an account. You are
              responsible for maintaining the confidentiality of your
              credentials and for all activity that occurs under your account.
              You agree to provide accurate and complete information when
              creating your account and to update it as necessary.
            </p>
            <p>
              You must notify us immediately if you suspect unauthorized access
              to your account. We are not liable for any loss or damage arising
              from unauthorized use of your account.
            </p>
          </Section>

          <Section title="3. OAuth Authentication">
            <p>
              WatchStash supports sign-in through third-party OAuth providers
              including Google, GitHub, Facebook, and X (Twitter). When you
              authenticate through a third-party provider, you grant WatchStash
              access to basic profile information (such as your name, email
              address, and profile picture) as permitted by that provider.
            </p>
            <p>
              Your use of third-party authentication services is subject to
              their own terms and policies. We do not control and are not
              responsible for the practices of third-party providers.
            </p>
          </Section>

          <Section title="4. User Responsibilities">
            <p>You agree to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                Use the Service only for lawful purposes and in accordance with
                these Terms.
              </li>
              <li>
                Not interfere with or disrupt the Service, servers, or networks
                connected to the Service.
              </li>
              <li>
                Not attempt to gain unauthorized access to any part of the
                Service.
              </li>
              <li>
                Not use the Service to transmit any harmful, fraudulent, or
                illegal content.
              </li>
              <li>
                Comply with all applicable laws and regulations.
              </li>
            </ul>
          </Section>

          <Section title="5. Prohibited Uses">
            <p>
              You may not use the Service to engage in any activity that:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Violates any applicable law or regulation.</li>
              <li>
                Infringes the rights of any third party, including intellectual
                property rights.
              </li>
              <li>
                Is fraudulent, deceptive, or misleading.
              </li>
              <li>
                Involves the distribution of malware or other harmful code.
              </li>
              <li>
                Collects or harvests personal information of other users without
                their consent.
              </li>
              <li>
                Engages in automated or bot-driven access to the Service without
                our written permission.
              </li>
            </ul>
          </Section>

          <Section title="6. User-Generated Content">
            <p>
              The Service allows you to create, store, and manage content such
              as watchlists, ratings, and reviews (&quot;User Content&quot;).
              You retain ownership of your User Content.
            </p>
            <p>
              By submitting User Content to the Service, you grant WatchStash a
              non-exclusive, worldwide, royalty-free license to host, store,
              and display your User Content solely for the purpose of operating
              and improving the Service.
            </p>
            <p>
              You are solely responsible for your User Content. We do not
              monitor or review User Content and assume no responsibility for
              it.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              The Service, including its design, code, features, and branding,
              is owned by WatchStash and protected by copyright, trademark, and
              other intellectual property laws. You may not copy, modify,
              distribute, or reverse-engineer any part of the Service without
              our prior written consent.
            </p>
          </Section>

          <Section title="8. Third-Party Services">
            <p>
              The Service may integrate with or link to third-party services.
              We are not responsible for the availability, accuracy, or
              practices of third-party services. Your use of third-party
              services is governed by their respective terms and policies.
            </p>
          </Section>

          <Section title="9. Service Availability and Changes">
            <p>
              We strive to keep the Service available at all times, but we do
              not guarantee uninterrupted access. We may temporarily suspend
              or restrict access to the Service for maintenance, updates, or
              any reason beyond our reasonable control.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any part
              of the Service at any time with or without notice. We will not be
              liable for any modification, suspension, or discontinuation of the
              Service.
            </p>
          </Section>

          <Section title="10. Account Termination">
            <p>
              You may delete your account at any time through the Service
              settings or by contacting us. Upon deletion, your account data
              will be permanently removed from our active systems.
            </p>
            <p>
              We reserve the right to suspend or terminate your account if you
              violate these Terms or if we reasonably believe your use of the
              Service poses a risk to us or other users. We will make reasonable
              efforts to notify you before or after taking such action.
            </p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as
              available&quot; without warranties of any kind, whether express
              or implied, including but not limited to implied warranties of
              merchantability, fitness for a particular purpose, and
              non-infringement.
            </p>
            <p>
              We do not warrant that the Service will be error-free,
              uninterrupted, or free of harmful components.
            </p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, WatchStash and
              its affiliates, officers, employees, and agents shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising out of or related to your use of the
              Service, including but not limited to loss of data, loss of
              profits, or business interruption, even if we have been advised
              of the possibility of such damages.
            </p>
            <p>
              Our total liability for any claims arising out of or related to
              these Terms or the Service shall not exceed the amount you paid
              to us in the twelve (12) months preceding the claim, or $50 if
              no payment was made.
            </p>
          </Section>

          <Section title="13. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When we make
              material changes, we will update the &quot;Last updated&quot;
              date at the top of this page and, where appropriate, notify you
              through the Service or by email. Your continued use of the
              Service after changes take effect constitutes acceptance of the
              revised Terms.
            </p>
          </Section>

          <Section title="14. Contact Us">
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a
                href="mailto:contact@watchstash.app"
                className="text-accent transition-colors hover:text-accent-hover"
              >
                contact@watchstash.app
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-secondary"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-primary">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
