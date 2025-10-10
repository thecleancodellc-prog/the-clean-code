export const metadata = {
  title: "About | The Clean Code",
  description:
    "Discover The Clean Code — a modern guide to cleaner living through science, simplicity, and practical product choices.",
};

export default function About() {
  return (
    <section className="container py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">About The Clean Code</h1>

      <p className="text-white/80 mb-6">
        The Clean Code was created with one goal: to make clean living simple,
        science-guided, and actually achievable. We cut through greenwashing and
        marketing fluff to bring you practical swaps, minimal-ingredient products,
        and routines that work in the real world.
      </p>

      <p className="text-white/80 mb-6">
        Every recommendation on this site is field-tested by our team and verified
        for both safety and performance. Our mission is to help you reduce exposure
        to harmful chemicals, improve everyday wellness, and live more intentionally —
        without the overwhelm.
      </p>

      <p className="text-white/70">
        Whether you’re just starting your clean-living journey or refining it,
        we’re here to make each step easier. Cleaner choices. Clearer guidance.
        That’s <strong>The Clean Code</strong>.
      </p>
    </section>
  );
}
