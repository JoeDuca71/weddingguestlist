"use strict";
// The Settings page. Sections: The Happy Couple (who's getting married), Fields (what we track about families
// and people) and Design (theme + status colors).
// More sections plug into SECTIONS.
// Uses helpers from app.js ($, esc, slug, toast, api, setTab) and the theme engine in theme.js.

window.Settings = (() => {
  const SECTIONS = [
    { key: "couple", label: "💍 The Happy Couple" },
    { key: "fields", label: "🧩 Fields" },
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
    Fields.setCouple(couple.map((p) => p.name));
    Theme.saveLocal(Theme.get());
    saveCoupleLocal();
    Fields.saveLocal();
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
      await api.saveSettings({ ...Theme.get(), couple, fields: Fields.getOverrides() });
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
        if (data.fields) {
          Fields.setOverrides(data.fields);
          Fields.saveLocal();
        }
        if (data.couple) {
          couple = cleanCouple(data.couple);
          saveCoupleLocal();
          Fields.setCouple(couple.map((p) => p.name));
        }
      }
    } catch {
      remoteOk = false;
    }
  }

  // ---------- Rendering ----------
  const examplePills = (examples, key) => examples.map((e) => `<span class="pill c-${key}">${esc(e)}</span>`).join(" ");

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
    const where = [["family", "invite_status"], ["person", "rsvp"], ["family", "hotel_status"], ["person", "afterparty"]];
    const row = (name, inv, rsvp, hotel, ap) =>
      `<tr><td data-label="Family"><strong>${esc(name)}</strong></td>${[inv, rsvp, hotel, ap]
        .map((v, i) => `<td data-label="${["Invite status", "RSVP", "Hotel", "After-party"][i]}"><span class="pill c-${Fields.colorOf(where[i][0], where[i][1], v)}">${esc(v)}</span></td>`)
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
        ${Theme.STATES.map((st) => colorRowHtml(st.key, st.label, st.note, r.colors[st.key], r.colors[st.key] === t.colors[st.key], examplePills(st.examples, st.key))).join("")}
        ${colorRowHtml("accent", "Accent", "Buttons, links, selected tabs and the header stripe", r.accent, r.accent === t.accent, `<span class="btn primary small" aria-hidden="true">Button</span>`)}
      </div>
      <div id="settings-warn">${warnHtml()}</div>

      <h3>Preview</h3>
      ${previewHtml()}`;
  }


  // ---------- Fields ----------
  // Family fields vs People fields. Each field can be switched off, renamed, given a type, moved to another
  // section, and (for drop downs, checkboxes and multi-selects) given a list of values with a color each.
  let fieldScope = "family";
  const openFields = new Set();
  const COLOR_NAMES = Object.fromEntries(Fields.COLORS);

  function rowsUsing(scope, key, v) {
    const rows = scope === "family" ? state.families : state.people;
    return rows.filter((r) => String(r[key] ?? "").split(",").map((x) => x.trim()).includes(v)).length;
  }

  // Change the saved overrides for one field, then re-apply everywhere.
  function editField(scope, key, fn, { rerender } = {}) {
    const o = Fields.getOverrides();
    const f = ((o[scope].fields ||= {})[key] ||= {});
    fn(f, o[scope]);
    Fields.setOverrides(o);
    persist();
    if (rerender) render();
  }
  // Make sure the values list is stored in full before editing it.
  const ensureValues = (f, scope, key) => (f.values ||= Fields.get(scope, key).values.map((x) => ({ v: x.raw ?? x.v, color: x.color })));

  function valueRowHtml(scope, fld, v, i) {
    const locked = fld.locked.includes(v.v);
    return `<div class="val-row" data-vrow="${i}">
      <input type="text" class="val-name" data-vname="${i}" data-orig="${esc(v.v)}" value="${esc(v.raw ?? v.v)}" maxlength="60" ${locked ? `readonly title="The app's automatic rules use this value, so it can't be renamed or removed"` : ""} aria-label="Value ${i + 1}">
      <select data-vcolor="${i}" aria-label="Color for ${esc(v.v)}">${Fields.COLORS.map(([k, name]) => `<option value="${k}" ${k === v.color ? "selected" : ""}>${esc(name)}</option>`).join("")}</select>
      <span class="pill c-${v.color}" data-vpill="${i}">${esc(v.v || "…")}</span>
      ${locked ? `<span class="lock" title="Used by the app's automatic rules">🔒</span>` : fld.type === "checkbox" ? "" : `<button type="button" class="linkish danger-link" data-vdel="${i}" aria-label="Remove ${esc(v.v)}">Remove</button>`}
    </div>`;
  }

  function valsHtml(scope, fld) {
    if (!Fields.hasValues(fld.type)) return "";
    return `<div class="vals"><h5>${fld.type === "checkbox" ? "Checkbox values (ticked / unticked)" : "Values"}</h5>
      ${fld.values.map((v, i) => valueRowHtml(scope, fld, v, i)).join("")}
      ${fld.type === "checkbox" ? "" : `<button type="button" class="btn small" data-vadd>+ Add value</button>`}
      ${fld.type === "dropdown" ? `<label class="inline">Starts as <select data-fdefault>${fld.nullable ? `<option value="" ${fld.default == null ? "selected" : ""}>—</option>` : ""}${fld.values.map((v) => `<option ${v.v === fld.default ? "selected" : ""}>${esc(v.v)}</option>`).join("")}</select></label>` : ""}
    </div>`;
  }
  // Redraw just the values list of one card (so the card stays open and nothing else moves).
  function refreshVals(card, scope, key) {
    const old = card.querySelector(".vals");
    if (!old) return;
    old.insertAdjacentHTML("afterend", valsHtml(scope, Fields.get(scope, key)));
    old.remove();
  }

  function fieldCardHtml(scope, fld, secs) {
    const key = fld.key, open = openFields.has(scope + ":" + key);
    const base = Fields.defaultOf(scope, key);
    const types = base.allowed.map((t) => [t, Fields.TYPES[t]]);
    const vals = valsHtml(scope, fld);
    const rollSec = fld.rollup
      ? `<label class="inline">Shown on the family form under <select data-froll>${Fields.sections("family").map((s) => `<option value="${s.id}" ${s.id === fld.rollSection ? "selected" : ""}>${esc(s.name || "(no title)")}</option>`).join("")}</select></label>`
      : "";
    return `<details class="fcard ${fld.enabled ? "" : "off"}" data-fkey="${key}" ${open ? "open" : ""}>
      <summary>
        <label class="fon" title="${fld.noDisable ? "This field is required" : "Show or hide this field everywhere"}"><input type="checkbox" class="check" data-fenable ${fld.enabled ? "checked" : ""} ${fld.noDisable ? "disabled" : ""}> <span class="sr">Enabled</span></label>
        <strong class="fname">${esc(fld.label)}</strong>
        <span class="muted ftype">${esc(Fields.TYPES[fld.type])}${fld.enabled ? "" : " · off"}</span>
      </summary>
      <div class="fbody">
        <div class="form-grid">
          <label class="field"><span>Field name</span><input type="text" data-flabel value="${esc(fld.label)}" maxlength="60"></label>
          <label class="field"><span>Field type</span><select data-ftype ${types.length < 2 ? "disabled" : ""}>${types.map(([t, n]) => `<option value="${t}" ${t === fld.type ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="field"><span>Section</span><select data-fsection>${secs.map((s) => `<option value="${s.id}" ${s.id === fld.section ? "selected" : ""}>${esc(s.name || "(no title)")}</option>`).join("")}</select></label>
        </div>
        ${base.hint ? `<small class="hint">${esc(base.hint)}</small>` : ""}
        ${rollSec}
        ${vals}
        <button type="button" class="linkish" data-freset ${fld.customized ? "" : "hidden"}>Reset this field to its defaults</button>
      </div>
    </details>`;
  }

  function fieldsHtml() {
    const secs = Fields.sections(fieldScope), list = Fields.list(fieldScope);
    // People fields that also show on the family form (one change sets everyone) are listed under People fields.
    const rolled = (id) => {
      const names = fieldScope === "family" ? Fields.list("person").filter((f) => f.rollup && f.enabled && f.rollSection === id).map((f) => f.label) : [];
      return names.length ? `<p class="muted rolled">Also shown here from People fields: ${names.map(esc).join(", ")}</p>` : "";
    };
    const body = secs
      .map((sec) => {
        const mine = list.filter((f) => f.section === sec.id);
        return `<div class="fsec" data-sec="${sec.id}">
          <div class="fsec-head"><input type="text" class="sec-name" data-secname value="${esc(sec.name)}" placeholder="(no title)" maxlength="60" aria-label="Section name"></div>
          ${mine.map((f) => fieldCardHtml(fieldScope, f, secs)).join("")}
          ${rolled(sec.id)}
          ${!mine.length && !rolled(sec.id) ? `<p class="muted pad">No fields in this section. Move one here from another section.</p>` : ""}
        </div>`;
      })
      .join("");
    return `
      <h3>Fields</h3>
      <p class="muted">What you keep track of. Turn fields off, rename them, change their type, and set the values and colors a drop down offers. Changes apply to everyone right away.</p>
      <div class="vbtns" role="tablist">
        <button type="button" class="vbtn ${fieldScope === "family" ? "on" : ""}" data-fscope="family">Family fields</button>
        <button type="button" class="vbtn ${fieldScope === "person" ? "on" : ""}" data-fscope="person">People fields</button>
      </div>
      <p class="muted">${fieldScope === "family" ? "Things we track once per family or household." : "Things we track for each person. Some also show on the family, where one change sets everyone."}</p>
      ${body}
      <p><button type="button" class="linkish" data-freset-all>Reset all ${fieldScope === "family" ? "family" : "people"} fields to the defaults</button></p>
      <p class="muted">Renaming a value in use offers to update the people or families that have it. Switching a field off hides it but keeps its data.</p>`;
  }

  function wireFields(box) {
    box.addEventListener("click", async (e) => {
      const t = e.target;
      const on = t.closest(".fon");
      if (on) {
        // Ticking "enabled" shouldn't fold or unfold the card.
        const d = on.closest("details"), was = d.open;
        setTimeout(() => (d.open = was));
        return;
      }
      const sc = t.closest("[data-fscope]");
      if (sc) return (fieldScope = sc.dataset.fscope), render();
      if (t.closest("[data-freset-all]")) {
        if (!confirm("Reset every field in this list to the defaults? Your names, types, values and colors are replaced. Data in the guest list is not touched.")) return;
        const o = Fields.getOverrides();
        o[fieldScope] = {};
        Fields.setOverrides(o);
        persist();
        return render();
      }
      const card = t.closest(".fcard");
      if (!card) return;
      const key = card.dataset.fkey;
      if (t.closest("[data-freset]")) {
        editField(fieldScope, key, (f, s) => {
          if (s.fields) delete s.fields[key];
        }, { rerender: true });
        return;
      }
      if (t.closest("[data-vadd]")) {
        editField(fieldScope, key, (f) => {
          const vals = ensureValues(f, fieldScope, key);
          let n = vals.length + 1, name = "New value";
          while (vals.some((v) => v.v === name)) name = "New value " + n++;
          vals.push({ v: name, color: "none" });
        });
        refreshVals(card, fieldScope, key);
        card.querySelector(".vals [data-vrow]:last-of-type .val-name")?.select();
        return;
      }
      const del = t.closest("[data-vdel]");
      if (del) {
        const i = Number(del.dataset.vdel), name = Fields.get(fieldScope, key).values[i]?.v;
        const used = rowsUsing(fieldScope, key, name);
        if (used && !confirm(`${used} ${fieldScope === "family" ? "families" : "people"} currently have "${name}". They keep that text, but it won't be one of the choices. Remove it anyway?`)) return;
        editField(fieldScope, key, (f) => {
          ensureValues(f, fieldScope, key).splice(i, 1);
        });
        refreshVals(card, fieldScope, key);
      }
    });
    box.addEventListener("input", (e) => {
      const el = e.target, card = el.closest(".fcard");
      if (el.dataset.secname !== undefined) {
        const id = el.closest(".fsec").dataset.sec;
        const o = Fields.getOverrides();
        (o[fieldScope].sections ||= {})[id] = el.value;
        Fields.setOverrides(o);
        return persist();
      }
      if (!card) return;
      const key = card.dataset.fkey;
      if (el.dataset.flabel !== undefined) {
        editField(fieldScope, key, (f) => {
          f.label = el.value;
        });
        card.querySelector(".fname").textContent = el.value.trim() || Fields.defaultOf(fieldScope, key).label;
      } else if (el.dataset.vname !== undefined && !el.readOnly) {
        // Only the sample pill follows the typing; the new name is saved when the box is left.
        const p = card.querySelector(`[data-vpill="${el.dataset.vname}"]`);
        if (p) p.textContent = Fields.expand(el.value) || "…";
      }
    });
    box.addEventListener("change", async (e) => {
      const el = e.target, card = el.closest(".fcard");
      if (el.dataset.secname !== undefined) return render();
      if (!card) return;
      const key = card.dataset.fkey, scope = fieldScope;
      if (el.dataset.fenable !== undefined) {
        editField(scope, key, (f) => (f.enabled = el.checked));
        card.classList.toggle("off", !el.checked);
        card.querySelector(".ftype").textContent = Fields.TYPES[Fields.get(scope, key).type] + (el.checked ? "" : " · off");
      } else if (el.dataset.flabel !== undefined) {
        if (!el.value.trim()) editField(scope, key, (f) => delete f.label, { rerender: true });
      } else if (el.dataset.ftype !== undefined) {
        editField(scope, key, (f) => {
          f.type = el.value;
          delete f.values;
        }, { rerender: true });
      } else if (el.dataset.fsection !== undefined) {
        editField(scope, key, (f) => (f.section = el.value), { rerender: true });
      } else if (el.dataset.froll !== undefined) {
        editField(scope, key, (f) => (f.rollSection = el.value));
      } else if (el.dataset.fdefault !== undefined) {
        editField(scope, key, (f) => (f.default = el.value === "" ? null : el.value));
      } else if (el.dataset.vcolor !== undefined) {
        const i = Number(el.dataset.vcolor);
        editField(scope, key, (f) => (ensureValues(f, scope, key)[i].color = el.value));
        const p = card.querySelector(`[data-vpill="${i}"]`);
        if (p) p.className = "pill c-" + el.value;
      } else if (el.dataset.vname !== undefined && !el.readOnly) {
        // Finished renaming a value: offer to update the rows that use the old name.
        const i = Number(el.dataset.vname), old = el.dataset.orig, raw = Fields.valueName(el.value), now = Fields.expand(raw);
        el.value = raw;
        if (!raw) return refreshVals(card, scope, key);
        if (Fields.get(scope, key).values.some((v, j) => j !== i && v.v.toLowerCase() === now.toLowerCase())) {
          toast(`There is already a value called "${now}"`, true);
          return refreshVals(card, scope, key);
        }
        if (now !== old) {
          const used = rowsUsing(scope, key, old);
          if (used && confirm(`${used} ${scope === "family" ? "families" : "people"} use "${old}". Change them to "${now}" too?`)) {
            try {
              await window.AppHooks.renameValue(scope, key, old, now);
            } catch (err) {
              toast("Couldn't update the guest list: " + err.message, true);
            }
          }
        }
        editField(scope, key, (f) => {
          const vals = ensureValues(f, scope, key);
          if (vals[i]) vals[i].v = raw;
          if (now !== old && (f.default === old || Fields.get(scope, key).default === old)) f.default = now;
        });
        refreshVals(card, scope, key);
      }
    });
  }

  function render() {
    const box = document.getElementById("settings-view");
    // Keep the field cards that are open, open.
    box.querySelectorAll(".fcard").forEach((c) => (c.open ? openFields.add(fieldScope + ":" + c.dataset.fkey) : openFields.delete(fieldScope + ":" + c.dataset.fkey)));
    box.innerHTML = `
      <div class="settings-head"><h2>Settings</h2>
        <span class="muted" id="settings-status"></span>
        <button type="button" class="btn" data-settings-back>← Back to guest list</button></div>
      <div class="settings">
        <nav class="settings-nav" aria-label="Settings sections">${SECTIONS.map((x) => `<button type="button" class="${x.key === section ? "on" : ""}" data-section="${x.key}">${x.label}</button>`).join("")}</nav>
        <section class="settings-body">${section === "couple" ? coupleHtml() : section === "fields" ? fieldsHtml() : section === "design" ? designHtml() : ""}</section>
      </div>`;
    box.querySelectorAll(".fcard").forEach((c) => (c.open = openFields.has(fieldScope + ":" + c.dataset.fkey)));
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
    wireFields(box);
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
