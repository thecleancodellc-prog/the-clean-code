export const metadata = {
  title: "Privacy Policy | The Clean Code",
  description:
    "Learn how The Clean Code collects, uses, and protects your personal information while keeping your experience safe and transparent.",
};

export default function Privacy() {
  return (
    <section className="container py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>

      <p className="text-white/80 mb-6">
        <strong>The Clean Code Co.</strong> values your privacy and is committed to
        protecting your personal information. This policy explains what data we
        collect, how we use it, and your rights as a visitor to{" "}
        <strong>thecleancode.co</strong>.
      </p>

      <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
      <p className="text-white/80 mb-6">
        We may collect basic analytics data (such as page views and device type)
        through cookies or third-party tools like Google Analytics. If you contact
        us via email, we collect your name and email address solely to respond to
        your inquiry. We do not sell, trade, or rent your personal information.
      </p>

      <h2 className="text-xl font-semibold mb-2">2. Cookies & Analytics</h2>
      <p className="text-white/80 mb-6">
        Cookies are small files used to improve your browsing experience. You can
        disable cookies through your browser settings at any time. Analytics tools
        may collect anonymous usage data to help us understand traffic patterns and
        improve site performance.
      </p>

      <h2 className="text-xl font-semibold mb-2">3. Affiliate Links</h2>
      <p className="text-white/80 mb-6">
        Some pages on this site include affiliate links, meaning we may earn a
        small commission if you make a purchase through them. This comes at no
        additional cost to you and helps us keep <strong>The Clean Code</strong>{" "}
        free to use. All affiliate content is clearly disclosed.
      </p>

      <h2 className="text-xl font-semibold mb-2">4. Data Protection</h2>
      <p className="text-white/80 mb-6">
        We implement appropriate security measures to protect your personal
        information against unauthorized access, alteration, or disclosure.
        However, please note that no online platform is 100% secure.
      </p>

      <h2 className="text-xl font-semibold mb-2">5. Contact</h2>
      <p className="text-white/80">
        If you have any questions about this Privacy Policy or how your information
        is handled, please contact us at{" "}
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
