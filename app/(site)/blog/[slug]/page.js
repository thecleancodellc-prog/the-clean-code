import { notFound } from "next/navigation";
import { posts } from "../../../../data/posts";
import SEO from "../../../../components/SEO";
import AdSlot from "../../../../components/AdSlot";
import Link from "next/link";
import getReadingTime from "../../../../utils/getReadingTime";
import MetaPreview from "../../../../components/MetaPreview";
import ShareValidationBar from "../../../../components/ShareValidationBar";
import PageFadeWrapper from "../../../../components/PageFadeWrapper";
import ProseFadeWrapper from "../../../../components/ProseFadeWrapper";

export async function generateMetadata({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return {};

  const siteUrl = "https://www.thecleancode.co";
  const url = `${siteUrl}/blog/${post.slug}`;
  const image = post.cover || `${siteUrl}/og-default.jpg`;

  return {
    title: `${post.title} | The Clean Code`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      siteName: "The Clean Code",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
    other: {
      "article:published_time": post.date,
      "article:author": post.author?.name || "The Clean Code Team",
    },
  };
}

export default function BlogPost({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return notFound();

  const readingTime = getReadingTime(post.content);

  const related = posts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 3);

  return (
    <PageFadeWrapper>
      <section className="container py-10 max-w-3xl mx-auto relative">

        {/* ✅ SEO */}
        <SEO
          type="article"
          title={post.title}
          description={post.excerpt}
          url={`https://www.thecleancode.co/blog/${post.slug}`}
          image={post.cover || "/og-default.jpg"}
          author={post.author}
          datePublished={post.date}
          readingTime={readingTime}
        />

        {/* 🧾 Title & Meta */}
        <div className="relative mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-[var(--text)]">
            {post.title}
          </h1>

          {/* ✨ Subtle top glow bar */}
          <div
            className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 h-[2px] w-24 rounded-full opacity-80"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(52,211,153,0.8), transparent)",
              boxShadow:
                "0 0 10px rgba(52,211,153,0.6), 0 0 25px rgba(52,211,153,0.3)",
            }}
          />

          <p className="text-white/70 mt-4">
            {new Date(post.date).toLocaleDateString()}
          </p>
          <p className="text-white/60 text-sm mt-1 mb-6">
            ⏱ {readingTime.replace("PT", "").replace("M", "")}-minute read
          </p>
        </div>

        {/* 💰 Inline Ad */}
        <AdSlot format="auto" style={{ marginBottom: "2rem" }} />

        {/* 🖼️ Cover Image */}
        {post.cover && (
          <img
            src={post.cover}
            alt={post.title}
            className="w-full rounded-2xl mb-8 object-cover shadow-lg"
          />
        )}

        {/* 🧠 Main Content */}
        <ProseFadeWrapper>
          <div dangerouslySetInnerHTML={{ __html: post.content || "" }} />
        </ProseFadeWrapper>

        {/* 🛡️ Amazon Affiliate Disclosure */}
<p className="text-xs text-white/60 mt-8 italic text-center">
  As an Amazon Associate, The Clean Code earns from qualifying purchases.
</p>


        {/* 💡 Product Spotlight */}
        {post.product && (
          <div className="mt-12 p-6 border border-white/10 bg-white/5 rounded-xl text-center shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-emerald-300">
              Featured Product
            </h2>
            {post.product.image && (
              <img
                src={post.product.image}
                alt={post.product.title}
                className="w-48 h-48 mx-auto rounded-lg mb-4 object-cover shadow-lg"
              />
            )}
            <h3 className="text-lg font-semibold text-white mb-2">
              {post.product.title}
            </h3>
            <p className="text-white/70 max-w-md mx-auto mb-4">
              {post.product.description}
            </p>
            <a
              href={post.product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white no-underline hover:bg-green-700 transition"
            >
              View on Amazon →
            </a>
          </div>
        )}

        {/* 📢 Ad below content */}
        <AdSlot format="auto" style={{ marginTop: "3rem" }} />

        {/* 🪄 Related Posts */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-10">
            <h2 className="text-2xl font-semibold mb-6 text-center text-emerald-300">
              You May Also Like
            </h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="group block border border-white/10 rounded-xl overflow-hidden bg-white/5 hover:border-white/20 transition-all hover-scale"
                >
                  {item.cover && (
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-green-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-white/60 text-sm mb-2">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                    <p className="text-white/80 text-sm line-clamp-3">
                      {item.excerpt}
                    </p>
                    <p className="mt-3 text-green-400 text-sm font-medium group-hover:underline">
                      Read More →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 🔙 Back to Blog */}
        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="text-green-400 hover:underline font-medium"
          >
            ← Back to Blog
          </Link>
        </div>
      </section>
    </PageFadeWrapper>
  );
}
