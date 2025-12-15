"use client";

import { useEffect } from "react";

export default function AdSlot({
  slot = "1234567890",
  format = "auto",
  style = {},
}) {
  useEffect(() => {
    try {
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
        data-ad-client="ca-pub-4743638908421899"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
