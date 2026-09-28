import fs from "fs";

/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },

  // Merged/retired posts (see scripts/merge-posts.mjs) keep their old URLs working.
  async redirects() {
    try {
      return JSON.parse(fs.readFileSync(new URL("./data/redirects.json", import.meta.url), "utf8"));
    } catch {
      return [];
    }
  }
};

export default nextConfig;
