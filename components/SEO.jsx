"use client";

import Head from "next/head";
import { usePathname } from "next/navigation";
import { seoDefaults } from "../data/seoDefaults";

export default function SEO({
  type,
  title,
  description,
  url,
  image,
  author,
  datePublished,
  relatedProducts = [],
  readingTime,
}) {
  const pathname = usePathname();
  const fullUrl = `${seoDefaults.siteUrl}${pathname}`;

  // Auto-detect type based on route
  const routeType =
    type ||
    (pathname.startsWith("/blog")
      ? "article"
      : pathname.startsWith("/shop")
      ? "product"
      : "website");

  const pageTitle =
    title ||
    (pathname === "/"
      ? seoDefaults.meta.defaultTitle
      : seoDefaults.meta.titleTemplate.replace(
          "%s",
          pathname
            .split("/")
            .filter(Boolean)
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" ")
        ));

  const pageDescription = description || seoDefaults.meta.defaultDescription;
  const pageImage = image || seoDefaults.defaultImage;

  // JSON-LD Schema setup
  const jsonLd = {
    "@context": "https://schema.org",
    "@type":
      routeType === "article"
        ? "Article"
        : routeType === "product"
        ? "Product"
        : "WebSite",
    headline: pageTitle,
    description: pageDescription,
    url: fullUrl,
    image: pageImage,
    publisher: {
      "@type": "Organization",
      name: seoDefaults.siteName,
      logo: {
        "@type": "ImageObject",
        url: seoDefaults.logo,
      },
    },
  };

  // Optional metadata for articles
  if (readingTime) jsonLd.timeRequired = readingTime;

  if (routeType === "article" && author) {
    jsonLd.author = {
      "@type": "Person",
      name: author?.name,
      description: author?.bio,
      image: author?.photo
        ? `${seoDefaults.siteUrl}${author.photo}`
        : seoDefaults.logo,
    };
    if (datePublished) jsonLd.datePublished = datePublished;
    if (relatedProducts?.length > 0) {
      jsonLd.mentions = relatedProducts.map((p) => ({
        "@type": "Product",
        name: p.title,
        url: `${seoDefaults.siteUrl}${p.link}`,
      }));
    }
  }

  return (
    <Head>
      {/* Primary Meta */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={routeType} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content={seoDefaults.siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta
        name="twitter:creator"
        content={seoDefaults.social.twitterHandle || "@thecleancode"}
      />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}
