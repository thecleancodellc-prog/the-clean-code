export default function SEO({ type='website', title, description, url, image }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": type === 'article' ? "Article" : "WebSite",
    name: title,
    description,
    url,
    image
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
