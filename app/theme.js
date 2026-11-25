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

    modern: (s, c, base) => ({ base, layers: [["linear-gradient(transparent, transparent)"]] }),
    custom: (s, c, base) => ({
      base,
      layers: [[`radial-gradient(${rgba(c.unknown, s === "dark" ? 0.3 : 0.45)} 1px, transparent 1.6px)`, "24px 24px", "repeat"]],
    }),
    boho: (s, c, base) => {
      const o = s === "dark" ? 0.3 : 0.5;
      const arch = (x, w, h, col, sw) => `<path d='M${x} 150 V${150 - h} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${150 - h} V150' fill='none' stroke='${col}' stroke-width='${sw}'/>`;
      const plume = (x, y, rot) => {
        let p = `<path d='M${x} ${y + 40} Q${x + 3} ${y + 20} ${x} ${y}' stroke='${c.process}' fill='none' stroke-width='1.2'/>`;
        for (let i = 0; i < 7; i++) p += `<path d='M${x} ${y + 6 + i * 4} q${i % 2 ? 9 : -9} -7 ${i % 2 ? 13 : -13} -16' stroke='${c.process}' fill='none' stroke-width='1' stroke-linecap='round'/>`;
        return `<g transform='rotate(${rot} ${x} ${y + 40})'>${p}</g>`;
      };
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><g opacity='${o}'>` +
        arch(30, 90, 52, c.todo, 2.4) + arch(42, 66, 44, c.done, 2) + arch(54, 42, 36, c.todo, 1.6) +
        plume(16, 86, -12) + plume(136, 80, 14) + `</g></svg>`;
      return { base, layers: [[uri(svg), "150px 150px", "repeat"]] };
    },
    rustic: (s, c, base) => {
      const o = s === "dark" ? 0.22 : 0.4;
      const pine = (x, y, k) =>
        `<g transform='translate(${x} ${y}) scale(${k})' fill='${c.done}'><path d='M0 -34 L12 -14 H5 L16 4 H6 L20 24 H-20 L-6 4 H-16 L-5 -14 H-12 Z'/><rect x='-3' y='24' width='6' height='9' fill='${c.todo}'/></g>`;
      const antler = (x, y, flip) =>
        `<g transform='translate(${x} ${y}) scale(${flip} 1)' fill='none' stroke='${c.todo}' stroke-width='2.2' stroke-linecap='round'><path d='M0 18 Q4 4 14 -6 M8 4 Q16 4 22 -2 M10 -2 Q10 -12 16 -18 M0 18 Q-4 4 -14 -6 M-8 4 Q-16 4 -22 -2 M-10 -2 Q-10 -12 -16 -18'/></g>`;
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g opacity='${o}'>` +
        pine(34, 50, 1) + pine(112, 38, 0.8) + pine(76, 132, 1.05) + antler(122, 112, 1) + antler(24, 128, -1) +
        `</g></svg>`;
      return { base, layers: [[uri(svg), "160px 160px", "repeat"]] };
    },
    deco: (s, c, base) => {
      const o = s === "dark" ? 0.55 : 0.5;
      const arcs = (cx, cy) => [8, 16, 24, 32, 40].map((r) => `<circle cx='${cx}' cy='${cy}' r='${r}'/>`).join("");
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='40' viewBox='0 0 80 40'><g fill='none' stroke='${c.process}' stroke-width='1' opacity='${o}'>` +
        arcs(40, 40) + arcs(0, 0) + arcs(80, 0) + `</g></svg>`;
      return { base, layers: [[uri(svg), "80px 40px", "repeat"]] };
    },
    vineyard: (s, c, base) => {
      const o = s === "dark" ? 0.25 : 0.42;
      const grapes = (x, y, k) => {
        let g = "";
        [[0, 0], [10, 0], [20, 0], [5, 9], [15, 9], [10, 18]].forEach(([dx, dy]) => (g += `<circle cx='${dx}' cy='${dy}' r='5.2' fill='${c.todo}'/>`));
        return `<g transform='translate(${x} ${y}) scale(${k})'>${g}<path d='M10 -4 q-2 -9 -8 -12' stroke='${c.done}' stroke-width='1.6' fill='none'/></g>`;
      };
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><g opacity='${o}'>` +
        `<path d='M0 30 Q40 6 75 34 T150 30' stroke='${c.done}' stroke-width='1.6' fill='none'/>` +
        leaf(28, 22, 12, -50, c.done) + leaf(100, 22, 12, 40, c.done) + leaf(60, 56, 11, 130, c.done) +
        grapes(32, 70, 1) + grapes(104, 96, 0.85) + leaf(120, 128, 11, -30, c.done) + leaf(18, 132, 10, 60, c.done) +
        `</g></svg>`;
      return { base, layers: [[uri(svg), "150px 150px", "repeat"]] };
    },
    winter: (s, c, base) => {
      const col = s === "dark" ? "#cfe0f5" : "#8fb0d4";
      const o = s === "dark" ? 0.3 : 0.55;
      const flake = (x, y, r) => {
        let p = "";
        for (let i = 0; i < 3; i++)
          p += `<g transform='rotate(${i * 60})'><path d='M0 ${-r} V${r} M0 ${-r * 0.55} l${r * 0.22} ${-r * 0.2} M0 ${-r * 0.55} l${-r * 0.22} ${-r * 0.2} M0 ${r * 0.55} l${r * 0.22} ${r * 0.2} M0 ${r * 0.55} l${-r * 0.22} ${r * 0.2}'/></g>`;
        return `<g transform='translate(${x} ${y})'>${p}</g>`;
      };
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><g fill='none' stroke='${col}' stroke-width='1.4' stroke-linecap='round' opacity='${o}'>` +
        flake(36, 34, 16) + flake(104, 78, 11) + flake(48, 108, 8) + flake(120, 20, 6) +
        `</g><g fill='${col}' opacity='${o}'><circle cx='80' cy='28' r='1.8'/><circle cx='14' cy='78' r='1.6'/><circle cx='86' cy='120' r='1.8'/></g></svg>`;
      return { base, layers: [[uri(svg), "140px 140px", "repeat"]] };
    },
    autumn: (s, c, base) => {
      const o = s === "dark" ? 0.25 : 0.46;
      const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='170' height='170' viewBox='0 0 170 170'><g opacity='${o}'>` +
        leaf(34, 34, 17, 30, c.process) + leaf(112, 24, 15, -40, c.todo) + leaf(150, 80, 16, 70, "#a9701f") +
        leaf(60, 92, 16, -20, c.todo) + leaf(110, 140, 15, 50, c.process) + leaf(26, 148, 14, -60, c.done) + leaf(84, 52, 10, 100, "#a9701f") +
        `</g></svg>`;
      return { base, layers: [[uri(svg), "170px 170px", "repeat"]] };
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

    modern: {
      name: "Modern", blurb: "Plain white, one bold accent", font: '"Jost", system-ui, sans-serif',
      header: "#111111", accent: "#2f5bff",
      colors: { done: "#1f9d6b", process: "#f2a900", todo: "#e5484d", unknown: "#9aa0a6" },
      light: { base: "#ffffff", surface2: "#f5f5f6", border: "#e4e4e7" }, dark: { base: "#0f0f10" },
    },
    boho: {
      name: "Boho", blurb: "Arches and pampas grass, terracotta and sage", font: '"DM Serif Display", Georgia, serif',
      header: "#5a3d31", accent: "#c1694f",
      colors: { done: "#8da47e", process: "#e2a85a", todo: "#c4684d", unknown: "#c7bcae" },
      light: { base: "#f6efe6", surface2: "#f0e6d9", border: "#e3d5c3" }, dark: { base: "#1a1410" },
    },
    rustic: {
      name: "Rustic", blurb: "Pine trees, antlers, greenery", font: '"Rokkitt", Georgia, serif',
      header: "#2d2a22", accent: "#4f7a4b",
      colors: { done: "#4f7a4b", process: "#c99a3e", todo: "#a5482f", unknown: "#9a9484" },
      light: { base: "#ece5d6", surface2: "#e4dccb", border: "#d3c9b3" }, dark: { base: "#12150f" },
    },
    deco: {
      name: "Art Deco", blurb: "Gold fans on black", font: '"Poiret One", Georgia, serif',
      header: "#0b0b0b", accent: "#b8922b", stripe: (c) => `linear-gradient(90deg, ${c.process}, ${c.process})`,
      colors: { done: "#3c9b7a", process: "#d4af37", todo: "#b3344a", unknown: "#8d8a82" },
      light: { base: "#f3ecdc", surface2: "#ece3cf", border: "#dccfb2" }, dark: { base: "#0a0a0a" },
    },
    vineyard: {
      name: "Vineyard", blurb: "Grapevines in burgundy and olive", font: '"Cormorant Garamond", Georgia, serif',
      header: "#3a1220", accent: "#7b1e3a",
      colors: { done: "#7a8b3a", process: "#d6a24a", todo: "#8c2a3f", unknown: "#b0a8a0" },
      light: { base: "#f3ebe6", surface2: "#ece1db", border: "#ddcfc7" }, dark: { base: "#150a0e" },
    },
    winter: {
      name: "Winter", blurb: "Snowflakes, icy blues", font: '"Quicksand", system-ui, sans-serif',
      header: "#1b2b44", accent: "#3b7dd8",
      colors: { done: "#4aa391", process: "#f0b84a", todo: "#d9576b", unknown: "#a9b6c4" },
      light: { base: "#eef3f8", surface2: "#e6edf5", border: "#d3dde9" }, dark: { base: "#0d1522" },
    },
    autumn: {
      name: "Autumn", blurb: "Falling leaves, rust and gold", font: '"Lora", Georgia, serif',
      header: "#3d2415", accent: "#c4622d",
      colors: { done: "#7d8f3a", process: "#e0922f", todo: "#b5442a", unknown: "#b0a493" },
      light: { base: "#f4e9d8", surface2: "#ecdfca", border: "#dccdb2" }, dark: { base: "#18110b" },
    },
    custom: {
      name: "Custom", blurb: "Pick your own colors", font: '"Jost", system-ui, sans-serif',
      header: "#1d1b26", accent: "#7c4dff",
      colors: { done: "#2e9e6b", process: "#f0a30a", todo: "#e0475b", unknown: "#9aa1ab" },
      light: { base: "#f4f4f6", surface2: "#ececf0", border: "#dcdce2" }, dark: { base: "#101015" },
    },
  };
  const THEME_ORDER = ["floral", "formal", "country", "beach", "disco", "modern", "boho", "rustic", "deco", "vineyard", "winter", "autumn", "custom"];
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
