"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Head from "next/head";
import { products } from "../../data/products";
import { shopMeta } from "../../utils/shopMeta";
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
        className="container py-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        variants={staggerContainer}
      >
        <motion.h1
          variants={fadeUp}
          className="text-3xl font-bold text-center"
        >
          The Clean Code Shop
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-2 text-white/70 text-center"
        >
          Curated clean-living essentials. Explore our trusted picks below.
        </motion.p>

        {/* Filter Bar */}
        <motion.div
          variants={staggerContainer}
          className="flex flex-wrap justify-center gap-3 mt-8 mb-10"
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

        {/* Product Grid */}
        <motion.div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
        >
          {filteredProducts.map((p) => (
            <motion.div key={p.id} variants={fadeUp}>
              <Link
                href={`/shop/${p.id}`}
                className="no-underline group hover-scale"
              >
                <article className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-white/20 transition-all duration-300 h-full flex flex-col justify-between">
                  <header className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-green-400 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-sm text-white/70">
                        {p.brand} · {p.price}
                      </p>
                    </div>
                    {p.rating && (
                      <div className="rounded-xl bg-[var(--accent)]/20 px-2 py-1 text-xs text-white">
                        ★ {p.rating}
                      </div>
                    )}
                  </header>

                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-48 object-cover rounded-lg mb-4 group-hover:opacity-90 transition-opacity"
                    />
                  )}

                  {p.pros && (
                    <ul className="grid list-disc gap-1 pl-5 text-sm text-white/80 mb-3">
                      {p.pros.slice(0, 2).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-auto text-sm text-green-400 font-medium group-hover:underline">
                    View Details →
                  </p>
                </article>
              </Link>
            </motion.div>
          ))}
        </motion.div>

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
