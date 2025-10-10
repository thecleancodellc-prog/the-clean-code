"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookieConsent");
    if (!accepted) setVisible(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] sm:w-auto max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 text-sm text-white/90 shadow-lg">
      <p>
        This site uses cookies to enhance your browsing experience and collect
        anonymous analytics. By continuing to use this site, you accept our{" "}
        <a
          href="/privacy"
          className="underline text-[var(--accent)] hover:text-emerald-400"
        >
          Privacy Policy
        </a>
        .
      </p>
      <button
        onClick={acceptCookies}
        className="mt-3 px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-emerald-600 transition"
      >
        Accept
      </button>
    </div>
  );
}
