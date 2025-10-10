// data/posts.js
export const posts = [
  {
    slug: "cleaning-hacks",
    title: "10 Non-Toxic Cleaning Hacks",
    excerpt: "Switch your home to safe and simple alternatives with these easy DIY cleaning tricks.",
    date: "2025-10-08",
    cover: "/images/cleaning.jpg",
    featured: true,
    categories: ["Cleaning", "Home"], // 👈 this is used by the filter
    content: `
      <h2>1. Vinegar Glass Cleaner</h2>
      <p>Mix 1 part white vinegar with 1 part water in a glass spray bottle. Works great on windows and mirrors.</p>

      <h2>2. Baking Soda Scrub</h2>
      <p>Use baking soda and a touch of water for a powerful natural scrub on sinks and tubs.</p>

      <h2>3. Lemon Freshener</h2>
      <p>Rub half a lemon on cutting boards or in the garbage disposal to kill odors naturally.</p>
    `
  },
  {
    slug: "eco-cleaners",
    title: "Best Eco Cleaners of 2025",
    excerpt: "Our top picks for non-toxic cleaners that actually perform — safe for your home and planet.",
    date: "2025-09-28",
    cover: "/images/eco-cleaners.jpg",
    featured: false,
    content: `
      <h2>Top Rated Brands</h2>
      <p>We reviewed the most popular eco-friendly cleaners for 2025 — focusing on ingredients, performance, and sustainability.</p>

      <ul>
        <li><strong>Branch Basics</strong> – plant-based, refillable system.</li>
        <li><strong>Force of Nature</strong> – DIY cleaning solution that uses salt, water, and vinegar.</li>
        <li><strong>Blueland</strong> – concentrated tablets that dissolve into reusable bottles.</li>
      </ul>
    `
  },
  {
    slug: "toxic-ingredients",
    title: "Hidden Toxins in Everyday Products",
    excerpt: "Many household products contain chemicals that can harm your hormones, lungs, and skin. Here's how to identify them.",
    date: "2025-09-15",
    cover: "/images/toxins.jpg",
    featured: true,
    content: `
      <h2>Watch Out For These</h2>
      <p>Phthalates, parabens, and synthetic fragrances are among the worst offenders. Look for products with short, transparent ingredient lists.</p>
    `
  }
];
