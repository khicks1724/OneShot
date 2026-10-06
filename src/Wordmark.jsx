import React from "react";

export function Wordmark({ crest = true }) {
  return (
    <span className="team-mark" aria-hidden="true">
      {crest && (
        <svg className="team-crest" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="22" className="crest-ring" />
          <path
            className="crest-seam"
            d="M10 7 Q29 24 10 41 M38 7 Q19 24 38 41"
          />
          <path
            className="crest-stitches"
            d="M11 12 L16 10 M15 18 L20 16 M16 25 L21 25 M14 32 L19 34 M10 37 L15 40 M32 10 L37 12 M28 16 L33 18 M27 25 L32 25 M29 34 L34 32 M33 40 L38 37"
          />
          <text x="24" y="32" textAnchor="middle">
            1
          </text>
        </svg>
      )}
      <span className="jersey-script">One Shot</span>
    </span>
  );
}
