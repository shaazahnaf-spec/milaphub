"use client";

import { useState } from "react";

export default function ShareButton({ url, title }) {
  const [copied, setCopied] = useState(false);
  const text = `${title} - MilapHub`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;

  async function share() {
    try {
      if (navigator.share) return await navigator.share({ title, text, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* user cancelled */ }
  }

  const btn = "rounded-full border border-white/25 px-4 py-2 text-sm text-white hover:bg-white/10";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={share} className={btn}>{copied ? "Link copied" : "Share"}</button>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={btn}>WhatsApp</a>
    </div>
  );
}
