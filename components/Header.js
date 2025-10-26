"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [open, setOpen] = useState(false);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
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
        <div className="container flex items-center justify-between px-4 py-4 sm:px-6 relative">
          {/* Left — Brand */}
          <Link href="/" className="no-underline z-20">
            <span className="text-xl sm:text-2xl font-extrabold text-gray-100 tracking-wide">
              The <span className="text-emerald-400">Clean</span> Code
            </span>
          </Link>

          {/* Center — Logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:block">
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
          <nav className="hidden md:flex gap-6 text-sm text-gray-300">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white transition"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/guides"
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl px-4 py-2 transition"
            >
              Start Here
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10 z-20"
            aria-label="Open menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              className="stroke-white/90"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu"
          />
          <div className="ml-auto h-full w-72 max-w-[85%] bg-gray-900 shadow-xl border-l border-white/10 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-white">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-white/10"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  className="stroke-white/90"
                >
                  <path
                    d="M6 6l12 12M18 6l-12 12"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-2 text-gray-300">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 hover:bg-white/10 transition text-base font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/guides"
                onClick={() => setOpen(false)}
                className="mt-3 block bg-emerald-500 text-white font-semibold text-center rounded-xl px-4 py-3 hover:bg-emerald-400 transition"
              >
                Start Here
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
