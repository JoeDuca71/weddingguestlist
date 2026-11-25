"use strict";
// Theme engine: turns a saved choice (theme + any color tweaks) into CSS variables and a page background.
// Loaded before app.js so the saved look is applied immediately, with no flash of the default.
//
// A theme is: a background pattern, a header color, a heading font, an accent color, and four STATE colors.
// The state colors drive every status pill and highlight in the app:
//   done = finished / confirmed, process = in progress, todo = still to do, unknown = not known yet.
// The user picks ONE hex per color; the soft background and the readable text color are derived from it,
// so any hex the user picks stays legible in both light and dark mode.

window.Theme = (() => {
  // ---------- Color math ----------
  const hex = (h) => {
    let s = String(h || "").trim().replace(/^#/, "");
    if (s.length === 3) s = [...s].map((c) => c + c).join("");
    return /^[0-9a-f]{6}$/i.test(s) ? "#" + s.toLowerCase() : null;
  };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(hex(h).slice(i, i + 2), 16));
  const toHex = (a) => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { // t = 0 gives a, t = 1 gives b
    const A = rgb(a), B = rgb(b);
    return toHex(A.map((v, i) => v * (1 - t) + B[i] * t));
  };
  const lum = (h) => {
    const [r, g, b] = rgb(h).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  // Push a color toward black (on light backgrounds) or white (on dark ones) until it is readable on `bg`.
  const readable = (h, bg, min = 4.5) => {
    const target = lum(bg) > 0.5 ? "#000000" : "#ffffff";
    let out = h;
    for (let t = 0; t <= 1.0001 && contrast(out, bg) < min; t += 0.04) out = mix(h, target, Math.min(1, t));
    return out;
  };
  const rgba = (h, a) => `rgb(${rgb(h).join(" ")} / ${a})`;
  const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));

  // ---------- Background patterns ----------
  // Small tiled SVGs / CSS gradients: crisp at any size, tinted by the theme's own colors, no image files.
  // Unquoted and fully escaped so it also works inside a style="" attribute (theme preview cards).
  const uri = (svg) => `url(data:image/svg+xml,${encodeURIComponent(svg).replace(/['()!*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())})`;
  const blossom = (cx, cy, r, petal, center) => {
    let p = "";
    for (let i = 0; i < 5; i++) p += `<ellipse cx='0' cy='${-r}' rx='${r * 0.62}' ry='${r}' transform='rotate(${i * 72})'/>`;
    return `<g transform='translate(${cx} ${cy})'><g fill='${petal}'>${p}</g><circle r='${r * 0.4}' fill='${center}'/></g>`;
  };
  const leaf = (cx, cy, len, rot, color) =>
    `<ellipse cx='${cx}' cy='${cy}' rx='${len * 0.34}' ry='${len}' transform='rotate(${rot} ${cx} ${cy})' fill='${color}'/>`;

  // Each returns { base, layers: [[image, size, repeat], ...] } for the given scheme and colors.
  const PATTERNS = {
    disco: (s, c, base) => {
      const tile = s === "dark" ? "rgb(255 255 255 / .04)" : "rgb(255 255 255 / .55)";
      return {
        base,
        layers: [
          [`repeating-linear-gradient(0deg, ${tile} 0 1px, transparent 1px 28px)`],
          [`repeating-linear-gradient(90deg, ${tile} 0 1px, transparent 1px 28px)`],
          [`radial-gradient(1200px 600px at 85% -10%, ${rgba(c.todo, 0.14)}, transparent 60%)`],
          [`radial-gradient(900px 500px at -10% 30%, ${rgba(c.done, 0.12)}, transparent 60%)`],
          [`radial-gradient(900px 600px at 50% 110%, ${rgba(c.process, 0.12)}, transparent 60%)`],
        ],
      };
    },
    floral: (s, c, base) => {
      const o = s === "dark" ? 0.2 : 0.42;
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'><g opacity='${o}'>` +
        leaf(78, 36, 14, 40, c.done) + leaf(92, 70, 13, 110, c.done) +
        leaf(176, 128, 15, -35, c.done) + leaf(196, 160, 13, 60, c.done) +
        leaf(52, 176, 12, 25, c.done) + leaf(30, 200, 11, 95, c.done) +
        leaf(212, 40, 10, 15, c.done) +
        blossom(56, 56, 17, c.todo, c.process) + blossom(170, 108, 21, c.todo, c.process) +
        blossom(44, 188, 13, c.todo, c.process) + blossom(206, 36, 11, c.todo, c.process) +
        blossom(120, 212, 9, c.todo, c.process) +
        `</g></svg>`;
      return { base, layers: [[uri(svg), "240px 240px", "repeat"]] };
    },
    formal: (s, c, base) => {
      const o = s === "dark" ? 0.2 : 0.34;
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g fill='none' stroke='${c.process}' stroke-width='1' opacity='${o}'>` +
        `<path d='M32 0 L64 32 L32 64 L0 32 Z'/><path d='M32 14 L50 32 L32 50 L14 32 Z'/></g>` +
        `<g fill='${c.process}' opacity='${o + 0.1}'><circle cx='32' cy='32' r='2.4'/><circle cx='0' cy='0' r='2'/><circle cx='64' cy='0' r='2'/><circle cx='0' cy='64' r='2'/><circle cx='64' cy='64' r='2'/></g></svg>`;
      return { base, layers: [[uri(svg), "64px 64px", "repeat"]] };
    },
    country: (s, c, base) => {
      const a = s === "dark" ? 0.1 : 0.17;
      const band = rgba(c.todo, a);
      return {
        base,
        layers: [
          [`repeating-linear-gradient(0deg, ${band} 0 22px, transparent 22px 44px)`],
          [`repeating-linear-gradient(90deg, ${band} 0 22px, transparent 22px 44px)`],
        ],
      };
    },
    beach: (s, c, base) => {
      const o = s === "dark" ? 0.18 : 0.34;
      const wave = (y, dx) => `<path d='M${dx - 30} ${y} Q${dx - 15} ${y - 13} ${dx} ${y} T${dx + 30} ${y} T${dx + 60} ${y} T${dx + 90} ${y} T${dx + 120} ${y} T${dx + 150} ${y}' fill='none' stroke='${c.done}' stroke-width='1.8' opacity='${o}'/>`;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='44' viewBox='0 0 120 44'>${wave(12, 0)}${wave(34, 15)}</svg>`;
      return {
        base,
        layers: [
          [`radial-gradient(900px 500px at 90% -10%, ${rgba(c.process, s === "dark" ? 0.1 : 0.28)}, transparent 65%)`],
          [uri(svg), "120px 44px", "repeat"],
        ],
      };
    },
  };

  // ---------- Themes ----------
  const THEMES = {
    floral: {
      name: "Floral", blurb: "Soft blossoms, pastel colors", font: '"Playfair Display", Georgia, serif',
      header: "#4b2e43", accent: "#d9789b",
      colors: { done: "#a8c8a0", process: "#f6d98b", todo: "#f2a0b5", unknown: "#c9c5cf" },
      light: { base: "#fbf3ee", surface2: "#f7ebe6", border: "#ead9d6" }, dark: { base: "#17111a" },
    },
    formal: {
      name: "Formal", blurb: "Black tie, ivory and gold", font: '"Cinzel", Georgia, serif',
      header: "#14110f", accent: "#b8902f", stripe: (c) => `linear-gradient(90deg, ${c.process}, ${c.process})`,
      colors: { done: "#2f6b4f", process: "#c9a24a", todo: "#8c2f39", unknown: "#8a8f98" },
      light: { base: "#f4efe6", surface2: "#efe8da", border: "#ddd3bf" }, dark: { base: "#0e0d0b" },
    },
    country: {
      name: "Country", blurb: "Gingham, kraft paper, barn red", font: '"Rokkitt", Georgia, serif',
      header: "#4a3426", accent: "#b0483a",
      colors: { done: "#7a8f4e", process: "#d9a441", todo: "#b0483a", unknown: "#a39e93" },
      light: { base: "#f1e8d8", surface2: "#ebdfc9", border: "#dccdb0" }, dark: { base: "#16120d" },
    },
    beach: {
      name: "Beach", blurb: "Sand, waves, bright colors", font: '"Fredoka", system-ui, sans-serif',
      header: "#0b4a5a", accent: "#12a6b8",
      colors: { done: "#1fbf9f", process: "#ffc53d", todo: "#ff6b5e", unknown: "#cfc6b3" },
      light: { base: "#f4eedd", surface2: "#ece9d8", border: "#ddd6bf" }, dark: { base: "#0b1619" },
    },
    disco: {
      name: "Disco", blurb: "Mirror balls and neon", font: '"Righteous", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      header: "#17121f", accent: "#ff2e93",
      colors: { done: "#a8e10c", process: "#ff7a1a", todo: "#ff2e93", unknown: "#a7aebb" },
      light: { base: "#e3e6eb", surface2: "#eef0f4", border: "#d3d7de" },
      dark: { base: "#0f0c15", surface: "#1c1726", surface2: "#261f33", border: "#3a3248" },
    },
  };
  const THEME_ORDER = ["floral", "formal", "country", "beach", "disco"];
  const DEFAULT_THEME = "disco";

  // The four states, what they mean, and which statuses use each. The pill classes in styles.css follow this.
  const STATES = [
    { key: "done", label: "Done", note: "Finished or confirmed", examples: ["Yes", "Seated", "Delivered"] },
    { key: "process", label: "In process", note: "In progress or waiting on someone", examples: ["Postcard Sent", "Maybe", "Emailed"] },
    { key: "todo", label: "To do", note: "Still needs doing", examples: ["Not Contacted", "Need to Seat", "Need to Do"] },
    { key: "unknown", label: "Unknown", note: "Not known yet", examples: ["TBD", "Unknown", "n/a"] },
  ];
  const STATE_KEYS = STATES.map((s) => s.key);

  // ---------- Resolving and applying ----------
  const KEY = "wedding-guests:settings";
  let current = { theme: DEFAULT_THEME, colors: {}, accent: null };

  function clean(s) {
    const theme = THEMES[s?.theme] ? s.theme : DEFAULT_THEME;
    const colors = {};
    for (const k of STATE_KEYS) if (hex(s?.colors?.[k])) colors[k] = hex(s.colors[k]);
    return { theme, colors, accent: hex(s?.accent) || null };
  }
  function resolve(s) {
    const st = clean(s), t = THEMES[st.theme];
    return { id: st.theme, theme: t, colors: { ...t.colors, ...st.colors }, accent: st.accent || t.accent };
  }
  const isCustom = (s) => {
    const st = clean(s);
    return Object.keys(st.colors).some((k) => st.colors[k] !== THEMES[st.theme].colors[k]) || (st.accent && st.accent !== THEMES[st.theme].accent);
  };

  const dark = () => !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  function surfaces(r, scheme) {
    const t = r.theme;
    if (scheme === "dark") {
      const b = t.dark.base;
      return {
        base: b,
        surface: t.dark.surface || mix(b, "#ffffff", 0.07),
        surface2: t.dark.surface2 || mix(b, "#ffffff", 0.12),
        border: t.dark.border || mix(b, "#ffffff", 0.2),
      };
    }
    return { base: t.light.base, surface: "#ffffff", surface2: t.light.surface2, border: t.light.border };
  }

  // CSS for the page background, for the real page and for the theme preview cards.
  function backgroundCss(s, scheme = "light") {
    const r = resolve(s), sf = surfaces(r, scheme);
    const { base, layers } = PATTERNS[r.id](scheme, r.colors, sf.base);
    return (
      `background-color:${base};background-image:${layers.map((l) => l[0]).join(",")};` +
      `background-size:${layers.map((l) => l[1] || "auto").join(",")};background-repeat:${layers.map((l) => l[2] || "repeat").join(",")}`
    );
  }

  function variables(s, scheme) {
    const r = resolve(s), sf = surfaces(r, scheme), v = {};
    v["--bg"] = sf.base; v["--surface"] = sf.surface; v["--surface-2"] = sf.surface2; v["--border"] = sf.border;
    v["--night"] = r.theme.header; v["--display"] = r.theme.font;
    v["--disco"] = (r.theme.stripe || ((c) => `linear-gradient(90deg, ${c.todo}, ${c.process}, ${c.done})`))(r.colors);
    for (const k of STATE_KEYS) {
      const soft = mix(r.colors[k], sf.surface, 0.78);
      v[`--st-${k}`] = r.colors[k]; v[`--st-${k}-soft`] = soft; v[`--st-${k}-ink`] = readable(r.colors[k], soft);
    }
    const accent = readable(r.accent, sf.surface);
    v["--pink"] = r.accent; v["--accent"] = accent; v["--accent-soft"] = mix(accent, sf.surface, 0.86);
    v["--on-accent"] = contrast(accent, "#ffffff") >= contrast(accent, "#000000") ? "#ffffff" : "#000000";
    // Older rules in styles.css still use these names.
    v["--lime"] = r.colors.done; v["--orange"] = r.colors.process; v["--silver"] = r.colors.unknown;
    v["--today"] = v["--st-done-ink"]; v["--today-soft"] = v["--st-done-soft"];
    return v;
  }

  function apply(s) {
    current = clean(s);
    const scheme = dark() ? "dark" : "light";
    const root = document.documentElement;
    for (const [k, val] of Object.entries(variables(current, scheme))) root.style.setProperty(k, val);
    let tag = document.getElementById("theme-style");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "theme-style";
      document.head.appendChild(tag);
    }
    tag.textContent = `body{${backgroundCss(current, scheme)};background-attachment:fixed}`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES[current.theme].header);
  }

  // Two state colors that are hard to tell apart (so the user can be warned).
  function lookAlikes(s) {
    const c = resolve(s).colors, out = [];
    for (let i = 0; i < STATE_KEYS.length; i++)
      for (let j = i + 1; j < STATE_KEYS.length; j++)
        if (dist(c[STATE_KEYS[i]], c[STATE_KEYS[j]]) < 40) out.push([STATE_KEYS[i], STATE_KEYS[j]]);
    return out;
  }

  // ---------- Saved copy on this device (applied instantly at load) ----------
  function loadLocal() {
    try {
      return clean(JSON.parse(localStorage.getItem(KEY)));
    } catch {
      return clean(null);
    }
  }
  function saveLocal(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(clean(s)));
    } catch {}
  }

  apply(loadLocal());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => apply(current));

  return { THEMES, THEME_ORDER, STATES, STATE_KEYS, apply, clean, resolve, isCustom, backgroundCss, lookAlikes, loadLocal, saveLocal, get: () => current, hex };
})();
