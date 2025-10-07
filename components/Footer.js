export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="container py-10 text-sm text-white/70">
        <div className="md:flex md:items-end md:justify-between">
          <p>&copy; {new Date().getFullYear()} The Clean Code. All rights reserved.</p>
          <p className="mt-2 md:mt-0">
            <a href="/affiliate-disclosure" className="mr-4">Affiliate Disclosure</a>
            <a href="/privacy">Privacy</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
