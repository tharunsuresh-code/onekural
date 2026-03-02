import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — OneKural",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-content mx-auto px-6 pt-10 pb-24">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-dark/50 mb-6 hover:text-saffron transition-colors"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold text-dark mb-2">Privacy Policy</h1>
      <p className="text-xs text-dark/40 mb-8">Last updated: March 2026</p>

      <div className="space-y-8 text-sm text-dark/80 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-dark mb-2">Overview</h2>
          <p>
            OneKural (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the app&rdquo;) is a daily
            Thirukkural reading app. We are committed to protecting your privacy.
            This policy explains what data we collect, how we use it, and your
            choices.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark mb-2">Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account information:</strong> If you sign in with Google,
              we receive your name, email address, and profile picture from
              Google. This is used solely to identify your account.
            </li>
            <li>
              <strong>Journal reflections:</strong> Text you write in the
              journal feature. Stored securely in your account. Anonymous
              users&apos; journals are stored only on their device
              (localStorage).
            </li>
            <li>
              <strong>Favourites:</strong> Kural IDs you mark as favourites,
              stored in your account or on-device if not signed in.
            </li>
            <li>
              <strong>Push notification subscription:</strong> If you enable
              daily reminders, we store your browser&apos;s push subscription
              endpoint and a randomly generated device ID. We do not link this
              to personal identifiers unless you are signed in.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark mb-2">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To sync your journal and favourites across devices when signed in.</li>
            <li>To send a single daily Thirukkural push notification if you opt in.</li>
            <li>We do not use your data for advertising, profiling, or sale to third parties.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark mb-2">Third-Party Services</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Supabase</strong> — our database and authentication
              provider. Your data is stored on Supabase&apos;s infrastructure.
              See{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:underline"
              >
                supabase.com/privacy
              </a>.
            </li>
            <li>
              <strong>Google OAuth</strong> — used for sign-in. We only receive
              the basic profile information Google provides after you consent.
              See{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:underline"
              >
                Google&apos;s Privacy Policy
              </a>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark mb-2">Data Retention</h2>
          <p>
            Your account data is retained as long as your account exists. You
            may delete your journal entries at any time within the app. To
            request full account deletion, contact us at the email below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark mb-2">Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. The &ldquo;last
            updated&rdquo; date at the top will reflect any changes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-dark mb-2">Contact</h2>
          <p>
            For privacy questions or data deletion requests, email us at{" "}
            <a
              href="mailto:stharunvikram@gmail.com"
              className="text-saffron hover:underline"
            >
              stharunvikram@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
