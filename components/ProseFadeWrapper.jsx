"use client";

import { motion } from "framer-motion";

/**
 * ProseFadeWrapper
 * ✨ Wraps blog/article content with:
 * - Smooth fade-in animation
 * - Ambient gradient shimmer overlay
 * - Clean readability focus for The Clean Code blog
 */
export default function ProseFadeWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative prose prose-lg max-w-none text-[var(--text)]"
    >
      {/* 🌿 Ambient background layer */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(800px 500px at 10% 0%, rgba(61,111,87,0.12), transparent),
            radial-gradient(600px 400px at 120% 20%, rgba(109,175,144,0.10), transparent),
            linear-gradient(to bottom, rgba(31,65,53,0.95), rgba(27,42,36,0.98))
          `,
        }}
      />

      {/* ✨ Soft shimmer overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 50,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(52,211,153,0.07) 0%, rgba(109,175,144,0.05) 50%, rgba(61,111,87,0.08) 100%)",
          backgroundSize: "400% 400%",
          mixBlendMode: "overlay",
        }}
      />

      {/* 🧾 Content layer */}
      <div className="relative z-10">
        {children}
      </div>

      {/* 🪶 Subtle bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(31,65,53,0.9) 60%, rgba(27,42,36,1) 100%)",
        }}
      />
    </motion.div>
  );
}
