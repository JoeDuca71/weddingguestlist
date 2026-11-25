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
      sections: [
        ["f_family", "Family"], ["f_invite", "Invite & RSVP"], ["f_travel", "Travel & stay"], ["f_afterparty", "After-party"],
        ["f_seating", "Seating"], ["f_address", "Address"], ["f_gifts", "Gifts & notes"],
      ],
      fields: [
        F("family_name", "Family name", "text", "f_family", { allowed: ["text"], noDisable: true, hint: "How we address them, e.g. The Brad Johnson Family" }),
        F("affiliation", "Affiliation", "dropdown", "f_family", {
          values: L([["Dylan Family"], ["Dylan Friends"], ["Joe Family"], ["Joe Friends"], ["Mutual"]]), nullable: true, default: null, allowed: ["dropdown"],
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
      sections: [
        ["p_name", "Name"], ["p_wedding", "Wedding"], ["p_rehearsal", "Rehearsal dinner"], ["p_afterparty", "After-party"],
        ["p_seating", "Seating"], ["p_contact", "Contact"], ["p_notes", ""],
      ],
      fields: [
        F("first_name", "First name", "text", "p_name", { allowed: ["text"], noDisable: true }),
        F("last_name", "Last name", "text", "p_name", { allowed: ["text"], noDisable: true }),
        F("role", "Role", "dropdown", "p_name", { values: L([["Guest"], ["Wedding Party"], ["DJ"], ["Officiant"]]), default: "Guest", allowed: ["dropdown"], combo: true, hint: "People can also add a new role right on the form." }),
        F("invited", "Invited (count)", "number", "p_wedding", { allowed: ["number"], noDisable: true, default: 1 }),
        F("rsvp", "RSVP", "dropdown", "p_wedding", { values: RSVP(), default: "TBD", allowed: ["dropdown"], locked: ["Yes", "No"], noDisable: true, rollup: true, rollSection: "f_invite" }),
        F("rd_invited", "Rehearsal dinner invited", "number", "p_rehearsal", { allowed: ["number"], default: 0 }),
        F("rd_status", "Rehearsal dinner RSVP", "dropdown", "p_rehearsal", { values: RSVP(), default: "TBD", allowed: ["dropdown"], rollup: true, rollSection: "f_invite" }),
        F("afterparty", "After-party", "dropdown", "p_afterparty", {
          values: L([["Unknown", "unknown"], ["Yes", "done"], ["Likely", "done"], ["Maybe", "process"], ["No", "muted"]]), default: "Unknown", allowed: ["dropdown"], rollup: true, rollSection: "f_afterparty",
        }),
        F("afterparty_swag", "After-party SWAG", "dropdown", "p_afterparty", {
          values: L([["Unknown", "unknown"], ["Yes", "done"], ["Maybe", "process"], ["No", "muted"]]), default: "Unknown", allowed: ["dropdown"], rollup: true, rollSection: "f_afterparty",
        }),
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

  // ---------- Overrides (what the user changed) ----------
  const KEY = "wedding-guests:fields";
  let overrides = { family: {}, person: {} };
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
    const out = { family: {}, person: {} };
    for (const scope of SCOPES) {
      const src = o?.[scope] || {}, D = DEFAULTS[scope], dst = out[scope];
      const secIds = D.sections.map((s) => s[0]), keys = D.fields.map((f) => f.key);
      for (const id of secIds) if (typeof src.sections?.[id] === "string") dst.sections = { ...(dst.sections || {}), [id]: str(src.sections[id]) };
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
    const D = DEFAULTS[scope], o = overrides[scope] || {};
    const sections = D.sections.map(([id, name]) => ({ id, name: o.sections?.[id] ?? name }));
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
      let def = ov.default !== undefined ? ov.default : d.default;
      const nullable = d.nullable || (hasValues(type) && type !== d.type && type !== "checkbox");
      if (hasValues(type) && type !== "multiselect") {
        if (def === null ? !nullable : !values.some((x) => x.v === def)) def = nullable ? null : (values.find((x) => x.v === d.default) || values[0] || { v: "" }).v;
      } else if (type === "multiselect") def = "";
      else if (d.type !== "number" && def === null) def = "";
      const sec = D.sections.some((s) => s[0] === ov.section) ? ov.section : d.section;
      const rollSection = d.rollup ? (D.sections.length && (o.fields?.[k]?.rollSection || d.rollSection)) : null;
      return {
        ...d, scope, type, values, default: def, nullable, section: sec, rollSection,
        enabled: d.noDisable ? true : ov.enabled !== false,
        label: ov.label || d.label,
        customized: !!o.fields?.[k],
      };
    });
    return { sections, fields };
  }
  const resolved = () => (cache ||= { family: resolveScope("family"), person: resolveScope("person") });

  function setOverrides(o, { silent } = {}) {
    overrides = cleanOverrides(o);
    cache = null;
    if (!silent) listeners.forEach((fn) => fn());
  }
  const getOverrides = () => JSON.parse(JSON.stringify(overrides));

  const list = (scope) => resolved()[scope].fields;
  const sections = (scope) => resolved()[scope].sections;
  const get = (scope, key) => list(scope).find((f) => f.key === key);
  const optionValues = (scope, key) => (get(scope, key)?.values || []).map((x) => x.v);
  const defaultOf = (scope, key) => DEFAULTS[scope].fields.find((f) => f.key === key);
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
    COLORS, TYPES, DEFAULTS, SCOPES, hasValues, list, sections, get, optionValues, defaultOf, colorOf,
    setOverrides, getOverrides, onChange, saveLocal, valueName,
  };
})();
