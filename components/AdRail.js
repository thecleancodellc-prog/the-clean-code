"use client";

import { useEffect } from "react";

/**
 * Desktop-only sticky AdSense side rails
 * - Hidden on mobile/tablet
 * - Fixed size to prevent CLS
 * - Uses pointer-events safely
 */
export default function AdRail({
  leftSlot,
  rightSlot,
  width = 300,
  height = 600,
  topOffset = 96, // below your sticky header
  edgeGap = 16,
}) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("AdRail AdSense error:", e);
    }
  }, []);

  return (
    <div className="hidden lg:block pointer-events-none">
      {/* LEFT RAIL */}
      {leftSlot && (
        <div
          className="fixed z-30 pointer-events-auto"
          style={{
            top: topOffset,
            left: edgeGap,
            width,
            height,
          }}
        >
          <ins
            className="adsbygoogle"
            style={{
              display: "block",
              width,
              height,
            }}
            data-ad-client="ca-pub-4743638908421899"
            data-ad-slot={leftSlot}
            data-ad-format="rectangle"
            data-full-width-responsive="false"
          />
        </div>
      )}

      {/* RIGHT RAIL */}
      {rightSlot && (
        <div
          className="fixed z-30 pointer-events-auto"
          style={{
            top: topOffset,
            right: edgeGap,
            width,
            height,
          }}
        >
          <ins
            className="adsbygoogle"
            style={{
              display: "block",
              width,
              height,
            }}
            data-ad-client="ca-pub-4743638908421899"
            data-ad-slot={rightSlot}
            data-ad-format="rectangle"
            data-full-width-responsive="false"
          />
        </div>
      )}
    </div>
  );
}
