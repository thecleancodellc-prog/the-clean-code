import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export const metadata = {
  title: {
    default: "The Clean Code — Clean living without the overwhelm",
    template: "%s • The Clean Code",
  },
  description:
    "Non-toxic household swaps, ingredient-short shopping, and practical routines.",
  metadataBase: new URL("https://www.thecleancode.com"),
  openGraph: {
    title: "The Clean Code",
    description: "Non-toxic household swaps made simple.",
    url: "https://www.thecleancode.com",
    siteName: "The Clean Code",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body>
        <Header />

        {/* Page Transition Wrapper */}
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 15, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="min-h-screen"
          >
            {children}
          </motion.main>
        </AnimatePresence>

        <Footer />
      </body>
    </html>
  );
}
