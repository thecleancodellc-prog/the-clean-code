export default async function sitemap() {
  const baseUrl = "https://www.thecleancode.co";

  const staticPages = [
    "",
    "about",
    "blog",
    "shop",
    "support",
    "privacy",
    "terms",
    "sitemap",
  ];

  return staticPages.map((page) => ({
    url: `${baseUrl}/${page}`,
    lastModified: new Date().toISOString(),
  }));
}
