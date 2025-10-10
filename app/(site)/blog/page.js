"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { posts } from "../../../data/posts";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.225 } },
};

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-white/60 py-20">
          Loading blog posts...
        </div>
      }
    >
      <BlogContent />
    </Suspense>
  );
}

function BlogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") || "All";
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [filtered, setFiltered] = useState(posts);

  const categories = ["All", ...new Set(posts.flatMap((p) => p.categories || []))];

  useEffect(() => {
    const query = activeCategory === "All" ? "" : `?category=${activeCategory}`;
    router.push(`/blog${query}`, { scroll: false });
  }, [activeCategory, router]);

  useEffect(() => {
    if (activeCategory === "All") setFiltered(posts);
    else setFiltered(posts.filter((p) => p.categories?.includes(activeCategory)));
  }, [activeCategory]);

  const sortedPosts = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <motion.section
      className="container py-12"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.h1 className="text-3xl font-bold text-center mb-3" variants={fadeUp}>
        The Clean Code Blog
      </motion.h1>
      <motion.p
        className="text-white/70 text-center mb-8 max-w-2xl mx-auto"
        variants={fadeUp}
      >
        Clean living insights, ingredient breakdowns, and practical routines — written
        to help you live simply and sustainably.
      </motion.p>

      {/* Filter Bar */}
      <motion.div
        className="flex flex-wrap justify-center gap-3 mb-10"
        variants={staggerContainer}
      >
        {categories.map((cat) => (
          <motion.button
            key={cat}
            variants={fadeUp}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "bg-gradient-to-r from-[var(--accent)] to-emerald-600 text-white shadow-md"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </motion.div>

      {/* Blog Grid */}
      <motion.div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
      >
        {sortedPosts.map((post) => (
          <motion.div key={post.slug} variants={fadeUp}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block border border-white/10 rounded-xl overflow-hidden bg-white/5 hover:border-white/20 transition-all hover-scale"
            >
              {post.cover && (
                <img
                  src={post.cover}
                  alt={post.title}
                  className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                />
              )}
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-1 group-hover:text-green-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-white/60 text-sm mb-2">
                  {new Date(post.date).toLocaleDateString()}
                </p>
                <p className="text-white/80 text-sm line-clamp-3">{post.excerpt}</p>
                <p className="mt-3 text-green-400 text-sm font-medium group-hover:underline">
                  Read More →
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {sortedPosts.length === 0 && (
        <motion.p variants={fadeUp} className="text-center text-white/60 mt-10">
          No posts found in this category.
        </motion.p>
      )}
    </motion.section>
  );
}
