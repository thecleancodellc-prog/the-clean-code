import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-white/10">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="font-semibold text-brand-300 no-underline">
          <span className="rounded-xl bg-white/5 px-3 py-1">The Clean Code</span>
        </Link>
        <nav className="flex gap-6 text-sm text-white/80">
          <Link href="/blog" className="hover:text-white">Blog</Link>
          <Link href="/guides" className="hover:text-white">Guides</Link>
          <Link href="/shop" className="hover:text-white">Shop</Link>
          <Link href="/about" className="hover:text-white">About</Link>
        </nav>
      </div>
    </header>
  );
}
