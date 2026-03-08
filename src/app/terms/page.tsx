import Link from "next/link";

export const metadata = {
  title: "Terms of Service — OneKural",
};

export default function TermsPage() {
  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-dark/50 dark:text-dark-fg/60 mb-6 hover:text-emerald transition-colors"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold text-dark dark:text-dark-fg mb-2">Terms of Service</h1>
      <p className="text-xs text-dark/40 dark:text-dark-fg/40 mb-8">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-dark/80 dark:text-dark-fg/75 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Overview</h2>
          <p>
            By using OneKural (&ldquo;the app&rdquo;), you agree to these Terms of Service.
            If you do not agree, please do not use the app. We may update these terms
            from time to time; continued use of the app constitutes acceptance of
            any changes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Use of the App</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>OneKural is a personal, non-commercial daily reading app for the Thirukkural.</li>
            <li>
              You are responsible for keeping your account credentials secure and
              for any activity that occurs under your account.
            </li>
            <li>
              You agree not to misuse the app — including attempting to disrupt,
              reverse-engineer, or access it in unauthorised ways.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Content & Accuracy</h2>
          <p className="mb-3">
            The Thirukkural text, transliterations, and scholar commentaries are
            sourced from publicly available open-source datasets and are presented
            for personal reading and reflection.
          </p>
          <p className="mb-3">
            Some kural explanations and supplementary content on this app are
            AI-generated. While we aim for accuracy, AI-generated content may
            contain errors, omissions, or imprecise interpretations. We recommend
            consulting authoritative Tamil scholarship for academic or religious
            purposes.
          </p>
          <p>
            We make no guarantees about the completeness or accuracy of any
            content and accept no liability for decisions made based on it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">User-Generated Content</h2>
          <p>
            Journal reflections you write are private to your account and are not
            shared with other users or third parties. You retain ownership of
            your journal content. By saving content to our servers, you grant us
            a limited licence to store and display it to you within the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Push Notifications</h2>
          <p>
            Daily reminder notifications are opt-in only. You may disable them
            at any time from your Profile settings. We send at most one
            notification per day.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Intellectual Property</h2>
          <p>
            The OneKural app design, code, and branding are our property. The
            Thirukkural is an ancient public-domain work. Scholar commentary
            translations are attributed to their respective authors and are used
            for educational purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Disclaimer of Warranties</h2>
          <p>
            The app is provided &ldquo;as is&rdquo; without warranties of any kind. We do
            not guarantee uninterrupted availability and are not responsible for
            any loss of data or service interruptions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Governing Law</h2>
          <p>
            These terms are governed by applicable law. Any disputes will be
            resolved in good faith through direct communication before any formal
            proceedings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark dark:text-dark-fg mb-2">Contact</h2>
          <p>
            For questions about these terms, email us at{" "}
            <a
              href="mailto:stharunvikram@gmail.com"
              className="text-emerald hover:underline"
            >
              stharunvikram@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
