export const metadata = {
  title: "Support | The Clean Code",
  description:
    "Need help or have feedback? Contact The Clean Code support team — we're here to assist with any questions or issues.",
};

export default function Support() {
  return (
    <section className="container py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Support</h1>

      <p className="text-white/80 mb-6">
        Have questions, feedback, or an issue with your experience on{" "}
        <strong>The Clean Code</strong>? We’re always happy to help.
      </p>

      <p className="text-white/80">
        Reach out to us anytime at{" "}
        <a
          href="mailto:support@thecleancode.co"
          className="text-[var(--accent)] underline hover:text-emerald-400"
        >
          support@thecleancode.co
        </a>
        . We usually respond within <strong>24–48 hours</strong>.
      </p>
    </section>
  );
}
