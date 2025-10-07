import { notFound } from "next/navigation";
import { posts } from "@/data/posts";
import SEO from "@/components/SEO";
import AdSlot from "@/components/AdSlot";

export async function generateMetadata({ params }) {
  const post = posts.find(p => p.slug === params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { images: [post.cover || "/og-default.jpg"] }
  };
}

export default function BlogPost({ params }) {
  const post = posts.find(p => p.slug === params.slug);
  if (!post) return notFound();

  return (
    <section className="container py-10">
      <SEO
        type="article"
        title={post.title}
        description={post.excerpt}
        url={`https://www.thecleancode.com/blog/${post.slug}`}
        image={post.cover || "/og-default.jpg"}
      />
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-white/70">{new Date(post.date).toLocaleDateString()}</p>
      <AdSlot />
      <div className="prose prose-invert mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: post.body }} />
    </section>
  );
}
