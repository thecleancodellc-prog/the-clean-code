"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);

  // Prevent background scroll while drawer is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : original || "";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus close button & ESC to close
  useEffect(() => {
    if (!open) return;
    if (closeBtnRef.current) closeBtnRef.current.focus();

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/blog", label: "Blog" },
    { href: "/guides", label: "Guides" },
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "About" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-900/70 backdrop-blur-md">
        <div className="container relative flex items-center justify-between px-4 py-4 sm:px-6">
          {/* Left — Brand */}
          <Link href="/" className="z-20 no-underline">
            <span className="text-xl font-extrabold tracking-wide text-gray-100 sm:text-2xl">
              The <span className="text-emerald-400">Clean</span> Code
            </span>
          </Link>

          {/* Center — Logo (desktop) */}
          <div className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
            <Image
              src="/the-clean-code-logo.png"
              alt="The Clean Code Logo"
              width={70}
              height={32}
              className="object-contain"
              priority
            />
          </div>

          {/* Right — Desktop Nav */}
          <nav className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/guides"
              className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition hover:bg-emerald-400"
            >
              Start Here
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen(true)}
            className="z-20 inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 md:hidden"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" className="stroke-white/90">
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <>
          {/* Overlay */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            aria-hidden="true"
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:hidden"
          />

          {/* Slide-out Panel */}
          <div
            role="dialog"
            aria-modal="true"
            className="fixed right-0 top-0 z-[110] h-full w-72 max-w-[85%] md:hidden
                       bg-gray-900 border-l border-white/10 shadow-xl p-5 flex flex-col"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Menu</span>
              <button
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10
                           focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" className="stroke-white/90">
                  <path d="M6 6l12 12M18 6l-12 12" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-2 text-base font-medium text-gray-300">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 transition hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/guides"
                onClick={() => setOpen(false)}
                className="mt-3 block rounded-xl bg-emerald-500 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-400"
              >
                Start Here
              </Link>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
