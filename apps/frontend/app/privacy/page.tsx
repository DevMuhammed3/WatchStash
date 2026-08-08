import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — WatchStash",
  description:
    "WatchStash Privacy Policy. Learn how we collect, use, and protect your personal information.",
};

const LAST_UPDATED = "August 8, 2026";

export default function PrivacyPage() {
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
          <span className="text-secondary">Privacy Policy</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose-custom mt-10 space-y-8 text-[15px] leading-relaxed text-secondary">
          <Section title="1. Introduction">
            <p>
              This Privacy Policy describes how WatchStash (&quot;we&quot;,
              &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects
              your personal information when you use our application and
              services. By using WatchStash, you agree to the collection and
              use of information as described in this policy.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following types of information:</p>

            <h3 className="mt-4 text-base font-medium text-primary">
              Account Information
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Username and display name</li>
              <li>Email address</li>
              <li>Profile picture (if provided)</li>
              <li>Account preferences and settings</li>
            </ul>

            <h3 className="mt-4 text-base font-medium text-primary">
              OAuth Provider Information
            </h3>
            <p>
              When you sign in using a third-party provider (Google, GitHub,
              Facebook, or X), we receive basic profile information from that
              provider, which may include:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Name and username</li>
              <li>Email address</li>
              <li>Profile picture</li>
              <li>A unique provider identifier (used to link your account)</li>
            </ul>

            <h3 className="mt-4 text-base font-medium text-primary">
              User Content
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Watchlists and media tracking data</li>
              <li>Ratings, reviews, and personal notes</li>
              <li>Social interactions (followers, following)</li>
            </ul>

            <h3 className="mt-4 text-base font-medium text-primary">
              Usage Data
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Pages viewed and actions taken within the Service</li>
              <li>Timestamps of activity</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>We use your information to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Authenticate your identity and manage your account.</li>
              <li>Personalize your experience.</li>
              <li>
                Communicate with you about updates, security alerts, and
                support.
              </li>
              <li>
                Monitor and analyze usage trends to improve the Service.
              </li>
              <li>Detect, prevent, and address technical issues and abuse.</li>
            </ul>
          </Section>

          <Section title="4. How We Store and Protect Your Information">
            <p>
              Your data is stored on secure servers. We implement industry-
              standard security measures including encryption in transit (TLS)
              and at rest where supported by our infrastructure. Access to
              personal information is restricted to authorized personnel who
              need it to operate the Service.
            </p>
            <p>
              While we take reasonable precautions, no method of electronic
              storage or transmission is completely secure. We cannot guarantee
              absolute security of your data.
            </p>
          </Section>

          <Section title="5. Third-Party OAuth Providers">
            <p>
              When you use OAuth to sign in, your authentication is handled
              directly by the third-party provider (Google, GitHub, Facebook,
              or X). We do not store your third-party login credentials. We
              receive only the basic profile information you authorize us to
              access.
            </p>
            <p>
              Each provider handles your data according to their own privacy
              policies:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>Google:</strong>{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  Google Privacy Policy
                </a>
              </li>
              <li>
                <strong>GitHub:</strong>{" "}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  GitHub Privacy Statement
                </a>
              </li>
              <li>
                <strong>Facebook:</strong>{" "}
                <a
                  href="https://www.facebook.com/privacy/policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  Facebook Privacy Policy
                </a>
              </li>
              <li>
                <strong>X (Twitter):</strong>{" "}
                <a
                  href="https://x.com/en/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent transition-colors hover:text-accent-hover"
                >
                  X Privacy Policy
                </a>
              </li>
            </ul>
          </Section>

          <Section title="6. Cookies and Session Data">
            <p>
              WatchStash uses authentication tokens stored in your browser to
              maintain your session. These tokens are necessary for the
              Service to function and are not used for tracking or advertising
              purposes.
            </p>
            <p>
              We do not use third-party analytics cookies or advertising
              trackers. The Service does not currently respond to &quot;Do Not
              Track&quot; signals from browsers.
            </p>
          </Section>

          <Section title="7. Data Retention">
            <p>
              We retain your personal information for as long as your account
              is active or as needed to provide the Service. If you delete your
              account, we will remove your personal data from our active
              systems within a reasonable timeframe.
            </p>
            <p>
              Some data may be retained in backup or archival storage for a
              limited period to comply with legal obligations or resolve
              disputes.
            </p>
          </Section>

          <Section title="8. Account and Data Deletion">
            <p>
              You may delete your account at any time through the Service
              settings or by contacting us. Upon deletion, we will permanently
              remove your account information and User Content from our active
              systems.
            </p>
            <p>
              Account deletion is irreversible. Please make sure you have
              backed up any data you wish to keep before requesting deletion.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>
              Depending on your location, you may have the right to:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your personal data.</li>
              <li>Object to or restrict certain processing of your data.</li>
              <li>Data portability — receive your data in a portable format.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a
                href="mailto:contact@watchstash.app"
                className="text-accent transition-colors hover:text-accent-hover"
              >
                contact@watchstash.app
              </a>
              .
            </p>
          </Section>

          <Section title="10. Children&apos;s Privacy">
            <p>
              WatchStash is not directed to individuals under the age of 13
              (or the applicable age of digital consent in your jurisdiction).
              We do not knowingly collect personal information from children. If
              you believe a child has provided us with personal information,
              please contact us and we will delete it.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we
              make material changes, we will update the &quot;Last updated&quot;
              date at the top of this page and, where appropriate, notify you
              through the Service or by email. We encourage you to review this
              policy periodically.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at{" "}
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
