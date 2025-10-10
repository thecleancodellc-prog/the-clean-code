export const metadata = {
  title: "Terms of Service | The Clean Code",
  description:
    "Review the Terms of Service for The Clean Code — outlining user responsibilities, affiliate disclosures, and fair use of our website.",
};

export default function Terms() {
  return (
    <section className="container py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>

      <p className="text-white/80 mb-6">
        Welcome to <strong>The Clean Code Co.</strong> By accessing or using this
        website (<strong>thecleancode.co</strong>), you agree to comply with and be
        bound by the following terms. Please read them carefully before using the site.
      </p>

      <h2 className="text-xl font-semibold mb-2">1. Use of Our Site</h2>
      <p className="text-white/80 mb-6">
        You may browse and use this site for personal, non-commercial purposes.
        You agree not to misuse any information, content, or features available
        on this website. Copying, redistributing, or altering content without
        permission is prohibited.
      </p>

      <h2 className="text-xl font-semibold mb-2">2. Accuracy of Information</h2>
      <p className="text-white/80 mb-6">
        We aim to provide accurate and up-to-date information; however,{" "}
        <strong>The Clean Code Co.</strong> makes no guarantees about the
        completeness or reliability of any content. Use of any material is at
        your own discretion and risk.
      </p>

      <h2 className="text-xl font-semibold mb-2">3. Affiliate Disclosure</h2>
      <p className="text-white/80 mb-6">
        Some links on this site are affiliate links. If you click and make a
        purchase, we may receive a small commission at no extra cost to you.
        These partnerships help support <strong>The Clean Code</strong> while
        maintaining editorial independence.
      </p>

      <h2 className="text-xl font-semibold mb-2">4. Intellectual Property</h2>
      <p className="text-white/80 mb-6">
        All original text, graphics, logos, and design elements on{" "}
        <strong>thecleancode.co</strong> are the intellectual property of{" "}
        <strong>The Clean Code Co.</strong> or its respective owners. Unauthorized
        reproduction or distribution is prohibited.
      </p>

      <h2 className="text-xl font-semibold mb-2">5. Limitation of Liability</h2>
      <p className="text-white/80 mb-6">
        <strong>The Clean Code Co.</strong> is not liable for any damages or
        losses resulting from use of our site, products, or recommendations.
        All content is provided “as is” for informational purposes only.
      </p>

      <h2 className="text-xl font-semibold mb-2">6. Updates</h2>
      <p className="text-white/80 mb-6">
        We may update these Terms occasionally to reflect changes in our practices
        or for legal reasons. Continued use of the site after updates means you
        accept the new terms.
      </p>

      <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
      <p className="text-white/80">
        For questions about these Terms, please contact us at{" "}
        <a
          href="mailto:support@thecleancode.co"
          className="text-[var(--accent)] underline hover:text-emerald-400"
        >
          support@thecleancode.co
        </a>
        .
      </p>

      <p className="text-white/60 text-sm mt-8">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </section>
  );
}
