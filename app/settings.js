"use strict";
// The Settings page. Sections: The Happy Couple (who's getting married) and Design (theme + status colors).
// More sections plug into SECTIONS.
// Uses helpers from app.js ($, esc, slug, toast, api, setTab) and the theme engine in theme.js.

window.Settings = (() => {
  const SECTIONS = [
    { key: "couple", label: "💍 The Happy Couple" },
    { key: "design", label: "🎨 Design" },
  ];
  let section = "couple";
  let saveTimer;
  let remoteOk = true;
  let warned = false;

  // ---------- The Happy Couple ----------
  // Two people, each with a first name and a role, so a couple can be two brides, two grooms, or one of each.
  const ROLES = ["Bride", "Groom"];
  const COUPLE_KEY = "wedding-guests:couple";
  const cleanCouple = (c) =>
    [0, 1].map((i) => ({
      name: String(c?.[i]?.name ?? "").slice(0, 60),
      role: ROLES.includes(c?.[i]?.role) ? c[i].role : "",
    }));
  const loadCoupleLocal = () => {
    try {
      return cleanCouple(JSON.parse(localStorage.getItem(COUPLE_KEY)));
    } catch {
      return cleanCouple(null);
    }
  };
  let couple = loadCoupleLocal();
  const saveCoupleLocal = () => {
    try {
      localStorage.setItem(COUPLE_KEY, JSON.stringify(couple));
    } catch {}
  };
  // "Joe & Dylan", "Joe", or "" depending on what's filled in.
  const coupleNames = () => couple.map((p) => p.name.trim()).filter(Boolean).join(" & ");

  // ---------- Saving ----------
  // The look is applied and kept on this device at once; it is also saved to the database so every
  // person using this guest list (and every device) sees the same thing.
  function persist() {
    Theme.saveLocal(Theme.get());
    saveCoupleLocal();
    setStatus("Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveRemote, 500);
  }
  function changed(next) {
    Theme.apply(next);
    persist();
  }
  async function saveRemote() {
    if (!remoteOk) return setStatus("Saved on this device only");
    try {
      await api.saveSettings({ ...Theme.get(), couple });
      setStatus("Saved");
    } catch {
      remoteOk = false;
      setStatus("Saved on this device only");
      if (!warned) {
        warned = true;
        toast("Saved on this device only. Run supabase/04_settings.sql to share your design with everyone.", true);
      }
    }
  }
  function setStatus(t) {
    const el = document.getElementById("settings-status");
    if (el) el.textContent = t;
  }
  async function loadRemote() {
    try {
      const data = await api.loadSettings();
      if (data) {
        Theme.apply(data);
        Theme.saveLocal(Theme.get());
        if (data.couple) {
          couple = cleanCouple(data.couple);
          saveCoupleLocal();
        }
      }
    } catch {
      remoteOk = false;
    }
  }

  // ---------- Rendering ----------
  const examplePills = (examples) => examples.map((e) => `<span class="pill v-${slug(e)}">${esc(e)}</span>`).join(" ");

  function themeCardHtml(id, selected) {
    const t = Theme.THEMES[id];
    const dots = Theme.STATE_KEYS.map((k) => `<i style="background:${t.colors[k]}"></i>`).join("");
    return `<button type="button" class="theme-card ${selected ? "on" : ""}" data-theme="${id}" aria-pressed="${selected}">
      <span class="theme-swatch" style="${Theme.backgroundCss({ theme: id }, "light")}"><span class="theme-dots">${dots}</span></span>
      <strong>${esc(t.name)}</strong><small>${esc(t.blurb)}</small>
    </button>`;
  }

  function colorRowHtml(key, label, note, value, isDefault, extra) {
    return `<div class="color-row" data-row="${key}">
      <div class="color-info"><strong>${esc(label)}</strong><small>${esc(note)}</small></div>
      <div class="color-controls">
        <input type="color" data-scolor="${key}" value="${value}" aria-label="${esc(label)} color">
        <input type="text" class="hexbox" data-shex="${key}" value="${value}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="${esc(label)} hex code">
        <button type="button" class="linkish reset-one" data-reset-one="${key}" ${isDefault ? "hidden" : ""}>Reset</button>
      </div>
      <div class="color-samples">${extra}</div>
    </div>`;
  }

  function warnHtml() {
    const pairs = Theme.lookAlikes(Theme.get());
    const label = Object.fromEntries(Theme.STATES.map((s) => [s.key, s.label]));
    return pairs.length
      ? `<p class="warn">⚠ ${pairs.map(([a, b]) => `“${label[a]}” and “${label[b]}”`).join(", ")} look very similar, so they will be hard to tell apart in the list.</p>`
      : "";
  }

  function previewHtml() {
    const row = (name, inv, rsvp, hotel, ap) =>
      `<tr><td data-label="Family"><strong>${esc(name)}</strong></td>${[inv, rsvp, hotel, ap]
        .map((v, i) => `<td data-label="${["Invite status", "RSVP", "Hotel", "After-party"][i]}"><span class="pill v-${slug(v)}">${esc(v)}</span></td>`)
        .join("")}</tr>`;
    return `<div class="tablewrap"><table class="guests preview"><thead><tr><th>Family</th><th>Invite status</th><th>RSVP</th><th>Hotel</th><th>After-party</th></tr></thead><tbody>
      ${row("Sue & Chris Tracey", "Done", "Yes", "Yes Host Hotel", "Yes")}
      ${row("The Brad Johnson Family", "Postcard Sent", "Maybe", "Maybe Host Hotel", "Likely")}
      ${row("Marco & Lena Ruiz", "Texted for Address", "TBD", "Unknown", "Unknown")}
      ${row("Priya Shah & Guest", "Need to Text for Address", "No", "n/a", "No")}
      ${row("Uncle Vince Duca", "Not Contacted", "TBD", "Need to Do", "Unknown")}
    </tbody></table></div>
    <div class="preview-actions"><button type="button" class="btn primary">Primary button</button><button type="button" class="btn">Button</button>
    <span class="vbtn on">Selected</span><a href="#" onclick="return false">A link</a></div>`;
  }

  function coupleHtml() {
    const card = (i) => `<div class="partner">
      <h4>Partner ${i + 1}</h4>
      <label class="field"><span>First name</span><input type="text" data-cname="${i}" value="${esc(couple[i].name)}" maxlength="60" autocomplete="off"></label>
      <label class="field"><span>Role</span><select data-crole="${i}">${optionsHtml(ROLES, couple[i].role, { blank: true })}</select></label>
    </div>`;
    return `
      <h3>The Happy Couple</h3>
      <p class="muted">Who is getting married. Two brides, two grooms, or one of each: pick a role for each person.</p>
      <div class="partners">${card(0)}${card(1)}</div>
      <p class="couple-line" id="couple-line">${coupleLine()}</p>`;
  }
  function coupleLine() {
    const n = coupleNames();
    const roles = couple.every((p) => p.name.trim() && p.role) ? couple.map((p) => p.role).join(" & ") : "";
    return n ? `<strong>${esc(n)}</strong>${roles ? ` <span class="muted">· ${esc(roles)}</span>` : ""}` : "";
  }

  function designHtml() {
    const s = Theme.get(), r = Theme.resolve(s), t = Theme.THEMES[s.theme];
    return `
      <h3>Theme</h3>
      <p class="muted">A theme sets the background pattern, header, heading font, accent and the four status colors. You can fine-tune any color afterwards.</p>
      <div class="theme-grid">${Theme.THEME_ORDER.map((id) => themeCardHtml(id, id === s.theme)).join("")}</div>

      <div class="settings-row-head"><h3>Status colors</h3>
        <button type="button" class="btn small" data-reset-colors ${Theme.isCustom(s) ? "" : "disabled"}>Reset to ${esc(t.name)} defaults</button></div>
      <p class="muted">These four colors show up on every status pill and highlight in the guest list. Pick any color; the soft background and readable text are worked out for you.</p>
      <div class="color-list">
        ${Theme.STATES.map((st) => colorRowHtml(st.key, st.label, st.note, r.colors[st.key], r.colors[st.key] === t.colors[st.key], examplePills(st.examples))).join("")}
        ${colorRowHtml("accent", "Accent", "Buttons, links, selected tabs and the header stripe", r.accent, r.accent === t.accent, `<span class="btn primary small" aria-hidden="true">Button</span>`)}
      </div>
      <div id="settings-warn">${warnHtml()}</div>

      <h3>Preview</h3>
      ${previewHtml()}`;
  }

  function render() {
    const box = document.getElementById("settings-view");
    box.innerHTML = `
      <div class="settings-head"><h2>Settings</h2>
        <span class="muted" id="settings-status"></span>
        <button type="button" class="btn" data-settings-back>← Back to guest list</button></div>
      <div class="settings">
        <nav class="settings-nav" aria-label="Settings sections">${SECTIONS.map((x) => `<button type="button" class="${x.key === section ? "on" : ""}" data-section="${x.key}">${x.label}</button>`).join("")}</nav>
        <section class="settings-body">${section === "couple" ? coupleHtml() : section === "design" ? designHtml() : ""}</section>
      </div>`;
  }

  // ---------- Editing ----------
  function withColor(key, value) {
    const cur = Theme.get();
    const next = { ...cur, colors: { ...cur.colors } };
    if (key === "accent") next.accent = value;
    else next.colors[key] = value;
    return next;
  }
  // Update the page after a color edit without rebuilding it (so a picker being dragged keeps focus).
  function refreshAfterColor(key) {
    const s = Theme.get(), r = Theme.resolve(s), t = Theme.THEMES[s.theme];
    const val = key === "accent" ? r.accent : r.colors[key];
    const def = key === "accent" ? t.accent : t.colors[key];
    const row = document.querySelector(`[data-row="${key}"]`);
    row.querySelector("[data-reset-one]").hidden = val === def;
    document.getElementById("settings-warn").innerHTML = warnHtml();
    const all = document.querySelector("[data-reset-colors]");
    if (all) all.disabled = !Theme.isCustom(s);
  }

  function wire() {
    const box = document.getElementById("settings-view");
    box.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("[data-settings-back]")) return setTab("main");
      const sec = t.closest("[data-section]");
      if (sec) return (section = sec.dataset.section), render();
      const th = t.closest("[data-theme]");
      if (th) {
        const had = Theme.isCustom(Theme.get());
        changed({ theme: th.dataset.theme, colors: {}, accent: null });
        render();
        if (had) toast(`Colors reset to ${Theme.THEMES[th.dataset.theme].name} defaults`);
        return;
      }
      if (t.closest("[data-reset-colors]")) {
        changed({ theme: Theme.get().theme, colors: {}, accent: null });
        return render();
      }
      const one = t.closest("[data-reset-one]");
      if (one) {
        const key = one.dataset.resetOne, th0 = Theme.THEMES[Theme.get().theme];
        changed(withColor(key, key === "accent" ? th0.accent : th0.colors[key]));
        return render();
      }
    });
    box.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.cname !== undefined) {
        couple[Number(el.dataset.cname)].name = el.value;
        document.getElementById("couple-line").innerHTML = coupleLine();
        persist();
      } else if (el.dataset.scolor) {
        const key = el.dataset.scolor;
        changed(withColor(key, el.value));
        box.querySelector(`[data-shex="${key}"]`).value = el.value.toLowerCase();
        box.querySelector(`[data-shex="${key}"]`).classList.remove("bad");
        refreshAfterColor(key);
      } else if (el.dataset.shex) {
        const key = el.dataset.shex;
        // Only act on a complete 6-digit code, so typing "#a8e..." doesn't flash through other colors.
        const h = /^#?[0-9a-f]{6}$/i.test(el.value.trim()) ? Theme.hex(el.value) : null;
        el.classList.toggle("bad", !h);
        if (!h) return;
        changed(withColor(key, h));
        box.querySelector(`[data-scolor="${key}"]`).value = h;
        refreshAfterColor(key);
      }
    });
    // Leaving the hex box: accept a short code like #fa0, otherwise put the real value back.
    box.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.crole !== undefined) {
        couple[Number(el.dataset.crole)].role = ROLES.includes(el.value) ? el.value : "";
        document.getElementById("couple-line").innerHTML = coupleLine();
        persist();
        return;
      }
      if (!el.dataset.shex) return;
      const key = el.dataset.shex, h = Theme.hex(el.value);
      if (h) {
        changed(withColor(key, h));
        box.querySelector(`[data-scolor="${key}"]`).value = h;
        refreshAfterColor(key);
      }
      const r = Theme.resolve(Theme.get());
      el.value = key === "accent" ? r.accent : r.colors[key];
      el.classList.remove("bad");
    });
  }

  return { render, wire, loadRemote, couple: () => couple.map((p) => ({ ...p })), coupleNames };
})();
