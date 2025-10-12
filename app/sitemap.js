// app/sitemap.js

import { posts } from "@/data/posts";
import { products } from "@/data/products";

export default async function sitemap() {
  const baseUrl = "https://www.thecleancode.co";

  // Static core pages
  const staticPages = [
    "",
    "about",
    "blog",
    "shop",
    "support",
    "privacy",
    "terms",
    "sitemap",
  ].map((page) => ({
    url: `${baseUrl}/${page}`,
    lastModified: new Date().toISOString(),
  }));

  // Blog posts
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.date || new Date().toISOString(),
  }));

  // Shop products
  const productPages = products.map((p) => ({
    url: `${baseUrl}/shop/${p.id}`,
    lastModified: new Date().toISOString(),
  }));

  // Combine them all together
  return [...staticPages, ...blogPages, ...productPages];
}
