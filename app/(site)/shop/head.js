import { products } from "../../../data/products";

export default function Head({ params }) {
  const product = products.find((p) => p.id === params.id);

  const baseUrl = "https://www.thecleancode.co";
  const title = product
    ? `${product.title} | The Clean Code`
    : "Product | The Clean Code";

  const description =
    product?.summary ||
    "Explore clean living essentials curated and tested by The Clean Code.";

  const image =
    product?.image ||
    `${baseUrl}/images/og/default-product.jpg`;

  const url = `${baseUrl}/shop/${params.id}`;

  return (
    <>
      {/* Primary Meta */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="The Clean Code" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@TheCleanCode" />

      {/* Theme + Favicon */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <meta name="theme-color" content="#10B981" />

      {/* Schema.org JSON-LD for Product SEO */}
      {product && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.title,
              description: product.summary,
              image: image,
              brand: {
                "@type": "Brand",
                name: product.brand,
              },
              offers: {
                "@type": "Offer",
                price: product.price?.replace(/[^0-9.]/g, ""),
                priceCurrency: "USD",
                url: product.affiliateUrl || url,
                availability: "https://schema.org/InStock",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: product.rating || 4.8,
                reviewCount: 25,
              },
            }),
          }}
        />
      )}
    </>
  );
}
