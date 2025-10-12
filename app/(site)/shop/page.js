"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Head from "next/head";
import { products } from "../../../data/products";
import { shopMeta } from "../../../utils/shopMeta";
import Link from "next/link";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.225 } },
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-white/60 py-20">Loading shop...</div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [meta, setMeta] = useState(shopMeta[initialCategory] || shopMeta.All);

  const categories = ["All", "Kitchen", "Home", "Cleaning", "Lifestyle"];

  useEffect(() => {
    const query = activeCategory === "All" ? "" : `?category=${activeCategory}`;
    router.push(`/shop${query}`, { scroll: false });
  }, [activeCategory, router]);

  useEffect(() => {
    setMeta(shopMeta[activeCategory] || shopMeta.All);
  }, [activeCategory]);

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link
          rel="canonical"
          href={`https://www.thecleancode.co/shop${
            activeCategory !== "All" ? `?category=${activeCategory}` : ""
          }`}
        />
      </Head>

      <motion.section
        className="container py-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer}
      >
        {/* 🏷️ Title & Intro */}
        <motion.h1
          variants={fadeUp}
          className="text-4xl font-bold text-center mb-3 bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-600 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(52,211,153,0.25)]"
        >
          The Clean Code Shop
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-center text-emerald-200/90 mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]"
        >
          Curated clean-living essentials, tested and trusted. Every product
          earns a <span className="font-semibold text-emerald-300">TCC Score</span> —
          our measure of purity, sustainability, and transparency.
        </motion.p>

        {/* 🧩 Category Filter */}
        <motion.div
          variants={staggerContainer}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {categories.map((cat) => (
            <motion.button
              key={cat}
              variants={fadeUp}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-gradient-to-r from-[var(--accent)] to-emerald-600 text-white shadow-md"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>

        {/* 🛍️ Product Grid */}
        <motion.div
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
        >
          {filteredProducts.map((p) => (
            <motion.div key={p.id} variants={fadeUp}>
              <Link
                href={`/shop/${p.id}`}
                className="group no-underline block hover-scale"
              >
                <article className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-emerald-400/30 transition-all duration-300 h-full flex flex-col justify-between shadow-[0_0_25px_rgba(0,0,0,0.15)] hover:shadow-[0_0_30px_rgba(52,211,153,0.25)]">
                  
                  {/* Product Image */}
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-48 object-cover rounded-lg mb-4 group-hover:opacity-90 transition-opacity"
                    />
                  )}

                  {/* Product Title & Brand */}
                  <header className="flex flex-col mb-3">
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-emerald-300 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm text-white/70">
                      {p.brand} · {p.price}
                    </p>
                  </header>

                  {/* Pros Summary */}
                  {p.pros && (
                    <ul className="grid list-disc gap-1 pl-5 text-sm text-white/80 mb-4">
                      {p.pros.slice(0, 2).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  )}

                  {/* Rating + TCC */}
                  <div className="flex items-center justify-between text-sm text-white/80">
                    {p.rating && <span>⭐ {p.rating}</span>}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-700/40 text-emerald-300 text-xs font-semibold">
                      TCC {p.tccScore || "95"}
                    </span>
                  </div>

                  <p className="mt-3 text-emerald-400 text-sm font-medium group-hover:underline">
                    View Details →
                  </p>
                </article>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <motion.p
            variants={fadeUp}
            className="text-center text-white/60 mt-10"
          >
            No products found in this category.
          </motion.p>
        )}
      </motion.section>
    </>
  );
}
