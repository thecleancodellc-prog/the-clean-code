"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { posts } from "../../../data/posts";
import AdSlot from "../../../components/AdSlot";
import Link from "next/link";

/* ------------------ Animations ------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.18 } },
};

/* ------------------ Page Wrapper ------------------ */

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-white/60">
          Loading blog posts…
        </div>
      }
    >
      <BlogContent />
    </Suspense>
  );
}

/* ------------------ Main Content ------------------ */

function BlogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") || "All";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [filtered, setFiltered] = useState(posts);
  const [toast, setToast] = useState({ message: "", type: "" });

  const categories = ["All", ...new Set(posts.flatMap((p) => p.categories || []))];

  /* Keep URL in sync (safe on mobile) */
  useEffect(() => {
    if (!searchParams.has("category") && activeCategory === "All") return;

    const query =
      activeCategory === "All" ? "" : `?category=${activeCategory}`;

    router.replace(`/blog${query}`, { scroll: false });
  }, [activeCategory]);

  /* Filter posts */
  useEffect(() => {
    if (activeCategory === "All") setFiltered(posts);
    else setFiltered(posts.filter((p) => p.categories?.includes(activeCategory)));
  }, [activeCategory]);

  const sortedPosts = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const featured = sortedPosts.find((p) => p.featured) || sortedPosts[0];
  const rest = sortedPosts.filter((p) => p.slug !== featured?.slug);
  const trending = posts.slice(0, 5);

  return (
    <motion.section
      className="container px-4 sm:px-6 py-12 grid lg:grid-cols-3 gap-12 relative z-0"
      initial="visible"
      animate="visible"
      variants={staggerContainer}
    >
      {/* ------------------ MAIN COLUMN ------------------ */}
      <div className="lg:col-span-2">
        <motion.div
          className="relative mb-8 text-center"
          variants={fadeUp}
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-[var(--text)]">
            The Clean Code Blog
          </h1>

          <div
            className="absolute left-1/2 -bottom-2 -translate-x-1/2 h-[2px] w-24 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(52,211,153,0.8), transparent)",
              boxShadow:
                "0 0 10px rgba(52,211,153,0.6), 0 0 25px rgba(52,211,153,0.3)",
            }}
          />
        </motion.div>

        <motion.p
          className="text-white/70 text-center mb-10 max-w-2xl mx-auto"
          variants={fadeUp}
        >
          Clean living insights, ingredient breakdowns, and practical routines —
          written to help you live simply and sustainably.
        </motion.p>

        {/* Featured Post */}
        {featured && (
          <motion.div
            variants={fadeUp}
            className="mb-14 border border-white/10 rounded-2xl overflow-hidden
                       bg-white/5 hover:border-white/20 transition-all shadow-md"
          >
            <Link href={`/blog/${featured.slug}`} className="block">
              {featured.cover && (
                <img
                  src={featured.cover}
                  alt={featured.title}
                  className="w-full h-72 object-cover hover:opacity-90 transition-opacity"
                />
              )}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2 hover:text-emerald-300 transition">
                  {featured.title}
                </h2>
                <p className="text-white/60 text-sm mb-2">
                  {new Date(featured.date).toLocaleDateString()}
                </p>
                <p className="text-white/80 mb-4 line-clamp-3">
                  {featured.excerpt}
                </p>
                <span className="text-emerald-400 text-sm font-medium">
                  Read Full Article →
                </span>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Inline Ad */}
        <AdSlot format="auto" style={{ margin: "2rem 0" }} />

        {/* Category Filter */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-10"
          variants={staggerContainer}
        >
          {categories.map((cat) => (
            <motion.button
              key={cat}
              variants={fadeUp}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCategory === cat
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>

        {/* Blog Grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2"
          variants={staggerContainer}
        >
          {rest.map((post) => (
            <motion.div key={post.slug} variants={fadeUp}>
              <Link
                href={`/blog/${post.slug}`}
                className="block border border-white/10 rounded-xl overflow-hidden
                           bg-white/5 hover:border-white/20 transition shadow-md"
              >
                {post.cover && (
                  <img
                    src={post.cover}
                    alt={post.title}
                    className="w-full h-48 object-cover hover:opacity-90 transition"
                  />
                )}
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-1 hover:text-emerald-300 transition">
                    {post.title}
                  </h3>
                  <p className="text-white/60 text-sm mb-2">
                    {new Date(post.date).toLocaleDateString()}
                  </p>
                  <p className="text-white/80 text-sm line-clamp-3">
                    {post.excerpt}
                  </p>
                  <span className="mt-3 block text-emerald-400 text-sm font-medium">
                    Read More →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {sortedPosts.length === 0 && (
          <motion.p
            variants={fadeUp}
            className="text-center text-white/60 mt-10"
          >
            No posts found in this category.
          </motion.p>
        )}

        {/* Inline Ad */}
        <AdSlot format="auto" style={{ marginTop: "3rem" }} />
      </div>

      {/* ------------------ SIDEBAR ------------------ */}
      <aside className="space-y-10">
        <AdSlot format="auto" style={{ minHeight: 600 }} />

        <motion.div variants={fadeUp}>
          <h3 className="text-xl font-semibold mb-4 text-emerald-300">
            🔥 Trending Posts
          </h3>
          <ul className="space-y-3">
            {trending.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/blog/${t.slug}`}
                  className="text-white/80 hover:text-emerald-300 transition text-sm"
                >
                  • {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="border border-white/10 rounded-xl p-5 bg-white/5 shadow-md"
        >
          <h3 className="text-lg font-semibold mb-2 text-emerald-300">
            About The Clean Code
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">
            Making clean living simple — from ingredient-short shopping to
            research-backed swaps.
          </p>
          <Link
            href="/about"
            className="inline-block mt-3 text-emerald-400 text-sm hover:underline"
          >
            Learn More →
          </Link>
        </motion.div>

        <AdSlot format="auto" style={{ minHeight: 600 }} />

        <motion.div
          variants={fadeUp}
          className="border border-white/10 rounded-xl p-5 bg-white/5 relative shadow-md"
        >
          <h3 className="text-lg font-semibold mb-2 text-emerald-300">
            Join Our Newsletter
          </h3>
          <p className="text-white/70 text-sm mb-3">
            Get new clean-living guides and product picks straight to your inbox.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = e.target.email.value.trim();

              if (!email || !email.includes("@")) {
                setToast({ message: "Enter a valid email.", type: "error" });
                return;
              }

              try {
                const res = await fetch("/api/newsletter", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });

                if (res.ok) {
                  setToast({ message: "You're subscribed! 🎉", type: "success" });
                  e.target.reset();
                } else {
                  setToast({ message: "Subscription failed.", type: "error" });
                }
              } catch {
                setToast({ message: "Server error.", type: "error" });
              }

              setTimeout(() => setToast({ message: "", type: "" }), 3000);
            }}
            className="flex gap-2 mt-2"
          >
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2
                         text-sm text-white placeholder-white/50 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 text-white text-sm
                         font-semibold rounded-lg hover:bg-emerald-400 transition"
            >
              Subscribe
            </button>

            {toast.message && (
              <div
                className={`absolute -bottom-12 left-0 right-0 text-center py-2
                  rounded-lg text-sm ${
                    toast.type === "success"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
              >
                {toast.message}
              </div>
            )}
          </form>
        </motion.div>

        <motion.div variants={fadeUp} className="text-center">
          <Link
            href="/shop"
            className="inline-block text-emerald-400 text-sm hover:underline"
          >
            🛒 Visit The Clean Code Shop →
          </Link>
        </motion.div>
      </aside>
    </motion.section>
  );
}
