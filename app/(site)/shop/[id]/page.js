import { notFound } from "next/navigation";
import { products } from "../../../../data/products";
import Link from "next/link";
import PageFadeWrapper from "../../../../components/PageFadeWrapper";

export async function generateMetadata({ params }) {
  const product = products.find((p) => p.id === params.id);
  if (!product) return {};
  const og = product.cover || product.image || "/og-default.jpg";
  return {
    title: `${product.title} | The Clean Code Shop`,
    description: product.description || "",
    openGraph: { images: [og] },
  };
}

export default function ProductPage({ params }) {
  const product = products.find((p) => p.id === params.id);
  if (!product) return notFound();

  // Prefer cover, then image
  const heroImg = product.cover || product.image;

  // Pick 3 related (excluding current)
  const related = products
    .filter((p) => p.id !== product.id)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  return (
    <PageFadeWrapper>
      <section className="container py-10 max-w-3xl mx-auto">
        {/* 🖼️ Product Image */}
        {heroImg && (
          <img
            src={heroImg}
            alt={product.title}
            className="mb-8 w-full rounded-2xl object-cover shadow-lg hover-scale"
          />
        )}

        {/* 🧾 Title + Brand */}
        <h1 className="text-3xl font-bold">{product.title}</h1>
        {product.brand && (
          <p className="mt-2 text-white/70 text-lg">{product.brand}</p>
        )}

        {/* ⭐ Rating + 💲 Price */}
        <div className="mt-4 flex items-center gap-6 text-sm text-white/80">
          {product.rating && <span>⭐ {product.rating}</span>}
          {product.price && <span>💲 {product.price}</span>}
        </div>

        {/* 🧠 Description */}
        {product.description && (
          <p className="mt-6 text-lg text-white/90 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* 🌿 Pros */}
        {product.pros && product.pros.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Why We Love It</h2>
            <ul className="list-disc list-inside text-white/80 space-y-1">
              {product.pros.map((pro, i) => (
                <li key={i}>{pro}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 🧴 Usage Tips */}
        {product.instructions && product.instructions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Usage Tips</h2>
            <ul className="list-disc list-inside text-white/80 space-y-1">
              {product.instructions.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 🛒 Buy Button */}
        {product.affiliateUrl && (
          <div className="mt-8">
            <a
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg text-white font-semibold px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-emerald-600 hover:opacity-90 hover:shadow-lg transition-all"
            >
              Buy on Amazon →
            </a>
          </div>
        )}

        {/* 💬 Customer Reviews */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map((r, i) => (
                <div key={i} className="rounded-lg bg-white/5 p-4 shadow-sm">
                  <p className="text-sm text-white/90 italic">"{r.content}"</p>
                  <p className="mt-2 text-xs text-white/60">– {r.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🧩 Related Products */}
        {related.length > 0 && (
          <div className="mt-14 border-t border-white/10 pt-10">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              You Might Also Like
            </h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/shop/${item.id}`}
                  className="group block border border-white/10 rounded-xl overflow-hidden bg-white/5 hover:border-white/20 transition-all hover-scale"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-green-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-white/70 text-sm mb-2">
                      {item.brand || "Featured Product"}
                    </p>
                    <p className="text-white/80 text-sm line-clamp-2">
                      {item.description}
                    </p>
                    <p className="mt-3 text-green-400 text-sm font-medium group-hover:underline">
                      View Details →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 🔙 Back Link */}
        <div className="mt-10 text-center">
          <Link
            href="/shop"
            className="text-[var(--accent)] font-medium hover:underline"
          >
            ← Back to Shop
          </Link>
        </div>
      </section>
    </PageFadeWrapper>
  );
}
