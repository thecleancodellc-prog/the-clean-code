"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useMemo } from "react";
import Link from "next/link";

export default function Hero({ theme = "auto" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // 🎬 Scroll-linked transforms
  const yText = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.7], [0.6, 0]);

  // ⚙️ Container & fade variants
  const container = {
    hidden: { opacity: 0, scale: 1.03 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.22 },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  // 🌬️ Idle float (gentle oscillation)
  const floating = {
    animate: {
      y: [0, -6, 0, 3, 0],
      transition: { duration: 11, ease: "easeInOut", repeat: Infinity },
    },
  };

  // 🧠 Adaptive SVG background
  const pattern = useMemo(() => {
    if (theme === "dark") {
      return encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>
          <rect width='20' height='20' fill='%23111111'/>
          <path d='M0 10h20M10 0v20' stroke='%23333' stroke-width='1'/>
        </svg>`);
    } else if (theme === "light") {
      return encodeURIComponent(`
        <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>
          <rect width='20' height='20' fill='white'/>
          <path d='M0 10h20M10 0v20' stroke='%239ca3af' stroke-width='2'/>
        </svg>`);
    } else return null;
  }, [theme]);

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={container}
      className="container relative flex flex-col items-center justify-center py-24 text-center overflow-hidden"
    >
      {/* 🟢 Pattern Background */}
      <motion.div
        style={{
          y: yBg,
          backgroundImage:
            theme === "auto"
              ? `url("data:image/svg+xml;utf8,
                <svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'>
                  <rect width='20' height='20' fill='white'/>
                  <path d='M0 10h20M10 0v20' stroke='%239ca3af' stroke-width='2'/>
                  <style>@media (prefers-color-scheme: dark){
                    rect{fill:#111111;} path{stroke:#333;stroke-width:1;}
                  }</style>
                </svg>")`
              : `url("data:image/svg+xml;utf8,${pattern}")`,
          backgroundRepeat: "repeat",
          backgroundSize: "20px 20px",
        }}
        className="absolute inset-0 -z-10 transition-colors"
      />

      {/* ✨ Floating Text */}
      <motion.div
        style={{ y: yText, opacity }}
        variants={floating}
        animate="animate"
        className="relative z-10 max-w-3xl px-4"
      >
        <motion.h1
          variants={fadeUp}
          className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900 dark:text-gray-100"
        >
          Cleaner living, without the overwhelm.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-gray-700 dark:text-gray-300"
        >
          Science-guided swaps, short ingredient lists, and practical routines.
          Start with the highest-impact changes and build momentum.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Link
            href="/guides"
            className="rounded-2xl bg-[var(--accent)] px-6 py-3 font-semibold text-white no-underline shadow hover:bg-green-700 transition"
          >
            Start with Guides
          </Link>
          <Link
            href="/blog"
            className="rounded-2xl border border-gray-400 px-6 py-3 text-gray-800 dark:text-gray-200 no-underline hover:bg-gray-100 hover:dark:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition"
          >
            Read the Blog
          </Link>
        </motion.div>
      </motion.div>

      {/* 🌅 Gradient Overlay with Shimmer */}
      <motion.div
        style={{ y: yBg, opacity: overlayOpacity }}
        className="absolute inset-0 -z-20 bg-gradient-to-b from-white/70 to-transparent dark:from-gray-900/70"
      >
        {/* shimmer layer */}
        <motion.div
          animate={{
            backgroundPosition: ["0% 0%", "200% 0%"],
          }}
          transition={{
            duration: 14,
            ease: "linear",
            repeat: Infinity,
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5 bg-[length:200%_100%] pointer-events-none"
        />
      </motion.div>
    </motion.section>
  );
}
