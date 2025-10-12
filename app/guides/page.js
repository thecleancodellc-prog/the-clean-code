import Link from "next/link";
import Image from "next/image";
import { categories } from "@/data/categories";

export const metadata = { title: "Guides | The Clean Code" };

export default function Guides() {
  return (
    <section className="container py-10">
      <h1 className="text-3xl font-bold mb-3">Guides by Category</h1>
      <p className="text-white/70 max-w-2xl mb-8">
        Explore toxin-free living by category. Learn what matters most in each area
        of your home and shop products that meet The Clean Code standard.
      </p>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/guides/${c.slug}`}
            className="card group overflow-hidden no-underline"
          >
            <div className="relative h-48 w-full rounded-xl overflow-hidden">
              <Image
                src={c.image}
                alt={c.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <h3 className="text-xl font-semibold">{c.name}</h3>
              <p className="mt-2 text-white/70">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
