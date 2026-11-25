"use strict";
// The Settings page. Sections: The Happy Couple (who's getting married), Fields (what we track about families
// and people) and Design (theme + status colors).
// More sections plug into SECTIONS.
// Uses helpers from app.js ($, esc, slug, toast, api, setTab) and the theme engine in theme.js.

window.Settings = (() => {
  const SECTIONS = [
    { key: "couple", label: "💍 The Happy Couple" },
    { key: "design", label: "🎨 Design" },
    { key: "stats", label: "📊 Stats" },
    { key: "fields", label: "🧩 Fields" },
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

  // ---------- Stats ----------
  // Which of the cards above the guest list are shown. Stored as the ones that are hidden, so a new event shows by default.
  const STATS_KEY = "wedding-guests:stats";
  const cleanStats = (st) => ({ hidden: [...new Set((Array.isArray(st?.hidden) ? st.hidden : []).map(String).filter((x) => /^(rsvp|hotel|ev:[a-z0-9_]+)$/.test(x)))] });
  let stats = cleanStats(null);
  try {
    stats = cleanStats(JSON.parse(localStorage.getItem(STATS_KEY)));
  } catch {}
  const statList = () => [
    { id: "rsvp", name: "Wedding RSVPs", note: "Yes, TBD, No and Maybe for the wedding" },
    { id: "hotel", name: "Host Hotel RSVPs", note: "Families who are yes or maybe for the host hotel" },
    ...Fields.events().filter((e) => e.enabled).map((e) => ({ id: "ev:" + e.id, name: e.name, note: "RSVPs for this related event" })),
  ];
  function statsHtml() {
    return `
      <h3>Stats</h3>
      <p class="muted">Choose which stats show above the guest list. Each related event that is switched on gets its own stat, in the same order as under Fields &gt; Related events.</p>
      <div class="stat-picks">${statList().map((x) => `<label class="stat-pick"><input type="checkbox" class="check" data-statpick="${esc(x.id)}" ${stats.hidden.includes(x.id) ? "" : "checked"}> <span><strong>${esc(x.name)}</strong><small class="muted">${esc(x.note)}</small></span></label>`).join("")}</div>`;
  }

  // ---------- Saving ----------
  // The look is applied and kept on this device at once; it is also saved to the database so every
  // person using this guest list (and every device) sees the same thing.
  function persist() {
    Fields.setCouple(couple.map((p) => p.name));
    Theme.saveLocal(Theme.get());
    saveCoupleLocal();
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}
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
      await api.saveSettings({ ...Theme.get(), couple, stats, fields: Fields.getOverrides() });
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
        if (data.stats) {
          stats = cleanStats(data.stats);
          window.AppHooks?.refreshStats?.();
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
  const examplePills = (examples, key) => `<span class="muted ex-label">examples:</span> ` + examples.map((e) => `<span class="pill c-${key}">${esc(e)}</span>`).join(" ");

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
      <h3>The Happy Couple<span class="couple-line" id="couple-line">${coupleLine()}</span></h3>
      <p class="muted">Who is getting married. Two brides, two grooms, or one of each: pick a role for each person.</p>
      <div class="partners">${card(0)}${card(1)}</div>`;
  }
  function coupleLine() {
    const n = coupleNames();
    const roles = couple.every((p) => p.name.trim() && p.role) ? couple.map((p) => p.role).join(" & ") : "";
    return n ? `: ${esc(n)}${roles ? ` · ${esc(roles)}` : ""}` : "";
  }

  function designHtml() {
    const s = Theme.get(), r = Theme.resolve(s), t = Theme.THEMES[s.theme];
    return `
      <h3>Theme</h3>
      <p class="muted">A theme sets the background pattern, header, heading font, accent and the four status colors. You can fine-tune any color afterwards.</p>
      <div class="theme-grid">${Theme.THEME_ORDER.map((id) => themeCardHtml(id, id === s.theme)).join("")}</div>

      <div class="settings-row-head"><h3>Status colors</h3>
        <button type="button" class="btn small" data-reset-colors ${Theme.isCustom(s) ? "" : "disabled"}>Reset to ${esc(t.name)} defaults</button></div>
      <p class="muted">These first four colors show up on every status pill and highlight in the guest list. Pick any color; the soft background and readable text are worked out for you.</p>
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
  const scopeNow = () => (fieldScope === "events" ? "person" : fieldScope);
  const COLOR_NAMES = Object.fromEntries(Fields.COLORS);
  const MAX = 50; // longest name we accept for a field, section, event or value

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

  // Values of a "partner" field (Affiliation) are stored as "{p1} Friend": the partner is chosen from a drop down on the left.
  const splitPartner = (raw) => {
    const m = /^\{p([12])\}\s*(.*)$/.exec(String(raw ?? ""));
    return m ? [m[1], m[2]] : ["", String(raw ?? "")];
  };
  const partnerOptions = (pn) => `<option value="" ${pn ? "" : "selected"}>—</option>` + [1, 2].map((n) => `<option value="${n}" ${String(n) === pn ? "selected" : ""}>${esc(Fields.expand(`{p${n}}`))}</option>`).join("");
  const colorOptions = (cur) => Fields.COLORS.map(([k, name]) => `<option value="${k}" class="c-${k}" ${k === cur ? "selected" : ""}>${esc(name)}</option>`).join("");

  function valueRowHtml(scope, fld, v, i) {
    const locked = fld.locked.includes(v.v);
    const [pn, rest] = fld.partner ? splitPartner(v.raw ?? v.v) : ["", v.raw ?? v.v];
    return `<div class="val-row ${fld.partner ? "has-partner" : ""}" data-vrow="${i}">
      ${fld.type === "checkbox" ? `<span></span>` : `<span class="drag" draggable="true" data-vdrag title="Drag to reorder" aria-hidden="true">⠿</span>`}
      ${fld.partner ? `<select data-vpartner aria-label="Partner for value ${i + 1}" ${locked ? "disabled" : ""}>${partnerOptions(pn)}</select>` : ""}
      <input type="text" class="val-name" data-vname="${i}" data-orig="${esc(v.v)}" value="${esc(rest)}" maxlength="${MAX}" ${locked ? `readonly title="The app's automatic rules use this value, so it can't be renamed or removed"` : ""} aria-label="Value ${i + 1}">
      <select class="csel c-${v.color}" data-vcolor="${i}" aria-label="Color for ${esc(v.v)}">${colorOptions(v.color)}</select>
      <span class="pill c-${v.color}" data-vpill="${i}">${esc(v.v || "…")}</span>
      ${locked ? `<span class="lock" title="Used by the app's automatic rules">🔒</span>` : fld.type === "checkbox" ? "" : `<button type="button" class="linkish danger-link" data-vdel="${i}" aria-label="Remove ${esc(v.v)}">Remove</button>`}
    </div>`;
  }

  function valsHtml(scope, fld) {
    if (!Fields.hasValues(fld.type)) return "";
    return `<div class="vals"><h5>${fld.type === "checkbox" ? "Checkbox values (ticked / unticked)" : "Values"}</h5>
      ${fld.values.map((v, i) => valueRowHtml(scope, fld, v, i)).join("")}
      ${fld.type === "checkbox" ? "" : `<button type="button" class="btn small" data-vadd>+ Add value</button>`}
      ${fld.type === "dropdown" ? `<label class="inline">New guest's default value <select data-fdefault>${fld.nullable ? `<option value="" ${fld.default == null ? "selected" : ""}>—</option>` : ""}${fld.values.map((v) => `<option ${v.v === fld.default ? "selected" : ""}>${esc(v.v)}</option>`).join("")}</select></label>` : ""}
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
    const rollSec = fld.rollup && !fld.event
      ? `<label class="inline">Shown on the family form under <select data-froll>${Fields.sections("family").map((s) => `<option value="${s.id}" ${s.id === fld.rollSection ? "selected" : ""}>${esc(s.name || "(no title)")}</option>`).join("")}</select></label>`
      : "";
    const customRoll = fld.custom && scope === "person"
      ? `<label class="inline">Also show on the family form <select data-fcroll><option value="" ${fld.rollSection ? "" : "selected"}>Not on the family form</option>${Fields.sections("family").map((x) => `<option value="${x.id}" ${x.id === fld.rollSection ? "selected" : ""}>Under ${esc(x.name || "(no title)")}</option>`).join("")}</select></label><small class="hint">On the family form, changing this field sets it for all people in the family. If people have different selections, then it shows "Multiple" on the Family page.</small>`
      : "";
    return `<details class="fcard ${fld.enabled ? "" : "off"}" data-fkey="${key}" ${open ? "open" : ""}>
      <summary>
        ${secs.length ? `<span class="drag" draggable="true" data-fdrag title="Drag to reorder" aria-hidden="true">⠿</span>` : ""}
        <label class="fon" title="${fld.noDisable || fld.isRsvp ? "This field is always on while it is needed" : "Show or hide this field everywhere"}"><input type="checkbox" class="check" data-fenable ${fld.own ? "checked" : ""} ${fld.noDisable || fld.isRsvp ? "disabled" : ""}> <span class="sr">Enabled</span></label>
        <strong class="fname">${esc(fld.label)}</strong>
        <span class="muted ftype">${esc(Fields.TYPES[fld.type])}${fld.enabled ? "" : " · off"}</span>
      </summary>
      <div class="fbody">
        <div class="form-grid">
          <label class="field"><span>Field name</span><input type="text" data-flabel value="${esc(fld.label)}" maxlength="${MAX}" ${fld.isRsvp ? 'disabled title="Named after the event"' : ""}></label>
          <label class="field"><span>Field type</span><select data-ftype ${types.length < 2 ? "disabled" : ""}>${types.map(([t, n]) => `<option value="${t}" ${t === fld.type ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          ${fld.event ? "" : `<label class="field"><span>Section</span><select data-fsection>${secs.map((s) => `<option value="${s.id}" ${s.id === fld.section ? "selected" : ""}>${esc(s.name || "(no title)")}</option>`).join("")}</select></label>`}
        </div>
        ${base.hint ? `<small class="hint">${esc(base.hint)}</small>` : ""}
        ${rollSec}
        ${customRoll}
        ${vals}
        <button type="button" class="linkish" data-freset ${fld.customized ? "" : "hidden"}>Reset this field to its defaults</button>
        ${fld.added ? `<button type="button" class="linkish danger-link" data-fdel>Remove this field</button>` : ""}
      </div>
    </details>`;
  }

  // A read-only card for a field that is managed somewhere else (shown so the list is complete).
  function lockedCardHtml(scope, f, tag, bodyHtml) {
    const open = openFields.has(scope + ":auto:" + f.key);
    return `<details class="fcard auto" data-fkey="auto:${f.key}" data-auto ${open ? "open" : ""}>
      <summary>
        <label class="fon" title="Managed elsewhere"><input type="checkbox" class="check" checked disabled> <span class="sr">Enabled</span></label>
        <strong class="fname">${esc(f.label)}</strong>
        <span class="muted ftype">${tag}</span>
      </summary>
      <div class="fbody"><p class="muted">${bodyHtml}</p></div>
    </details>`;
  }
  // A People field that is also shown on the family form: listed on the Family tab, but managed under People fields.
  function autoCardHtml(f) {
    const sec = Fields.sections("person").find((x) => x.id === f.section);
    const where = sec && sec.name ? ` (in the ‘${esc(sec.name)}’ section)` : "";
    return lockedCardHtml("family", f, "Auto", `This field is auto-generated from the People Field ‘${esc(f.label)}’${where}.`);
  }
  // On the People tab: the related events' fields, managed on the Related events tab.
  function eventsSectionHtml() {
    const evs = Fields.events().filter((e) => e.enabled);
    if (!evs.length) return "";
    const cards = evs.flatMap((e) => [e.rsvp, ...e.fields.filter((f) => f.key !== e.rsvpKey)]).filter(Boolean)
      .map((f) => lockedCardHtml("person", f, "Event", `You can set up this field on the <button type="button" class="linkish" data-fscope="events">Related events</button> tab.`));
    return `<div class="fsec" data-sec="ev-all"><div class="fsec-head"><span class="sec-static">Related Events</span><span class="sec-word">Section</span></div>${cards.join("")}</div>`;
  }

  // ---------- Related events ----------
  function editEvents(fn, { rerender = true } = {}) {
    const o = Fields.getOverrides();
    o.events ||= { items: {}, custom: [] };
    o.events.items ||= {};
    o.events.custom ||= [];
    fn(o.events);
    Fields.setOverrides(o);
    persist();
    if (rerender) render();
  }
  function eventCardHtml(ev) {
    const open = openFields.has("ev:" + ev.id);
    const cards = [ev.rsvp, ...ev.fields.filter((f) => f.key !== ev.rsvpKey)].filter(Boolean).map((f) => fieldCardHtml("person", f, []));
    return `<details class="fcard evcard ${ev.enabled ? "" : "off"}" data-ev="${ev.id}" ${open ? "open" : ""}>
      <summary>
        <label class="fon" title="Turn this event on or off"><input type="checkbox" class="check" data-evenable ${ev.enabled ? "checked" : ""}> <span class="sr">Enabled</span></label>
        <strong class="fname">${esc(ev.name)}</strong>
        <span class="muted ftype">${ev.enabled ? `${ev.fields.length} field${ev.fields.length === 1 ? "" : "s"}` : "off"}</span>
      </summary>
      <div class="fbody">
        <label class="field"><span>Event name</span><input type="text" data-evname value="${esc(ev.name)}" maxlength="${MAX}"></label>
        <p class="muted">Turning an event on adds its RSVP to every person and to the family form (under Related Events). Add any other fields you want to track for it.</p>
        <div class="evfields">${cards.join("")}</div>
        <div class="evactions"><button type="button" class="btn small" data-evaddfield>+ Add field to ${esc(ev.name)}</button>
        ${ev.custom ? `<button type="button" class="linkish danger-link" data-evdel>Remove this event</button>` : ""}</div>
      </div>
    </details>`;
  }
  function eventsHtml() {
    return `
      <p class="muted">Events that go with the wedding but aren't the wedding itself. Turn on the ones you are having, add your own, and give any of them extra fields.</p>
      ${Fields.events().map(eventCardHtml).join("")}
      <p><button type="button" class="btn" data-evadd>+ Add an event</button></p>
      <p><button type="button" class="linkish" data-freset-all>Reset all events to the defaults</button></p>`;
  }

  const sectionHead = (sec, withAdd) => `<div class="fsec-head">
      <span class="sec-title"><span class="sec-sizer" aria-hidden="true">${esc(sec.name) || "(no title)"}</span><input type="text" class="sec-name" data-secname value="${esc(sec.name)}" placeholder="(no title)" maxlength="${MAX}" aria-label="Section name"></span><span class="sec-word">Section</span>
      ${withAdd ? `<button type="button" class="btn small ghost" data-secadd>+ Add Field</button>` : ""}
    </div>`;

  function fieldsHtml() {
    const secs = Fields.sections(scopeNow()).filter((x) => !x.event), list = Fields.list(scopeNow()).filter((f) => !f.event);
    // People fields that also show on the family form (one change sets everyone) get a read-only card there.
    const autos = (id) => (fieldScope === "family" ? Fields.list("person").filter((f) => f.rollup && f.enabled && f.rollSection === id) : []);
    const body = secs
      .map((sec) => {
        const mine = list.filter((f) => f.section === sec.id), auto = autos(sec.id);
        return `<div class="fsec" data-sec="${sec.id}">
          ${sectionHead(sec, true)}
          ${mine.map((f) => fieldCardHtml(scopeNow(), f, secs)).join("")}
          ${auto.map(autoCardHtml).join("")}
          ${!mine.length && !auto.length ? `<p class="muted pad">No fields in this section. Use Add Field, or move one here from another section.</p>` : ""}
        </div>${fieldScope === "person" && sec.id === "p_wedding" ? eventsSectionHtml() : ""}`;
      })
      .join("");
    const tab = (k, name) => `<button type="button" class="tab ${fieldScope === k ? "on" : ""}" role="tab" aria-selected="${fieldScope === k}" data-fscope="${k}">${name}</button>`;
    return `
      <h3>Fields</h3>
      <p class="muted">Fields are the guest data you keep track of. Turn fields on/off, rename them, change their type, and set the values and colors. Changes apply to everyone right away. Renaming a value in use prompts to update the people or families that have it. Disabling a field hides it but keeps its data.</p>
      <div class="ftabs" role="tablist">${tab("family", "Family fields")}${tab("person", "People fields")}${tab("events", "Related events")}</div>
      <p class="muted">${fieldScope === "family" ? "Things we track once per family or household." : fieldScope === "person" ? "Things we track for each person. Some also show on the family, where one change sets everyone. Related events have their own tab." : ""}</p>
      ${fieldScope === "events" ? eventsHtml() : body}
      ${fieldScope === "events" ? "" : `<p><button type="button" class="linkish" data-freset-all>Reset all ${fieldScope === "family" ? "family" : "people"} fields to the defaults</button></p>`}`;
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
        const evKeys = Fields.events().flatMap((e) => [e.rsvpKey, ...e.builtinFields, ...e.added]);
        const evOv = Object.fromEntries(Object.entries(o.person.fields || {}).filter(([k]) => evKeys.includes(k)));
        if (fieldScope === "events") {
          o.events = { items: {}, custom: [] };
          o.person = { ...o.person, fields: Object.fromEntries(Object.entries(o.person.fields || {}).filter(([k]) => !evKeys.includes(k))) };
        } else o[scopeNow()] = fieldScope === "person" ? { fields: evOv } : {};
        Fields.setOverrides(o);
        persist();
        return render();
      }
      if (t.closest("[data-evadd]")) {
        const id = Fields.makeId("e_");
        openFields.add("ev:" + id);
        return editEvents((ev) => {
          ev.custom.push(id);
          ev.items[id] = { name: "New event" };
        });
      }
      const secAdd = t.closest("[data-secadd]");
      if (secAdd) {
        const scope = scopeNow(), section = secAdd.closest(".fsec").dataset.sec, key = Fields.makeId("x_");
        openFields.add(scope + ":" + key);
        const o = Fields.getOverrides();
        (o[scope].custom ||= []).push({ key, label: "New field", section });
        Fields.setOverrides(o);
        persist();
        return render();
      }
      const evCard = t.closest(".evcard");
      if (evCard && !t.closest(".fcard:not(.evcard)")) {
        const id = evCard.dataset.ev;
        if (t.closest("[data-evaddfield]")) {
          openFields.add("ev:" + id);
          return editEvents((ev) => ((ev.items[id] ||= {}).added ||= []).push({ key: Fields.makeId("x_"), label: "New field" }));
        }
        if (t.closest("[data-evdel]")) {
          if (!confirm("Remove this event? Its answers stay in the database but are hidden.")) return;
          return editEvents((ev) => {
            ev.custom = ev.custom.filter((x) => x !== id);
            delete ev.items[id];
          });
        }
      }
      const card = t.closest(".fcard:not(.evcard)");
      if (!card) return;
      if (card.dataset.auto !== undefined) return;
      const key = card.dataset.fkey;
      if (t.closest("[data-fdel]")) {
        if (!confirm("Remove this field? Its answers stay in the database but are hidden.")) return;
        const evCard2 = card.closest(".evcard");
        if (!evCard2) {
          const o = Fields.getOverrides();
          o[scopeNow()].custom = (o[scopeNow()].custom || []).filter((c) => c.key !== key);
          Fields.setOverrides(o);
          persist();
          return render();
        }
        const evId = evCard2.dataset.ev;
        return editEvents((ev) => {
          ev.items[evId].added = (ev.items[evId].added || []).filter((a) => a.key !== key);
        });
      }
      if (t.closest("[data-freset]")) {
        editField(scopeNow(), key, (f, s) => {
          if (s.fields) delete s.fields[key];
        }, { rerender: true });
        return;
      }
      if (t.closest("[data-vadd]")) {
        editField(scopeNow(), key, (f) => {
          const vals = ensureValues(f, scopeNow(), key);
          let n = vals.length + 1, name = "New value";
          while (vals.some((v) => v.v === name)) name = "New value " + n++;
          vals.push({ v: name, color: "none" });
        });
        refreshVals(card, scopeNow(), key);
        card.querySelector(".vals [data-vrow]:last-of-type .val-name")?.select();
        return;
      }
      const del = t.closest("[data-vdel]");
      if (del) {
        const i = Number(del.dataset.vdel), name = Fields.get(scopeNow(), key).values[i]?.v;
        const used = rowsUsing(scopeNow(), key, name);
        if (used && !confirm(`${used} ${scopeNow() === "family" ? "families" : "people"} currently have "${name}". They keep that text, but it won't be one of the choices. Remove it anyway?`)) return;
        editField(scopeNow(), key, (f) => {
          ensureValues(f, scopeNow(), key).splice(i, 1);
        });
        refreshVals(card, scopeNow(), key);
      }
    });
    // Drag and drop: reorder fields within a section, and values within a field.
    let drag = null;
    const clearMarks = () => box.querySelectorAll(".drop-before,.drop-after,.dragging").forEach((x) => x.classList.remove("drop-before", "drop-after", "dragging"));
    const after = (e, el) => { const r = el.getBoundingClientRect(); return e.clientY > r.top + r.height / 2; };
    box.addEventListener("dragstart", (e) => {
      const fh = e.target.closest?.("[data-fdrag]"), vh = e.target.closest?.("[data-vdrag]");
      if (!fh && !vh) return;
      const card = (fh || vh).closest(".fcard"), item = fh ? card : vh.closest("[data-vrow]");
      drag = fh ? { type: "field", key: card.dataset.fkey, sec: card.closest(".fsec").dataset.sec } : { type: "val", i: Number(item.dataset.vrow), key: card.dataset.fkey };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "reorder");
      e.dataTransfer.setDragImage(item, 12, 12);
      item.classList.add("dragging");
    });
    box.addEventListener("dragover", (e) => {
      if (!drag) return;
      const tgt = drag.type === "field" ? e.target.closest(".fcard:not(.evcard)") : e.target.closest("[data-vrow]");
      const ok = tgt && (drag.type === "field" ? tgt.closest(".fsec")?.dataset.sec === drag.sec && tgt.dataset.fkey !== drag.key && !tgt.dataset.auto : tgt.closest(".fcard")?.dataset.fkey === drag.key);
      if (!ok) return;
      e.preventDefault();
      box.querySelectorAll(".drop-before,.drop-after").forEach((x) => x.classList.remove("drop-before", "drop-after"));
      tgt.classList.add(after(e, tgt) ? "drop-after" : "drop-before");
    });
    box.addEventListener("drop", (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      const scope = scopeNow();
      if (d.type === "field") {
        const tgt = e.target.closest(".fcard:not(.evcard)");
        if (!tgt || tgt.dataset.fkey === d.key || tgt.dataset.auto !== undefined || tgt.closest(".fsec")?.dataset.sec !== d.sec) return clearMarks();
        e.preventDefault();
        const flag = after(e, tgt), all = Fields.list(scope).map((f) => f.key);
        const inSec = all.filter((k) => { const f = Fields.get(scope, k); return !f.event && f.section === d.sec; });
        const pos = inSec.map((k) => all.indexOf(k));
        const moved = inSec.filter((k) => k !== d.key), at = moved.indexOf(tgt.dataset.fkey) + (flag ? 1 : 0);
        moved.splice(at, 0, d.key);
        moved.forEach((k, n) => (all[pos[n]] = k));
        const o = Fields.getOverrides();
        o[scope].order = all;
        Fields.setOverrides(o);
        persist();
        return render();
      }
      const row = e.target.closest("[data-vrow]"), card = row?.closest(".fcard");
      if (!row || card?.dataset.fkey !== d.key) return clearMarks();
      e.preventDefault();
      const t = Number(row.dataset.vrow), flag = after(e, row);
      let at = t + (flag ? 1 : 0);
      if (d.i < at) at--;
      editField(scope, d.key, (f) => {
        const v = ensureValues(f, scope, d.key), [m] = v.splice(d.i, 1);
        v.splice(at, 0, m);
      });
      clearMarks();
      refreshVals(card, scope, d.key);
    });
    box.addEventListener("dragend", () => { drag = null; clearMarks(); });

    box.addEventListener("input", (e) => {
      const el = e.target, card = el.closest(".fcard:not(.evcard)");
      if (el.dataset.evname !== undefined) {
        const id = el.closest(".evcard").dataset.ev;
        editEvents((ev) => ((ev.items[id] ||= {}).name = el.value), { rerender: false });
        el.closest(".evcard").querySelector(".fname").textContent = el.value.trim() || "Event";
        return;
      }
      if (el.dataset.secname !== undefined) {
        const id = el.closest(".fsec").dataset.sec;
        const sz = el.parentElement.querySelector(".sec-sizer");
        if (sz) sz.textContent = el.value || "(no title)";
        const o = Fields.getOverrides();
        (o[scopeNow()].sections ||= {})[id] = el.value;
        Fields.setOverrides(o);
        return persist();
      }
      if (!card || card.dataset.auto !== undefined) return;
      const key = card.dataset.fkey;
      if (el.dataset.flabel !== undefined) {
        editField(scopeNow(), key, (f) => {
          f.label = el.value;
        });
        card.querySelector(".fname").textContent = el.value.trim() || Fields.defaultOf(scopeNow(), key).label;
      } else if (el.dataset.vname !== undefined && !el.readOnly) {
        // Only the sample pill follows the typing; the new name is saved when the box is left.
        const p = card.querySelector(`[data-vpill="${el.dataset.vname}"]`), pn = el.closest("[data-vrow]").querySelector("[data-vpartner]")?.value;
        if (p) p.textContent = Fields.expand((pn ? `{p${pn}} ` : "") + el.value) || "…";
      }
    });
    box.addEventListener("change", async (e) => {
      const el = e.target, card = el.closest(".fcard:not(.evcard)");
      if (el.dataset.evenable !== undefined) {
        const id = el.closest(".evcard").dataset.ev;
        return editEvents((ev) => ((ev.items[id] ||= {}).enabled = el.checked));
      }
      if (el.dataset.evname !== undefined) {
        const id = el.closest(".evcard").dataset.ev;
        if (!el.value.trim()) return editEvents((ev) => delete (ev.items[id] || {}).name);
        // Keep the page as it is (a click on a button may be on its way); just refresh the RSVP card's name.
        const e2 = Fields.events().find((x) => x.id === id), card2 = el.closest(".evcard");
        const rc = card2.querySelector(`.fcard[data-fkey="${e2.rsvpKey}"]`);
        if (rc) {
          rc.querySelector(".fname").textContent = e2.rsvp.label;
          rc.querySelector("[data-flabel]").value = e2.rsvp.label;
        }
        return;
      }
      if (el.dataset.secname !== undefined) return render();
      if (!card || card.dataset.auto !== undefined) return;
      const key = card.dataset.fkey, scope = scopeNow();
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
      } else if (el.dataset.fcroll !== undefined) {
        const o = Fields.getOverrides(), c = (o.person.custom || []).find((x) => x.key === key);
        if (c) {
          if (el.value) c.roll = el.value;
          else delete c.roll;
          Fields.setOverrides(o);
          persist();
        }
      } else if (el.dataset.froll !== undefined) {
        editField(scope, key, (f) => (f.rollSection = el.value));
      } else if (el.dataset.fdefault !== undefined) {
        editField(scope, key, (f) => (f.default = el.value === "" ? null : el.value));
      } else if (el.dataset.vcolor !== undefined) {
        const i = Number(el.dataset.vcolor);
        editField(scope, key, (f) => (ensureValues(f, scope, key)[i].color = el.value));
        const p = card.querySelector(`[data-vpill="${i}"]`);
        if (p) p.className = "pill c-" + el.value;
        el.className = "csel c-" + el.value;
      } else if ((el.dataset.vname !== undefined && !el.readOnly) || el.dataset.vpartner !== undefined) {
        // Finished renaming a value (or changing its partner): offer to update the rows that use the old name.
        const row = el.closest("[data-vrow]"), nameEl = row.querySelector("[data-vname]");
        if (nameEl.readOnly) return;
        const i = Number(row.dataset.vrow), old = nameEl.dataset.orig, text = Fields.valueName(nameEl.value), pn = row.querySelector("[data-vpartner]")?.value;
        const raw = text ? (pn ? `{p${pn}} ${text}` : text) : "", now = Fields.expand(raw);
        nameEl.value = text;
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
    box.querySelectorAll(".fcard").forEach((c) => {
      const id = c.dataset.ev ? "ev:" + c.dataset.ev : scopeNow() + ":" + c.dataset.fkey;
      c.open ? openFields.add(id) : openFields.delete(id);
    });
    box.innerHTML = `
      <div class="settings-head"><h2>Settings</h2>
        <span class="muted" id="settings-status"></span>
        <button type="button" class="btn" data-settings-back>← Back to guest list</button></div>
      <div class="settings">
        <nav class="settings-nav" aria-label="Settings sections">${SECTIONS.map((x) => `<button type="button" class="${x.key === section ? "on" : ""}" data-section="${x.key}">${x.label}</button>`).join("")}</nav>
        <section class="settings-body">${section === "couple" ? coupleHtml() : section === "fields" ? fieldsHtml() : section === "stats" ? statsHtml() : section === "design" ? designHtml() : ""}</section>
      </div>`;
    box.querySelectorAll(".fcard").forEach((c) => (c.open = openFields.has(c.dataset.ev ? "ev:" + c.dataset.ev : scopeNow() + ":" + c.dataset.fkey)));
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
    box.addEventListener("change", (e) => {
      const id = e.target.dataset?.statpick;
      if (id === undefined) return;
      stats.hidden = e.target.checked ? stats.hidden.filter((x) => x !== id) : [...stats.hidden, id];
      persist();
      window.AppHooks.refreshStats();
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

  return { render, wire, loadRemote, couple: () => couple.map((p) => ({ ...p })), coupleNames, statsHidden: () => [...stats.hidden] };
})();
