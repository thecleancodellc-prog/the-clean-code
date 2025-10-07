import Link from "next/link";

export default function Hero() {
  return (
    <section className="container py-16 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight">
        Cleaner living, without the overwhelm.
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-white/80">
        Science‑guided swaps, short ingredient lists, and practical routines. Start with
        the highest‑impact changes and build momentum.
      </p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/guides"
          className="rounded-2xl bg-brand-500 px-6 py-3 font-semibold no-underline hover:bg-brand-400"
        >
          Start with Guides
        </Link>
        <Link
          href="/blog"
          className="rounded-2xl border border-white/20 px-6 py-3 no-underline hover:bg-white/5"
        >
          Read the Blog
        </Link>
      </div>
    </section>
  );
}
