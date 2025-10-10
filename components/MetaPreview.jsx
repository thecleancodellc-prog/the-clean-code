"use client";

import { useState } from "react";
import Image from "next/image";

export default function MetaPreview({
  title,
  description,
  image,
  url,
  type = "article",
}) {
  const [layout, setLayout] = useState("facebook");

  const gradient =
    type === "article"
      ? "from-green-400 to-emerald-600"
      : "from-gray-500 to-gray-700";

  return (
    <div className="og-preview max-w-3xl mx-auto mt-10">
      {/* 🔁 Toggle */}
      <div className="flex items-center justify-between bg-[var(--card)] border-b border-gray-200 px-4 py-3">
        <p className="text-sm font-medium text-[var(--text)]">
          {layout === "facebook" ? "Facebook / LinkedIn Preview" : "Twitter Preview"}
        </p>
        <button
          onClick={() =>
            setLayout(layout === "facebook" ? "twitter" : "facebook")
          }
          className="text-xs font-medium text-white bg-[var(--accent)] rounded-md px-3 py-1.5 hover:opacity-90 transition"
        >
          Switch to {layout === "facebook" ? "Twitter" : "Facebook"}
        </button>
      </div>

      {/* 📄 Preview Layouts */}
      {layout === "facebook" ? (
        /* 🟩 Facebook-style Card */
        <div className="bg-[var(--card)] text-[var(--text)] hover-scale">
          {image && (
            <div className="relative w-full h-56 bg-gray-100">
              <Image
                src={image}
                alt={title || "Preview Image"}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="p-5">
            <h3 className="text-lg font-semibold mb-1">{title || "Untitled Page"}</h3>
            <p className="text-sm text-gray-600 line-clamp-3 mb-2">
              {description || "No description provided."}
            </p>
            <p className="text-xs text-[var(--accent)] truncate">
              {url || "https://www.thecleancode.co"}
            </p>
          </div>
        </div>
      ) : (
        /* 🟦 Twitter-style Card */
        <div className="flex bg-[var(--card)] text-[var(--text)] hover-scale">
          {image && (
            <div className="relative w-40 h-40 flex-shrink-0 bg-gray-100">
              <Image
                src={image}
                alt={title || "Preview Image"}
                fill
                className="object-cover rounded-l-xl"
              />
            </div>
          )}
          <div className="p-5 flex flex-col justify-center">
            <h3 className="text-base font-semibold mb-1">
              {title || "Untitled Page"}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-1">
              {description || "No description provided."}
            </p>
            <p className="text-xs text-[var(--accent)] truncate">
              {url || "https://www.thecleancode.co"}
            </p>
          </div>
        </div>
      )}

      {/* 🌈 Footer Bar */}
      <div
        className={`bg-gradient-to-r ${gradient} px-4 py-2 text-center text-white/90 text-xs`}
      >
        The Clean Code — Social Card Preview
      </div>
    </div>
  );
}
