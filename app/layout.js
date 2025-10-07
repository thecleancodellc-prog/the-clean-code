import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: {
    default: "The Clean Code — Clean living without the overwhelm",
    template: "%s • The Clean Code"
  },
  description: "Non-toxic household swaps, ingredient-short shopping, and practical routines.",
  metadataBase: new URL("https://www.thecleancode.com"),
  openGraph: {
    title: "The Clean Code",
    description: "Non-toxic household swaps made simple.",
    url: "https://www.thecleancode.com",
    siteName: "The Clean Code",
    images: [
      { url: "/og-default.jpg", width: 1200, height: 630 }
    ],
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
