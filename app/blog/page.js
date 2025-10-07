import Link from "next/link";
import { posts } from "@/data/posts";

export const metadata = {
  title: "Blog"
};

export default function Blog() {
  const sorted = [...posts].sort((a,b) => new Date(b.date) - new Date(a.date));
  return (
    <section className="container py-10">
      <h1 className="text-3xl font-bold">Latest Articles</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {sorted.map((p) => (
          <article key={p.slug} className="card p-6">
            <h3 className="text-xl font-semibold">
              <Link href={`/blog/${p.slug}`} className="no-underline hover:underline">{p.title}</Link>
            </h3>
            <p className="mt-2 text-white/80">{p.excerpt}</p>
            <p className="mt-2 text-xs text-white/60">{new Date(p.date).toLocaleDateString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
