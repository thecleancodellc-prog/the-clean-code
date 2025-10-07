import Link from "next/link";
import { categories } from "@/data/categories";

export const metadata = { title: "Guides" };

export default function Guides() {
  return (
    <section className="container py-10">
      <h1 className="text-3xl font-bold">Guides by Category</h1>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(c => (
          <Link key={c.slug} href={`/guides/${c.slug}`} className="card p-6 no-underline">
            <h3 className="text-xl font-semibold">{c.name}</h3>
            <p className="mt-2 text-white/80">Shop the best non‑toxic options and learn what actually matters.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
