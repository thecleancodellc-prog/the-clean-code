export default async function sitemap() {
  const base = "https://www.thecleancode.com";
  const routes = ["", "/blog", "/guides", "/shop", "/about", "/affiliate-disclosure", "/privacy"].map((r) => ({
    url: base + r,
    lastModified: new Date().toISOString().split('T')[0]
  }));
  return routes;
}
