"use client";

import { useEffect } from "react";

/**
 * Google AdSense component
 * Replace `data-ad-client` with your own publisher ID once approved.
 */
export default function AdSlot({
  slot = "1234567890", // Replace with your real Ad Slot ID later
  format = "auto",
  style = {},
}) {
  useEffect(() => {
    try {
      // Only push once per ad instance
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("AdSense load error:", err);
    }
  }, []);

  return (
    <div className="my-8 flex justify-center">
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          minHeight: 90,
          ...style,
        }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXX" // replace with your ID after approval
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
