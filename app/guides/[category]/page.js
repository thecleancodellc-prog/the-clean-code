import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { products } from "@/data/products";
import { posts } from "@/data/posts";
import { categories } from "@/data/categories";

export async function generateMetadata({ params }) {
  const cat = categories.find(c => c.slug === params.category);
  return {
    title: cat ? `${cat.name} | Guides | The Clean Code` : "Guides | The Clean Code",
    description: cat?.description || "Explore Clean Code approved products and guides.",
  };
}

export default function GuideCategory({ params }) {
  const cat = categories.find(c => c.slug === params.category);
  if (!cat) return notFound();

  // Filter products by category
  const items = products.filter(p => p.category === params.category);

  // Filter blog posts mentioning this category in categories or relatedBlogs
  const relatedArticles = posts.filter(
    post =>
      post.categories?.some(c =>
        c.toLowerCase().includes(params.category.toLowerCase())
      ) ||
      post.relatedBlogs?.some(r =>
        r.toLowerCase().includes(params.category.toLowerCase())
      )
  );

  return (
    <section className="container py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">{cat.name}</h1>
          <p className="text-white/70 mt-2 max-w-2xl">{cat.description}</p>
        </div>
        {cat.image && (
          <div className="relative h-32 w-48 mt-6 sm:mt-0 rounded-xl overflow-hidden">
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 200px"
            />
          </div>
        )}
      </div>

      {/* Product Recommendations */}
      {items.length > 0 ? (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recommended Products</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(p => (
              <article key={p.id} className="card p-6">
                <div className="relative h-40 w-full mb-4 rounded-xl overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="text-sm text-white/70">{p.brand}</p>
                <p className="text-white/80 mt-2">{p.price}</p>
                <a
                  href={p.affiliateUrl || "#"}
                  target="_blank"
                  className="mt-4 inline-block rounded-xl bg-brand-500 px-4 py-2 font-semibold no-underline hover:bg-brand-400"
                >
                  Check Price
                </a>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-white/60">No products found for this category yet.</p>
      )}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-semibold mb-4">Related Articles</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map(a => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="card p-6 no-underline group hover:bg-white/5 transition"
              >
                {a.cover && (
                  <div className="relative h-40 w-full mb-4 rounded-xl overflow-hidden">
                    <Image
                      src={a.cover}
                      alt={a.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="text-sm text-white/70 mt-2">{a.excerpt}</p>
                <span className="text-brand-400 text-sm mt-3 inline-block">
                  Read More →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
