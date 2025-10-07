import { notFound } from "next/navigation";
import { products } from "@/data/products";

const titles = {
  kitchen: "Kitchen Essentials",
  laundry: "Laundry Upgrades",
  cleaning: "Cleaning Staples",
  "personal-care": "Personal Care"
};

export async function generateMetadata({ params }) {
  const title = titles[params.category] || "Guides";
  return { title };
}

export default function GuideCategory({ params }) {
  const items = products.filter(p => p.category === params.category);
  if (!items.length) return notFound();
  const heading = titles[params.category] || "Guides";
  return (
    <section className="container py-10">
      <h1 className="text-3xl font-bold">{heading}</h1>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(p => (
          <article key={p.id} className="card p-6">
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="text-sm text-white/70">{p.brand}</p>
            <a href={p.affiliateUrl || "#"} target="_blank" className="mt-4 inline-block rounded-xl bg-brand-500 px-4 py-2 font-semibold no-underline hover:bg-brand-400">Check Price</a>
          </article>
        ))}
      </div>
    </section>
  );
}
