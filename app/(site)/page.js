"use client";

import { motion } from "framer-motion";
import Hero from "../../components/Hero";
import AdSlot from "../../components/AdSlot";
import AffiliateDisclosure from "../../components/AffiliateDisclosure";
import { products } from "../../data/products";
import ProductCard from "../../components/ProductCard";
import { posts } from "../../data/posts";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.225 },
  },
};

export default function Home() {
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  const featuredPosts = posts.filter((p) => p.featured);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-6">
      {/* LEFT AD COLUMN */}
      <aside className="hidden lg:block sticky top-24 self-start">
        <div className="space-y-6">
          <div className="bg-neutral-900/40 rounded-xl p-4">
            <ins
              className="adsbygoogle"
              style={{ display: "block", minHeight: "600px" }}
              data-ad-client="ca-pub-4743638908421899"
              data-ad-slot="1111111111"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="col-span-1 lg:col-span-1">
        <Hero />

        {/* Latest Blog Posts */}
        <motion.section
          className="container mt-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={staggerContainer}
        >
          <motion.div
            className="mb-6 flex items-center justify-between"
            variants={fadeUp}
          >
            <h2 className="text-2xl font-bold">Latest from the Blog</h2>
            <Link href="/blog" className="text-sm text-brand-400 hover:underline">
              View All →
            </Link>
          </motion.div>

          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
          >
            {sortedPosts.slice(0, 3).map((post) => (
              <motion.div key={post.slug} variants={fadeUp}>
                <div className="card p-6 hover-scale transition">
                  {post.cover && (
                    <img
                      src={post.cover}
                      alt={post.title}
                      className="mb-4 h-40 w-full rounded-lg object-cover"
                    />
                  )}
                  <h3 className="text-lg font-semibold">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="no-underline hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-white/80">{post.excerpt}</p>
                  <p className="mt-2 text-xs text-white/60">
                    {new Date(post.date).toLocaleDateString()}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-4 inline-block text-brand-400 hover:underline"
                  >
                    Read More →
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Featured / Popular Posts */}
        {featuredPosts.length > 0 && (
          <motion.section
            className="container mt-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={staggerContainer}
          >
            <motion.div
              className="mb-6 flex items-center justify-between"
              variants={fadeUp}
            >
              <h2 className="text-2xl font-bold">Popular Guides</h2>
              <Link href="/blog" className="text-sm text-brand-400 hover:underline">
                View All →
              </Link>
            </motion.div>

            <motion.div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
            >
              {featuredPosts.map((post) => (
                <motion.div key={post.slug} variants={fadeUp}>
                  <div className="card p-6 border border-brand-400/30 hover-scale transition">
                    {post.cover && (
                      <img
                        src={post.cover}
                        alt={post.title}
                        className="mb-4 h-40 w-full rounded-lg object-cover"
                      />
                    )}
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <p className="mt-2 text-sm text-white/80">{post.excerpt}</p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-4 inline-block text-brand-400 hover:underline"
                    >
                      Read More →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* Product Picks */}
        <motion.section
          className="container mt-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={staggerContainer}
        >
          <motion.div
            className="mb-6 flex items-center justify-between"
            variants={fadeUp}
          >
            <h2 className="text-2xl font-bold">High-Impact Starter Picks</h2>
            <Link href="/shop" className="text-sm text-brand-400 hover:underline">
              View All →
            </Link>
          </motion.div>

          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
          >
            {products.slice(0, 3).map((p) => (
              <motion.div key={p.id} variants={fadeUp}>
                <ProductCard p={p} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        <AdSlot />
        <AffiliateDisclosure />
      </main>

      {/* RIGHT AD COLUMN */}
      <aside className="hidden lg:block sticky top-24 self-start">
        <div className="space-y-6">
          <div className="bg-neutral-900/40 rounded-xl p-4">
            <ins
              className="adsbygoogle"
              style={{ display: "block", minHeight: "600px" }}
              data-ad-client="ca-pub-4743638908421899"
              data-ad-slot="2222222222"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
        </div>
      </aside>
    </div>
  );
}
