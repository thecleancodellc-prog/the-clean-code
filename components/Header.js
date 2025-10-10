import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-white/10 shadow-md">
      <div className="container flex items-center justify-between py-4 relative">
        {/* Left – Text Brand */}
        <Link href="/" className="no-underline">
          <span className="text-xl sm:text-2xl font-extrabold text-gray-100 tracking-wide">
            The Clean Code
          </span>
        </Link>

        {/* Center – Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image
            src="/the-clean-code-logo.png"
            alt="The Clean Code Logo"
            width={65}
            height={30}
            className="object-contain"
            priority
          />
        </div>

        {/* Right – Navigation */}
        <nav className="flex gap-6 text-sm text-gray-300">
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
          <Link href="/guides" className="hover:text-white">
            Guides
          </Link>
          <Link href="/shop" className="hover:text-white">
            Shop
          </Link>
          <Link href="/about" className="hover:text-white">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
