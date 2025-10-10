import { notFound } from "next/navigation";
import { posts } from "../../../../data/posts";
import SEO from "../../../../components/SEO";
import AdSlot from "../../../../components/AdSlot";
import Link from "next/link";
import getReadingTime from "../../../../utils/getReadingTime";
import MetaPreview from "../../../../components/MetaPreview";
import ShareValidationBar from "../../../../components/ShareValidationBar";
import PageFadeWrapper from "../../../../components/PageFadeWrapper";

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

  // Related posts (exclude current)
  const related = posts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 3);

  return (
    <PageFadeWrapper>
      <section className="container py-10 max-w-3xl mx-auto">
        <SEO
          type="article"
          title={post.title}
          description={post.excerpt}
          url={`https://www.thecleancode.co/blog/${post.slug}`}
          image={post.cover || "/og-default.jpg"}
          author={post.author}
          datePublished={post.date}
          relatedProducts={post.relatedProducts}
          readingTime={readingTime}
        />

        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="mt-2 text-white/70">
          {new Date(post.date).toLocaleDateString()}
        </p>
        <p className="text-white/60 text-sm mt-1">
          ⏱ {readingTime.replace("PT", "").replace("M", "")}-minute read
        </p>

        <AdSlot />

        {post.cover && (
          <img
            src={post.cover}
            alt={post.title}
            className="mt-6 w-full rounded-lg"
          />
        )}

        <div
          className="prose prose-invert mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />

        {/* 🧠 DEV-ONLY Preview & Validation */}
        {process.env.NODE_ENV === "development" && (
          <>
            <MetaPreview
              title={post.title}
              description={post.excerpt}
              image={post.cover}
              url={`https://www.thecleancode.co/blog/${post.slug}`}
              type="article"
            />
            <ShareValidationBar
              url={`https://www.thecleancode.co/blog/${post.slug}`}
            />
          </>
        )}

        {/* Related Posts */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-10">
            <h2 className="text-2xl font-semibold mb-6 text-center">
              You May Also Like
            </h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="group block border border-white/10 rounded-lg overflow-hidden bg-white/5 hover:border-white/20 transition-all"
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
      </section>
    </PageFadeWrapper>
  );
}
