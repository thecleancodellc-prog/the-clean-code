// /utils/getReadingTime.js

export default function getReadingTime(htmlContent) {
  if (!htmlContent) return "PT1M"; // fallback
  const text = htmlContent.replace(/<[^>]*>/g, ""); // strip HTML tags
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 200;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `PT${minutes}M`; // ISO 8601 duration format
}
