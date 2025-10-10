export const metadata = {
  title: "Sitemap | The Clean Code",
  description:
    "Browse all pages and categories of The Clean Code — clean-living guides, product picks, and wellness insights.",
};

export default function Sitemap() {
  const pages = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Blog", path: "/blog" },
    { name: "Shop", path: "/shop" },
    { name: "Support", path: "/support" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Terms of Service", path: "/terms" },
  ];

  return (
    <section className="container py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sitemap</h1>
      <ul className="space-y-2 text-white/80">
        {pages.map((page) => (
          <li key={page.path}>
            <a
              href={page.path}
              className="text-[var(--accent)] hover:text-emerald-400 underline-offset-4 hover:underline"
            >
              {page.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-white/60 text-sm mt-10">
        This sitemap helps you explore all pages of The Clean Code. For search
        engine indexing, view our <a href="/sitemap.xml" className="underline text-[var(--accent)] hover:text-emerald-400">XML sitemap</a>.
      </p>
    </section>
  );
}
