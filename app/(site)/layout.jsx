"use client";
import { motion } from "framer-motion";

// ✅ Global fade layout wrapper
export default function FadeLayout({ children }) {
  return (
    <motion.main
      key={typeof window !== "undefined" ? window.location.pathname : ""}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen"
    >
      {children}
    </motion.main>
  );
}
