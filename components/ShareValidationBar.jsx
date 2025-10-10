"use client";

import { useState } from "react";

export default function ShareValidationBar({ url }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openValidator = (site) => {
    if (site === "facebook") {
      window.open(`https://developers.facebook.com/tools/debug/?q=${url}`, "_blank");
    } else if (site === "twitter") {
      window.open(`https://cards-dev.twitter.com/validator`, "_blank");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
      <button
        onClick={copyUrl}
        className="px-4 py-2 rounded-md text-white font-medium transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-emerald-600 hover:opacity-90 hover:shadow-md"
      >
        {copied ? "✅ Copied!" : "Copy OG URL"}
      </button>
      <button
        onClick={() => openValidator("facebook")}
        className="px-4 py-2 rounded-md text-white font-medium transition-all duration-200 bg-gradient-to-r from-[#3b5998] to-[#4c70ba] hover:opacity-90 hover:shadow-md"
      >
        Facebook Debugger
      </button>
      <button
        onClick={() => openValidator("twitter")}
        className="px-4 py-2 rounded-md text-white font-medium transition-all duration-200 bg-gradient-to-r from-[#1DA1F2] to-[#46b3ff] hover:opacity-90 hover:shadow-md"
      >
        Twitter Validator
      </button>
    </div>
  );
}
