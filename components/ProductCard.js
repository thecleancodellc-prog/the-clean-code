import Link from "next/link";

export default function ProductCard({ p }) {
  return (
    <article className="card p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{p.title}</h3>
          <p className="text-sm text-white/70">{p.brand} &middot; {p.price}</p>
        </div>
        <div className="rounded-xl bg-brand-500/20 px-2 py-1 text-xs">★ {p.rating}</div>
      </header>
      <ul className="mt-4 grid list-disc gap-1 pl-5 text-sm text-white/80">
        {p.pros.map((x, idx) => <li key={idx}>{x}</li>)}
      </ul>
      {p.cons?.length ? (
        <details className="mt-3 text-sm text-white/70">
          <summary className="cursor-pointer">Cons</summary>
          <ul className="mt-2 list-disc pl-5">{p.cons.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </details>
      ) : null}
      <div className="mt-6">
        <Link
          href={p.affiliateUrl || "#"}
          className="rounded-xl bg-white px-4 py-2 font-semibold text-ink-900 no-underline hover:bg-brand-300"
          target="_blank"
        >
          View Price
        </Link>
      </div>
    </article>
  );
}
