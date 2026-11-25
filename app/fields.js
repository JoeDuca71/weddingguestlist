"use strict";
// Field configuration: which fields exist for Families and for People, what they are called, what type
// they are, which section they sit in, and (for drop downs, checkboxes and multi-selects) which values
// they offer and what color each value gets. The built-in fields below are the defaults; whatever the
// user changes on the Settings page is stored as a small set of "overrides" and merged on top.
//
// Loaded before app.js. app.js builds its forms, columns, filters, stats and bulk edit from this.

window.Fields = (() => {
  // The colors a value can use: the four status colors and the accent from Settings > Design, or none.
  const COLORS = [
    ["none", "Plain (no color)"],
    ["done", "Done"],
    ["process", "In process"],
    ["todo", "To do"],
    ["unknown", "Unknown"],
    ["accent", "Accent"],
    ["muted", "Muted (struck through)"],
  ];
  const COLOR_KEYS = COLORS.map((c) => c[0]);
  const TYPES = { text: "Text", longtext: "Long text", dropdown: "Drop Down", checkbox: "Checkbox", multiselect: "Multi-Select", number: "Number" };
  const hasValues = (t) => t === "dropdown" || t === "checkbox" || t === "multiselect";
  const ANY = ["text", "longtext", "dropdown", "checkbox", "multiselect"];
  const L = (pairs) => pairs.map(([v, color = "none"]) => ({ v, color }));
  const YESNO = () => L([["Yes"], ["No"]]);

  // ---------- Built-in fields ----------
  // locked: values the app's automatic rules rely on (can be recolored, not renamed or removed).
  // allowed: which types make sense for the field (names and counts are fixed; fields that feed rules are drop downs).
  const F = (key, label, type, section, o = {}) => ({
    key, label, type, section, values: [], default: "", nullable: false, allowed: ANY, locked: [],
    noDisable: false, input: null, rollup: false, rollSection: null, hint: "", combo: false, ...o,
  });

  const RSVP = () => L([["TBD", "unknown"], ["Yes", "done"], ["No", "muted"], ["Maybe", "process"]]);

  const DEFAULTS = {
    family: {
      // [id, name, side of the family form]
      sections: [
        ["f_family", "Family", "L"], ["f_travel", "Travel & stay", "L"], ["f_address", "Address", "L"], ["f_gifts", "Gifts & notes", "L"],
        ["f_invite", "Wedding Invite & RSVP", "R"], ["f_seating", "Seating", "R"], ["f_events", "Related Events", "R"],
      ],
      fields: [
        F("family_name", "Family name", "text", "f_family", { allowed: ["text"], noDisable: true, hint: "How we address them, e.g. The Brad Johnson Family" }),
        F("affiliation", "Affiliation", "dropdown", "f_family", {
          values: L(["{p1}", "{p2}"].flatMap((p) => ["Friend – Childhood", "Friend – School", "Friend – College", "Friend – Work", "Friend", "Family"].map((x) => [`${p} ${x}`])).concat([["Mutual Friend"]])),
          nullable: true, default: null, allowed: ["dropdown"],
          hint: "{p1} and {p2} are the first and second partner from The Happy Couple. Use them in any value.",
        }),
        F("invite_status", "Invite status", "dropdown", "f_invite", {
          values: L([["Not Contacted", "todo"], ["Need to Text for Address", "todo"], ["Texted for Address", "process"], ["Emailed", "process"], ["Postcard Sent", "process"], ["Texted for RSVP", "process"], ["Done", "done"]]),
          default: "Not Contacted", allowed: ["dropdown"], locked: ["Done"], hint: "Turns Done when everyone answers Yes or No.",
        }),
        F("live_in_town", "Live in town?", "dropdown", "f_travel", { values: YESNO(), nullable: true, default: null, allowed: ["dropdown", "checkbox"], locked: ["Yes"] }),
        F("hotel_status", "Hotel", "dropdown", "f_travel", {
          values: L([["Unknown", "unknown"], ["Maybe Host Hotel", "process"], ["Yes Host Hotel", "done"], ["Yes Tracey BnB", "done"], ["Yes Other Home", "done"], ["n/a", "unknown"]]),
          default: "Unknown", allowed: ["dropdown"], locked: ["n/a"],
        }),
        F("hotel_swag", "Hotel SWAG bag", "dropdown", "f_travel", {
          values: L([["Need to Do", "todo"], ["Done", "done"], ["Delivered", "done"], ["n/a", "unknown"]]), default: "Need to Do", allowed: ["dropdown"], locked: ["n/a"],
        }),
        F("transportation", "Transportation", "dropdown", "f_travel", {
          values: L([["Self"], ["Hotel Shuttle"], ["Tracey BnB Shuttle"], ["Unknown"]]), default: "Unknown", allowed: ["dropdown"], locked: ["Self"],
        }),
        F("address", "Address", "text", "f_address"),
        F("city", "City", "text", "f_address"),
        F("state", "State", "text", "f_address"),
        F("zip", "Zip", "text", "f_address"),
        F("gift", "Gift", "longtext", "f_gifts"),
        F("thank_you_sent", "Thank-you sent?", "checkbox", "f_gifts", { values: YESNO(), default: "No" }),
        F("notes", "Notes", "longtext", "f_gifts"),
      ],
    },
    person: {
      // The related events' sections are slotted in between the two groups below.
      sectionsHead: [["p_name", "Name"], ["p_wedding", "Wedding"]],
      sectionsTail: [["p_seating", "Seating"], ["p_contact", "Contact"], ["p_notes", ""]],
      fields: [
        F("first_name", "First name", "text", "p_name", { allowed: ["text"], noDisable: true }),
        F("last_name", "Last name", "text", "p_name", { allowed: ["text"], noDisable: true }),
        F("role", "Role", "dropdown", "p_name", { values: L([["Guest"], ["Wedding Party"], ["DJ"], ["Officiant"]]), default: "Guest", allowed: ["dropdown"], combo: true, hint: "People can also add a new role right on the form." }),
        F("invited", "Invited (count)", "number", "p_wedding", { allowed: ["number"], noDisable: true, default: 1 }),
        F("rsvp", "RSVP", "dropdown", "p_wedding", { values: RSVP(), default: "TBD", allowed: ["dropdown"], locked: ["Yes", "No"], noDisable: true, rollup: true, rollSection: "f_invite" }),
        F("table_status", "Table status", "dropdown", "p_seating", {
          values: L([["Need to Seat", "todo"], ["Seated", "done"], ["n/a", "unknown"]]), default: "Need to Seat", allowed: ["dropdown"], rollup: true, rollSection: "f_seating",
        }),
        F("table_number", "Table #", "text", "p_seating", { allowed: ["text"], rollup: true, rollSection: "f_seating" }),
        F("phone", "Phone", "text", "p_contact", { input: "tel" }),
        F("email", "Email", "text", "p_contact", { input: "email" }),
        F("notes", "Notes", "longtext", "p_notes"),
      ],
    },
  };
  const SCOPES = ["family", "person"];


  // ---------- Related events ----------
  // An event (Rehearsal Dinner, After Party, ...) is a group of person-level fields: an RSVP plus any extras.
  // Everything about events is built into the person field list below, so the rest of the app treats an
  // event's fields like any other. New events and extra fields are stored with generated keys.
  const EVENT_RSVP = () => L([["n/a", "none"], ["TBD (Invited)", "process"], ["Yes", "done"], ["No", "muted"], ["Maybe", "process"]]);
  const BUILTIN_EVENTS = [
    { id: "engagement", name: "Engagement Party", enabled: false, rsvpKey: "ev_engagement" },
    { id: "bachelorette", name: "Bachelorette Party", enabled: true, rsvpKey: "ev_bachelorette" },
    { id: "bachelor", name: "Bachelor Party", enabled: false, rsvpKey: "ev_bachelor" },
    {
      id: "rehearsal", name: "Rehearsal Dinner", enabled: true, rsvpKey: "rd_status",
      fields: [F("rd_invited", "Rehearsal dinner invited", "number", null, { allowed: ["number"], default: 0 })],
    },
    {
      id: "afterparty", name: "After Party", enabled: true, rsvpKey: "afterparty",
      fields: [F("afterparty_swag", "After-party SWAG", "dropdown", null, { values: L([["Unknown", "unknown"], ["Yes", "done"], ["Maybe", "process"], ["No", "muted"]]), default: "Unknown", allowed: ["dropdown"] })],
    },
    { id: "brunch", name: "Post-Wedding Brunch", enabled: false, rsvpKey: "ev_brunch" },
  ];
  const evSection = (id) => "ev:" + id;
  const idOk = (id, p) => new RegExp("^" + p + "[a-z0-9]{3,12}$").test(String(id));
  const newId = (p) => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6);

  function cleanEvents(e) {
    const out = { items: {}, custom: [] };
    const items = e?.items || {};
    for (const id of Array.isArray(e?.custom) ? e.custom : []) if (idOk(id, "e_") && !out.custom.includes(id)) out.custom.push(id);
    for (const id of Object.keys(items)) {
      const builtin = BUILTIN_EVENTS.some((x) => x.id === id);
      if (!builtin && !out.custom.includes(id)) continue;
      const s = items[id] || {}, d = {};
      if (typeof s.enabled === "boolean") d.enabled = s.enabled;
      if (typeof s.name === "string" && s.name.trim()) d.name = str(s.name);
      if (Array.isArray(s.added)) d.added = s.added.filter((a) => idOk(a?.key, "x_")).map((a) => ({ key: a.key, label: str(a.label) || "New field" }));
      out.items[id] = d;
    }
    for (const id of out.custom) out.items[id] ||= { name: "New event" };
    return out;
  }
  // The events as they stand: built-ins in order, then the ones the user added.
  function resolveEvents(ev) {
    const items = ev?.items || {};
    const mk = (id, d, custom) => {
      const ov = items[id] || {};
      const name = ov.name || d.name;
      return {
        id, custom, name, enabled: ov.enabled ?? d.enabled ?? true, rsvpKey: d.rsvpKey || "ev_" + id, section: evSection(id),
        builtinFields: (d.fields || []).map((f) => f.key), added: (ov.added || []).map((a) => a.key),
        def: d, addedDefs: ov.added || [],
      };
    };
    return [...BUILTIN_EVENTS.map((d) => mk(d.id, d, false)), ...(ev?.custom || []).map((id) => mk(id, { name: "New event", enabled: true, rsvpKey: "ev_" + id }, true))];
  }
  // The built-in definition of every person field that belongs to an event.
  function eventFieldDefs(events) {
    const out = [];
    for (const e of events) {
      out.push(F(e.rsvpKey, e.name + " RSVP", "dropdown", e.section, {
        values: e.def.rsvp?.values || EVENT_RSVP(), default: e.def.rsvp?.default ?? "n/a", allowed: ["dropdown"], rollup: true, rollSection: "f_events", event: e.id, isRsvp: true,
      }));
      for (const f of e.def.fields || [])
        out.push({ ...f, section: e.section, event: e.id, rollup: f.type !== "number", rollSection: "f_events" });
      for (const a of e.addedDefs)
        out.push(F(a.key, a.label, "text", e.section, { rollup: true, rollSection: "f_events", event: e.id, added: true }));
    }
    return out;
  }
  // Sections and fields the user can configure, for one scope, given the events.
  function baseScope(scope, events) {
    if (scope === "family") return DEFAULTS.family;
    const P = DEFAULTS.person;
    return {
      sections: [...P.sectionsHead, ...events.map((e) => [e.section, e.name, null, true]), ...P.sectionsTail],
      fields: [...P.fields, ...eventFieldDefs(events)],
    };
  }

  // ---------- The couple's names ----------
  // Values can use {p1} and {p2}, which stand for the two partners in Settings > The Happy Couple.
  let couple = ["", ""];
  try {
    const c = JSON.parse(localStorage.getItem("wedding-guests:couple"));
    if (Array.isArray(c)) couple = [0, 1].map((i) => String(c[i]?.name ?? "").trim());
  } catch {}
  const expand = (raw) => String(raw ?? "").replace(/\{p([12])\}/g, (_, n) => couple[n - 1] || `Person ${n}`);

  // ---------- Overrides (what the user changed) ----------
  const KEY = "wedding-guests:fields";
  let overrides = { family: {}, person: {}, events: { items: {}, custom: [] } };
  let EV = resolveEvents(overrides.events);
  let cache = null;
  const listeners = [];

  const str = (v, max = 60) => String(v ?? "").trim().slice(0, max);
  // Value names can't contain commas: a multi-select stores its picks as one comma-separated text.
  const valueName = (v) => str(String(v ?? "").replace(/,/g, " ").replace(/\s+/g, " "));

  function cleanValues(arr) {
    if (!Array.isArray(arr)) return null;
    const seen = new Set(), out = [];
    for (const x of arr) {
      const v = valueName(x?.v);
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      out.push({ v, color: COLOR_KEYS.includes(x?.color) ? x.color : "none" });
    }
    return out;
  }

  function cleanOverrides(o) {
    const out = { family: {}, person: {}, events: cleanEvents(o?.events) };
    const evs = resolveEvents(out.events);
    for (const scope of SCOPES) {
      const src = o?.[scope] || {}, D = baseScope(scope, evs), dst = out[scope];
      const secIds = D.sections.map((s) => s[0]), keys = D.fields.map((f) => f.key);
      for (const id of secIds) if (!id.startsWith("ev:") && typeof src.sections?.[id] === "string") dst.sections = { ...(dst.sections || {}), [id]: str(src.sections[id]) };
      if (Array.isArray(src.order)) dst.order = src.order.filter((k) => keys.includes(k));
      for (const k of keys) {
        const s = src.fields?.[k];
        if (!s || typeof s !== "object") continue;
        const d = {};
        if (typeof s.enabled === "boolean") d.enabled = s.enabled;
        if (typeof s.label === "string" && s.label.trim()) d.label = str(s.label);
        if (TYPES[s.type]) d.type = s.type;
        if (secIds.includes(s.section)) d.section = s.section;
        if (typeof s.rollSection === "string") d.rollSection = s.rollSection;
        const vals = cleanValues(s.values);
        if (vals) d.values = vals;
        if (s.default === null || typeof s.default === "string") d.default = s.default;
        if (Object.keys(d).length) (dst.fields ||= {})[k] = d;
      }
    }
    return out;
  }

  // ---------- Resolving ----------
  function resolveScope(scope) {
    const D = baseScope(scope, EV), o = overrides[scope] || {};
    const sections = D.sections.map(([id, name, side, event]) => ({ id, name: o.sections?.[id] ?? name, side, event: !!event }));
    const known = (o.order || []).filter((k) => D.fields.some((f) => f.key === k));
    const order = [...known, ...D.fields.map((f) => f.key).filter((k) => !known.includes(k))];
    const fields = order.map((k) => {
      const d = D.fields.find((f) => f.key === k), ov = o.fields?.[k] || {};
      const type = ov.type && d.allowed.includes(ov.type) ? ov.type : d.type;
      let values = [];
      if (hasValues(type)) {
        values = cleanValues(ov.values) || (type === d.type ? d.values.map((x) => ({ ...x })) : type === "checkbox" ? YESNO() : []);
        for (const lv of d.locked) if (!values.some((x) => x.v === lv)) values.push({ v: lv, color: d.values.find((x) => x.v === lv)?.color || "none" });
        if (type === "checkbox") {
          const base = YESNO();
          values = [values[0] || base[0], values[1] || base[1]];
        }
      }
      values = values.map((x) => ({ v: expand(x.v), raw: x.v, color: x.color }));
      let def = ov.default !== undefined ? ov.default : d.default;
      const nullable = d.nullable || (hasValues(type) && type !== d.type && type !== "checkbox");
      if (hasValues(type) && type !== "multiselect") {
        if (def === null ? !nullable : !values.some((x) => x.v === def)) def = nullable ? null : (values.find((x) => x.v === d.default) || values[0] || { v: "" }).v;
      } else if (type === "multiselect") def = "";
      else if (d.type !== "number" && def === null) def = "";
      const sec = d.event ? d.section : D.sections.some((s) => s[0] === ov.section && !s[3]) ? ov.section : d.section;
      const rollSection = d.rollup ? (d.event ? d.rollSection : o.fields?.[k]?.rollSection || d.rollSection) : null;
      const evOn = d.event ? EV.find((e) => e.id === d.event)?.enabled : true;
      return {
        ...d, scope, type, values, default: def, nullable, section: sec, rollSection,
        own: d.noDisable || d.isRsvp ? true : ov.enabled !== false,
        enabled: !!evOn && (d.noDisable || d.isRsvp ? true : ov.enabled !== false),
        label: d.isRsvp ? d.label : ov.label || d.label,
        customized: !!o.fields?.[k],
      };
    });
    return { sections, fields };
  }
  const resolved = () => (cache ||= { family: resolveScope("family"), person: resolveScope("person") });

  function setOverrides(o, { silent } = {}) {
    overrides = cleanOverrides(o);
    EV = resolveEvents(overrides.events);
    cache = null;
    if (!silent) listeners.forEach((fn) => fn());
  }
  function setCouple(names) {
    const next = [0, 1].map((i) => String(names?.[i] ?? "").trim());
    if (next.join("\u0001") === couple.join("\u0001")) return;
    couple = next;
    cache = null;
    listeners.forEach((fn) => fn());
  }
  const getOverrides = () => JSON.parse(JSON.stringify(overrides));

  const list = (scope) => resolved()[scope].fields;
  const sections = (scope) => resolved()[scope].sections;
  const get = (scope, key) => list(scope).find((f) => f.key === key);
  const optionValues = (scope, key) => (get(scope, key)?.values || []).map((x) => x.v);
  const defaultOf = (scope, key) => baseScope(scope, EV).fields.find((f) => f.key === key);
  // The related events with their fields (the field objects are the resolved ones from list("person")).
  const events = () =>
    EV.map((e) => ({
      ...e,
      rsvp: get("person", e.rsvpKey),
      fields: [...e.builtinFields, ...e.added].map((k) => get("person", k)).filter(Boolean),
    }));
  const makeId = newId;
  // Color for a value of a field. Mixed ("Multiple") rolls up as in-process; unlisted values are plain.
  function colorOf(scope, key, value) {
    if (value === "Multiple") return "process";
    return get(scope, key)?.values.find((x) => x.v === value)?.color || "none";
  }
  const onChange = (fn) => listeners.push(fn);

  // ---------- Saved copy on this device ----------
  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  }
  function saveLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify(overrides));
    } catch {}
  }
  setOverrides(loadLocal(), { silent: true });

  return {
    COLORS, TYPES, DEFAULTS, SCOPES, events, makeId, hasValues, list, sections, get, optionValues, defaultOf, colorOf,
    setOverrides, getOverrides, setCouple, expand, onChange, saveLocal, valueName,
  };
})();
