"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function ProductCard({ p }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl
                 bg-gradient-to-b from-zinc-900/70 to-zinc-800/70
                 p-5 shadow-md ring-1 ring-white/10
                 hover:ring-emerald-400/40 hover:shadow-emerald-400/10
                 transition-all"
    >
      {/* Product Image */}
      <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-xl bg-zinc-900">
        {p.image ? (
          <Image
            src={p.image}
            alt={p.title}
            fill
            sizes="(max-width: 640px) 100vw, 300px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40 text-sm">
            No image
          </div>
        )}
      </div>

      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold leading-snug text-white group-hover:text-emerald-300 transition-colors">
            {p.title}
          </h3>
          <p className="text-xs text-white/60 mt-0.5">
            {p.brand}
            {p.price && (
              <>
                {" "}
                &middot;{" "}
                <span className="font-medium">
                  Typical price: {p.price}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Rating */}
        <div className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
          ★ {p.rating ?? "–"}
        </div>
      </header>

      {/* TCC Score */}
      {p.tccScore && (
        <div className="mt-3 text-xs font-semibold text-white/80">
          <span
            className={`rounded-md px-2 py-0.5 ${
              p.tccScore >= 90
                ? "bg-emerald-500/20 text-emerald-300"
                : p.tccScore >= 75
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            TCC Score: {p.tccScore}
          </span>
        </div>
      )}

      {/* Pros */}
      {p.pros?.length ? (
        <ul className="mt-4 space-y-1 text-sm text-white/80 list-disc pl-4">
          {p.pros.map((x, idx) => (
            <li key={idx}>{x}</li>
          ))}
        </ul>
      ) : null}

      {/* Cons */}
      {p.cons?.length ? (
        <details className="mt-3 text-sm text-white/70">
          <summary className="cursor-pointer font-medium hover:text-emerald-300">
            Cons
          </summary>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {p.cons.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={p.affiliateUrl || "#"}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="rounded-xl bg-white text-ink-900 font-semibold
                     px-4 py-2 text-sm shadow-sm
                     hover:bg-emerald-200 hover:shadow-emerald-400/20
                     transition"
        >
          View on Amazon
        </Link>

        <Link
          href={`/shop/${p.id}`}
          className="rounded-xl border border-emerald-400/30
                     px-4 py-2 text-sm text-emerald-300
                     hover:bg-emerald-400/10 transition"
        >
          Details
        </Link>
      </div>
    </motion.article>
  );
}
