import React, { useEffect, useRef, useState } from "react";
import "./mascot.css";

export const mascots = {
  slug: {
    name: "Slugger",
    description: "Slow on the sidewalk. Quick on the draw.",
    label: "The curious blue slug",
  },
  ticket: {
    name: "Stubbs",
    description: "One ticket. Two feet. A lot to prove.",
    label: "The walking game-show ticket",
  },
};

export function Mascot({ kind = "slug", mood = "idle", compact = false }) {
  const ref = useRef(null);
  const [action, setAction] = useState(null);
  const timer = useRef(null);
  const reduced = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    let frame = null;
    function track(event) {
      if (reduced.current || !ref.current || compact) return;
      if (frame) cancelAnimationFrame(frame);
      const x = event.clientX,
        y = event.clientY;
      frame = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = Math.max(-1, Math.min(1, (x - r.left - r.width / 2) / 260));
        const dy = Math.max(-1, Math.min(1, (y - r.top - r.height / 2) / 220));
        ref.current.style.setProperty("--look-x", `${dx * 5}px`);
        ref.current.style.setProperty("--look-y", `${dy * 3}px`);
        ref.current.style.setProperty("--lean", `${dx * 3}deg`);
      });
    }
    const reset = () => {
      ref.current?.style.setProperty("--look-x", "0px");
      ref.current?.style.setProperty("--look-y", "0px");
      ref.current?.style.setProperty("--lean", "0deg");
    };
    if (!compact) {
      window.addEventListener("pointermove", track, { passive: true });
      document.addEventListener("pointerleave", reset);
    }
    return () => {
      window.removeEventListener("pointermove", track);
      document.removeEventListener("pointerleave", reset);
      media.removeEventListener("change", update);
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(timer.current);
    };
  }, [compact]);
  const effective = action || mood;
  function greet() {
    setAction("wave");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAction(null), 1400);
  }
  const art = (
    <svg
      viewBox="0 0 300 280"
      role="img"
      aria-label={`${mascots[kind].name}, ${mascots[kind].label}`}
    >
      <ellipse className="mascot-shadow" cx="150" cy="252" rx="85" ry="8" />
      <g className="character">
        {kind === "slug" ? (
          <>
            <path className="mascot-arm back-arm" d="M91 183 Q57 173 45 151" />
            <path
              className="mascot-hand"
              d="M46 153 C34 151 30 141 35 137 C39 135 43 139 45 142 C38 127 42 123 47 129 L53 141 C61 135 66 141 58 149 Z"
            />
            <path
              className="mascot-body"
              d="M67 220 C77 208 74 197 79 179 C89 145 126 137 164 147 C199 155 210 181 222 198 C231 211 247 218 268 217 C258 238 232 246 197 244 L91 244 C66 244 54 233 67 220 Z"
            />
            <path
              className="mascot-belly"
              d="M74 222 C109 223 150 233 195 229 C221 228 244 224 257 225 C242 238 223 243 195 242 L91 242 C77 242 62 234 74 222 Z"
            />
            <path
              className="antenna"
              d="M116 153 Q107 123 110 99 M161 151 Q174 125 176 95"
            />
            <g className="eye eye-left">
              <ellipse className="eyewhite" cx="110" cy="94" rx="22" ry="27" />
              <g className="pupil">
                <ellipse cx="114" cy="97" rx="8" ry="12" />
                <circle className="eye-glint" cx="117" cy="92" r="2.5" />
              </g>
            </g>
            <g className="eye eye-right">
              <ellipse className="eyewhite" cx="178" cy="91" rx="22" ry="27" />
              <g className="pupil">
                <ellipse cx="179" cy="94" rx="8" ry="12" />
                <circle className="eye-glint" cx="182" cy="89" r="2.5" />
              </g>
            </g>
            <path
              className="eyebrow"
              d="M89 58 Q103 52 115 58 M166 54 Q184 45 196 57"
            />
            <path className="cheek" d="M97 181 L109 184 M166 180 L178 176" />
            <path className="mouth smile" d="M119 186 Q137 205 156 185" />
            <path className="mouth worried" d="M123 196 Q136 185 152 196" />
            <path className="tooth" d="M132 192 L133 201 L142 201 L143 192" />
            <g className="front-arm">
              <path className="mascot-arm" d="M195 185 Q222 174 224 146" />
              <path
                className="mascot-hand"
                d="M223 150 C210 147 207 137 212 134 L220 139 L218 122 C218 116 225 116 227 122 L232 138 C241 130 248 135 241 144 L233 153 Z"
              />
            </g>
            <path
              className="badge-fill"
              d="M100 209 L123 211 L121 225 L98 222 Z"
            />
            <text className="badge-number" x="109" y="222" textAnchor="middle">
              1
            </text>
          </>
        ) : (
          <>
            <g className="legs">
              <path
                className="mascot-leg"
                d="M128 201 L115 232 M176 203 L189 231"
              />
              <path
                className="shoe"
                d="M115 226 Q92 226 88 240 L127 240 L130 230 Z"
              />
              <path
                className="shoe"
                d="M181 230 L183 241 L221 241 Q216 227 195 227 Z"
              />
            </g>
            <path className="mascot-arm back-arm" d="M88 138 Q57 139 47 167" />
            <path
              className="mascot-hand"
              d="M47 163 Q32 159 32 171 Q31 184 44 188 L55 181 L53 172 Z"
            />
            <path
              className="ticket-body"
              d="M92 66 L119 66 Q130 82 141 66 L207 66 L207 115 Q187 124 207 137 L207 207 L158 207 Q147 189 135 207 L91 207 L91 138 Q110 125 91 114 Z"
            />
            <path
              className="ticket-edge"
              d="M104 75 L104 105 M104 149 L104 194 M194 77 L194 104 M194 150 L194 194"
            />
            <path className="ticket-cap" d="M106 65 Q136 20 173 40 L183 67 Z" />
            <path className="cap-brim" d="M99 64 Q146 55 198 68" />
            <g className="eye">
              <ellipse className="eyewhite" cx="126" cy="108" rx="16" ry="21" />
              <g className="pupil">
                <ellipse cx="129" cy="112" rx="6" ry="9" />
                <circle className="eye-glint" cx="131" cy="108" r="2" />
              </g>
            </g>
            <g className="eye">
              <ellipse className="eyewhite" cx="175" cy="108" rx="16" ry="21" />
              <g className="pupil">
                <ellipse cx="173" cy="112" rx="6" ry="9" />
                <circle className="eye-glint" cx="175" cy="108" r="2" />
              </g>
            </g>
            <path className="mouth smile" d="M133 142 Q149 160 168 139" />
            <path className="mouth worried" d="M135 151 Q148 138 166 151" />
            <path className="ticket-rule" d="M112 168 L185 168" />
            <text className="ticket-number" x="148" y="192" textAnchor="middle">
              01
            </text>
            <g className="front-arm">
              <path className="mascot-arm" d="M207 132 Q230 121 240 98" />
              <path
                className="mascot-hand"
                d="M239 101 Q226 100 225 91 L232 88 L232 72 Q236 67 240 74 L245 88 Q258 79 262 89 L251 102 Z"
              />
            </g>
          </>
        )}
        <g className="celebration-marks">
          <path d="M54 59 L48 44 M231 53 L241 37 M247 184 L269 179" />
          <path d="M47 78 L31 73 M209 31 L211 17" />
        </g>
        <g className="thinking-marks">
          <circle cx="226" cy="72" r="4" />
          <circle cx="241" cy="50" r="6" />
          <text x="254" y="28">
            ?
          </text>
        </g>
      </g>
    </svg>
  );
  return compact ? (
    <div ref={ref} className={`mascot compact ${kind}`} data-mood={effective}>
      {art}
    </div>
  ) : (
    <button
      ref={ref}
      className={`mascot ${kind}`}
      data-mood={effective}
      onClick={greet}
      aria-label={`Say hello to ${mascots[kind].name}`}
      title={`Tap ${mascots[kind].name} for a wave`}
    >
      {art}
    </button>
  );
}

export function MascotStudio({ kind, onChange }) {
  return (
    <div className="mascot-studio">
      <div className="studio-heading">
        <span className="eyebrow">MEET THE HOME TEAM</span>
        <span>Choose your sidekick</span>
      </div>
      <div className="mascot-options">
        {Object.entries(mascots).map(([id, m]) => (
          <button
            key={id}
            className={kind === id ? "chosen" : ""}
            onClick={() => onChange(id)}
            aria-pressed={kind === id}
          >
            <Mascot kind={id} compact />
            <span>
              <b>{m.name}</b>
              <small>{m.description}</small>
            </span>
            <span className="mascot-selection">
              {kind === id ? "ON YOUR TEAM" : "TRY ME"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
