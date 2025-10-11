export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="container py-10 text-sm text-white/70">
        <div className="md:flex md:items-center md:justify-between">
          {/* Copyright */}
          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} The Clean Code. All rights reserved.
          </p>

          {/* Navigation Links */}
          <nav className="mt-4 md:mt-0 flex flex-wrap justify-center gap-4 text-center">
            <a
              href="/about"
              className="hover:text-[var(--accent)] transition-colors duration-200"
            >
              About
            </a>
            <a
              href="/support"
              className="hover:text-[var(--accent)] transition-colors duration-200"
            >
              Support
            </a>
            <a
              href="/privacy"
              className="hover:text-[var(--accent)] transition-colors duration-200"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="hover:text-[var(--accent)] transition-colors duration-200"
            >
              Terms
            </a>
            <a
              href="/sitemap"
              className="hover:text-[var(--accent)] transition-colors duration-200"
            >
              Sitemap
            </a>
          </nav>
        </div>

        {/* Affiliate & Legal Line */}
        <p className="mt-6 text-center text-xs text-white/50">
          This site may contain affiliate links. The Clean Code earns from qualifying purchases.
        </p>
      </div>
    </footer>
  );
}
