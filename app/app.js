"use strict";

// ---------- Field definitions ----------
// Built from Fields (fields.js), which holds the defaults plus whatever was changed in Settings > Fields.
// buildModel() runs at start-up and again whenever those settings change.

const MULTI = "Multiple";
const BLANK = "__blank__";
const sum = (arr, k) => arr.reduce((n, p) => n + (Number(p[k]) || 0), 0);
const uniqJoin = (arr) => [...new Set(arr.filter(Boolean))].join(", ");

let PERSON_FIELDS, PF, PERSON_GROUPS, PERSON_DEFAULTS, FAMILY_FIELDS, FF, FAMILY_GROUPS, FAMILY_DEFAULTS;
let ROLLUPS, ROLLUP_LABEL, COLUMNS, COL, VIEWS, DEFAULT_COLUMNS, FILTERS, BULK_FIELDS, OPT_VALUES, IN_TOWN;

// How a configured field is drawn: text/textarea/number/select/combo/checkbox/multi.
const uiType = (f) =>
  ({ text: "text", longtext: "textarea", number: "number", dropdown: f.combo ? "combo" : "select", checkbox: "checkbox", multiselect: "multi" })[f.type];
function toUi(f) {
  return {
    key: f.key, label: f.label, type: uiType(f), input: f.input, hint: f.key === "family_name" ? f.hint : "", enabled: f.enabled, cfgType: f.type,
    options: f.values.map((x) => x.v), blank: f.nullable && f.type === "dropdown", scope: f.scope, def: f.default,
  };
}
const hasVals = (f) => f.cfgType === "dropdown" || f.cfgType === "checkbox" || f.cfgType === "multiselect";
const isOn = (scope, key) => !!Fields.get(scope, key)?.enabled;

function buildModel() {
  const events = Fields.events().filter((e) => e.enabled);
  const pAll = Fields.list("person").map(toUi), fAll = Fields.list("family").map(toUi);
  PF = Object.fromEntries(pAll.map((f) => [f.key, f]));
  FF = Object.fromEntries(fAll.map((f) => [f.key, f]));
  PERSON_FIELDS = pAll.filter((f) => f.enabled);
  FAMILY_FIELDS = fAll.filter((f) => f.enabled);
  PERSON_DEFAULTS = Object.fromEntries(pAll.map((f) => [f.key, f.def]));
  FAMILY_DEFAULTS = Object.fromEntries(fAll.map((f) => [f.key, f.def]));

  const pSecs = Fields.sections("person"), fSecs = Fields.sections("family");
  PERSON_GROUPS = pSecs
    .map((s) => ({ title: s.name, keys: PERSON_FIELDS.filter((f) => Fields.get("person", f.key).section === s.id).map((f) => f.key) }))
    .filter((g) => g.keys.length);

  // Person fields that roll up to the family: same value for everyone, or "Multiple".
  const rollFields = Fields.list("person").filter((f) => f.rollup && f.enabled);
  ROLLUPS = rollFields.map((f) => f.key);
  ROLLUP_LABEL = Object.fromEntries(rollFields.map((f) => [f.key, f.label]));
  FAMILY_GROUPS = fSecs
    .map((s) => ({
      title: s.name,
      side: s.side,
      // Related Events: one row of fields per event, so every event starts on a new line.
      rows: s.id === "f_events" ? events.map((ev) => [ev.rsvp, ...ev.fields].filter((f) => f?.enabled && f.rollup).map((f) => f.key)).filter((r) => r.length) : null,
      keys: [
        ...Fields.list("family").filter((f) => f.enabled && f.section === s.id).map((f) => f.key),
        ...rollFields.filter((f) => f.rollSection === s.id).map((f) => f.key),
      ],
    }))
    .filter((g) => g.keys.length);

  // Living in town fills in the travel fields (only the ones that exist and still have the "n/a" / "Self" values).
  IN_TOWN = {};
  if (isOn("family", "live_in_town") && Fields.optionValues("family", "live_in_town").includes("Yes")) {
    const want = { hotel_status: "n/a", hotel_swag: "n/a", transportation: "Self" };
    for (const [k, v] of Object.entries(want)) if (isOn("family", k) && Fields.optionValues("family", k).includes(v)) IN_TOWN[k] = v;
  }

  const fOn = (k) => isOn("family", k), pOn = (k) => isOn("person", k);
  const lab = (scope, k) => Fields.get(scope, k).label;
  // Columns the main list can show. Everything is per family.
  const col = (scope, key, extra = {}) => ({ key, scope, label: lab(scope, key), color: Fields.hasValues(Fields.get(scope, key).type) && Fields.get(scope, key).type !== "multiselect", ...extra });
  const all = [
    { key: "family_name", label: lab("family", "family_name"), fixed: true },
    { key: "people", label: "People", get: (f) => f.people.map(personName).join(", ") },
    { key: "party", label: lab("person", "invited"), num: true, get: (f) => sum(f.people, "invited") },
    { key: "attending", label: "Coming", num: true, get: (f) => sum(f.people.filter((p) => p.rsvp === "Yes"), "invited") },
    fOn("affiliation") && col("family", "affiliation"),
    pOn("rsvp") && col("person", "rsvp"),
    fOn("invite_status") && col("family", "invite_status"),
    fOn("live_in_town") && col("family", "live_in_town"),
    fOn("hotel_status") && col("family", "hotel_status"),
    fOn("hotel_swag") && col("family", "hotel_swag"),
    fOn("transportation") && col("family", "transportation"),
    ...events.flatMap((ev) => [ev.rsvp, ...ev.fields].filter((f) => f?.enabled).map((f) => col("person", f.key, f.type === "number" ? { num: true, get: (fam) => sum(fam.people, f.key) } : {}))),
    pOn("table_status") && col("person", "table_status"),
    pOn("table_number") && col("person", "table_number"),
    pOn("role") && { key: "roles", label: lab("person", "role") + "s", get: (f) => uniqJoin(f.people.map((p) => p.role).filter((r) => r !== "Guest")) },
    ...["address", "address2", "city", "state", "zip", "country"].map((k) => fOn(k) && col("family", k)),
    pOn("phone") && { key: "phones", label: lab("person", "phone"), get: (f) => uniqJoin(f.people.map((p) => p.phone)) },
    pOn("email") && { key: "emails", label: lab("person", "email"), get: (f) => uniqJoin(f.people.map((p) => p.email)) },
    fOn("gift") && col("family", "gift"),
    fOn("thank_you_sent") && col("family", "thank_you_sent"),
    fOn("notes") && col("family", "notes"),
    // Fields the user added to a section.
    ...Fields.list("family").filter((f) => f.custom && f.enabled).map((f) => col("family", f.key)),
    ...Fields.list("person").filter((f) => f.custom && f.enabled).map((f) => ({ key: f.key, label: f.label, get: (fam) => uniqJoin(fam.people.map((p) => p[f.key])) })),
  ];
  COLUMNS = all.filter(Boolean);
  COL = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
  // Column presets ("views"). The first one is the default.
  const views = [
    { name: "RSVPs", cols: ["family_name", "people", "party", "attending", "affiliation", "rsvp", "invite_status", "rd_invited", "rd_status", "notes"] },
    { name: "Seating", cols: ["family_name", "people", "attending", "affiliation", "rsvp", "table_status", "table_number", "notes"] },
    { name: "Hotel", cols: ["family_name", "attending", "invite_status", "live_in_town", "hotel_status", "hotel_swag", "transportation"] },
    { name: "Gifts", cols: ["family_name", "attending", "affiliation", "rsvp", "gift", "thank_you_sent", "notes", "address", "address2", "city", "state", "zip", "country"] },
  ];
  VIEWS = views.map((v) => ({ ...v, cols: v.cols.filter((k) => COL[k]) }));
  DEFAULT_COLUMNS = VIEWS[0].cols;

  // Filters above the list. Person-level filters match a family when ANY of its
  // people match, and also narrow which people go into the People export.
  const fil = (scope, key, extra = {}) => {
    const f = Fields.get(scope, key);
    if (!f?.enabled || f.type === "multiselect") return null;
    return { key, label: f.label, person: scope === "person", options: hasVals(f) ? f.values.map((x) => x.v) : undefined, blank: scope === "family" && f.nullable, ...extra };
  };
  FILTERS = [
    fil("person", "rsvp"),
    fil("family", "affiliation"),
    fil("family", "live_in_town"),
    fil("family", "invite_status"),
    fil("family", "hotel_status"),
    pOn("rd_invited") && { key: "rd_inv", label: lab("person", "rd_invited"), person: true, options: ["Yes", "No"], get: (p) => (Number(p.rd_invited) > 0 ? "Yes" : "No") },
    ...events.map((ev) => fil("person", ev.rsvpKey)),
    fil("person", "table_status"),
    fil("person", "role"),
    fil("family", "state", { blank: true }),
  ].filter(Boolean);

  // Multi-edit can change any of these on many families at once.
  const bulkOf = (scope, key, label) => {
    const f = scope === "people" ? PF[key] : FF[key];
    const sel = hasVals(f) && f.cfgType !== "multiselect";
    return { key, label: label || f.label, type: sel ? "select" : "text", options: f.options, blank: f.blank, scope };
  };
  BULK_FIELDS = [
    ...["affiliation", "invite_status", "live_in_town", "hotel_status", "hotel_swag", "transportation", "thank_you_sent"].filter(fOn).map((k) => bulkOf("family", k)),
    ...ROLLUPS.map((k) => bulkOf("people", k, ROLLUP_LABEL[k] + " (everyone)")),
    ...["city", "state", "zip", "country", "gift", "notes"].filter(fOn).map((k) => ({ ...bulkOf("family", k), type: "text" })),
  ];
  OPT_VALUES = new Set([...Fields.list("family"), ...Fields.list("person")].flatMap((f) => f.values.map((x) => x.v)));
}
// After the model changes, drop anything in the saved view state that no longer exists.
function reconcileState() {
  for (const k of Object.keys(state.filters)) if (!FILTERS.some((d) => d.key === k)) delete state.filters[k];
  state.columns = state.columns.filter((k) => COL[k]);
  if (!state.columns.includes("family_name")) state.columns.unshift("family_name");
  if (!COL[state.sort.key]) state.sort = { key: "family_name", dir: 1 };
  if (!BULK_FIELDS.some((f) => f.key === state.bulkField)) state.bulkField = BULK_FIELDS[0]?.key;
}
buildModel();
Fields.onChange(() => {
  buildModel();
  reconcileState();
  if (state.tab === "main") render();
  else if (state.tab === "blist") renderBlist();
});

// The B-list: people we haven't contacted yet and may or may not ever invite.
// Promoting one moves them onto the main list as a new family.
const affOptions = () => Fields.optionValues("family", "affiliation");
const blistFields = () => [
  { key: "family_name", label: "Name", type: "text", hint: "How we'd address them, e.g. The Brad Johnson Family" },
  { key: "people", label: "People (one per line)", type: "textarea", hint: "e.g. Brad Johnson. Leave blank for one person named above." },
  ...(isOn("family", "affiliation") ? [{ key: "affiliation", label: Fields.get("family", "affiliation").label, type: "select", options: affOptions(), blank: true }] : []),
  { key: "would_replace", label: "Would make room for", type: "text", hint: "e.g. a Dylan friend who declined" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];
const BLIST_DEFAULTS = { family_name: "", people: "", affiliation: null, would_replace: "", phone: "", email: "", city: "", state: "", notes: "" };
const blistLines = (b) => String(b.people || "").split("\n").map((x) => x.trim()).filter(Boolean);
const blistCount = (b) => Math.max(1, blistLines(b).length);
const byPriority = (a, b) => a.priority - b.priority || a.id - b.id;

// ---------- Small helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const todayIso = () => new Date().toISOString().slice(0, 10);
const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-");
const personName = (p) => [p.first_name, p.last_name].filter(Boolean).join(" ") || "(no name)";
const sortName = (s) => String(s || "").replace(/^the\s+/i, "").toLowerCase();

function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem("wedding-guests:" + key));
    localStorage.setItem("wedding-guests:" + key, JSON.stringify(value));
  } catch {
    return null;
  }
}

let toastTimer;
function toast(msg, isError) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), isError ? 6000 : 2500);
}

// ---------- Rules ----------

// The family value of a person field: everyone's shared value, or "Multiple".
// Rehearsal dinner only counts people invited to it.
function rollup(people, key) {
  const pool = people;
  if (!pool.length) return "";
  const vals = new Set(pool.map((p) => p[key] ?? ""));
  return vals.size === 1 ? [...vals][0] : MULTI;
}
// Which people a family-level change to `key` applies to.
const targetsFor = (people) => people;

// Everyone has answered Yes or No → invite is Done (when the invite status field is in use).
const allAnswered = (people) => people.length > 0 && people.every((p) => p.rsvp === "Yes" || p.rsvp === "No");

function suggestFamilyName(people) {
  const named = people.filter((p) => p.first_name || p.last_name);
  if (!named.length) return "";
  const lasts = [...new Set(named.map((p) => p.last_name).filter(Boolean))];
  if (lasts.length === 1) {
    const firsts = named.map((p) => p.first_name).filter(Boolean);
    return firsts.length ? `${firsts.slice(0, -1).join(", ")}${firsts.length > 1 ? " & " : ""}${firsts.at(-1)} ${lasts[0]}` : lasts[0];
  }
  return named.map(personName).join(" & ");
}

// ---------- Data layer ----------
// Backed by Supabase, or in demo mode (?demo) by this browser's local storage.

const cfg = window.APP_CONFIG || {};
const DEMO = new URLSearchParams(location.search).has("demo") || !cfg.supabaseUrl;
let sb = null;
const api = DEMO ? makeDemoApi() : makeSupabaseApi();
const strip = ({ created_at, updated_at, ...r }) => r;

function makeSupabaseApi() {
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const check = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  async function all(table) {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const page = check(await sb.from(table).select("*").order("id").range(from, from + 999));
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }
  // The original fields are real columns. Answers for anything added later (related events, extra fields, Apartment/Unit,
  // Country) live in one jsonb column ("extra") on each table, so adding a field never needs a database change.
  // The app sees them flat.
  const COLS = {
    gl_people: new Set(["id", "family_id", "sort_order", "first_name", "last_name", "role", "invited", "rsvp", "rd_invited", "rd_status", "afterparty", "afterparty_swag", "table_status", "table_number", "phone", "email", "notes", "created_at", "updated_at", "extra"]),
    gl_families: new Set(["id", "family_name", "affiliation", "invite_status", "live_in_town", "hotel_status", "hotel_swag", "transportation", "address", "city", "state", "zip", "gift", "thank_you_sent", "notes", "knot_ref", "created_at", "updated_at", "extra"]),
  };
  const hasExtra = { gl_people: true, gl_families: true };
  let warnedExtra = false;
  const fromDb = ({ extra, ...r }) => ({ ...(extra || {}), ...r });
  const split = (t, r) => {
    const real = {}, ex = {};
    for (const [k, v] of Object.entries(r)) if (k !== "_family" && k !== "people") (COLS[t].has(k) ? real : ex)[k] = v;
    return [real, ex];
  };
  const noExtra = () => {
    if (warnedExtra) return;
    warnedExtra = true;
    toast("Run supabase/06_related_events.sql and 08_family_extra.sql so answers for the newer fields are saved.", true);
  };
  const toDb = (t, r) => {
    const [real, ex] = split(t, r);
    if (Object.keys(ex).length) hasExtra[t] ? (real.extra = ex) : noExtra();
    return real;
  };
  // Update many rows; answers kept in "extra" are merged per row.
  async function updateRows(t, ids, patch, stateKey) {
    if (!ids.length) return [];
    const [real, ex] = split(t, patch);
    const q = () => sb.from(t);
    if (!Object.keys(ex).length) return check(await q().update(real).in("id", ids).select()).map(fromDb);
    if (!hasExtra[t]) {
      noExtra();
      return Object.keys(real).length ? check(await q().update(real).in("id", ids).select()).map(fromDb) : [];
    }
    const out = [];
    for (const id of ids) {
      const cur = state[stateKey].find((p) => p.id === id) || {};
      const mine = Object.fromEntries(Object.entries(cur).filter(([k]) => !COLS[t].has(k) && k !== "_family" && k !== "people"));
      out.push(...check(await q().update({ ...real, extra: { ...mine, ...ex } }).eq("id", id).select()).map(fromDb));
    }
    return out;
  }
  return {
    load: async () => {
      const [families, people] = [await all("gl_families"), await all("gl_people")];
      if (people.length) hasExtra.gl_people = "extra" in people[0];
      if (families.length) hasExtra.gl_families = "extra" in families[0];
      return { families: families.map(fromDb), people: people.map(fromDb) };
    },
    insertFamily: async (row) => fromDb(check(await sb.from("gl_families").insert(toDb("gl_families", strip(row))).select().single())),
    updateFamilies: (ids, patch) => updateRows("gl_families", ids, patch, "families"),
    deleteFamily: async (id) => check(await sb.from("gl_families").delete().eq("id", id)),
    insertPeople: async (rows) => (rows.length ? check(await sb.from("gl_people").insert(rows.map((r) => toDb("gl_people", strip(r)))).select()).map(fromDb) : []),
    upsertPeople: async (rows) => (rows.length ? check(await sb.from("gl_people").upsert(rows.map((r) => toDb("gl_people", strip(r)))).select()).map(fromDb) : []),
    updatePeople: (ids, patch) => updateRows("gl_people", ids, patch, "people"),
    deletePeople: async (ids) => (ids.length ? check(await sb.from("gl_people").delete().in("id", ids)) : null),
    // Settings live in their own table so the rest of the app works before its SQL has been run.
    loadSettings: async () => {
      const row = check(await sb.from("gl_settings").select("data").eq("id", 1).maybeSingle());
      return row?.data || null;
    },
    saveSettings: async (data) => check(await sb.from("gl_settings").upsert({ id: 1, data })),
    // The B-list table is separate so the rest of the app still works before its SQL has been run.
    loadBlist: async () => check(await sb.from("gl_blist").select("*").order("priority").order("id")),
    insertBlist: async (row) => check(await sb.from("gl_blist").insert(strip(row)).select().single()),
    upsertBlist: async (rows) => (rows.length ? check(await sb.from("gl_blist").upsert(rows.map(strip)).select()) : []),
    deleteBlist: async (id) => check(await sb.from("gl_blist").delete().eq("id", id)),
    subscribe(onChange) {
      sb.channel("blist")
        .on("postgres_changes", { event: "*", schema: "public", table: "gl_blist" }, (p) => onChange("blist", p))
        .subscribe();
      sb.channel("guests")
        .on("postgres_changes", { event: "*", schema: "public", table: "gl_families" }, (p) => onChange("families", p.new && p.new.id ? { ...p, new: fromDb(p.new) } : p))
        .on("postgres_changes", { event: "*", schema: "public", table: "gl_people" }, (p) => onChange("people", p.new && p.new.id ? { ...p, new: fromDb(p.new) } : p))
        .subscribe();
    },
  };
}

function makeDemoApi() {
  let db = store("demo-db");
  if (!db) {
    const seed = window.DEMO_DATA || [];
    db = { families: [], people: [], nextId: 1 };
    for (const { people, ...fam } of seed) {
      const f = { ...FAMILY_DEFAULTS, ...fam, id: db.nextId++ };
      db.families.push(f);
      people.forEach((p, i) => db.people.push({ ...PERSON_DEFAULTS, ...p, id: db.nextId++, family_id: f.id, sort_order: i }));
    }
  }
  if (!db.blist) {
    db.blist = (window.DEMO_BLIST || []).map((b, i) => ({ ...BLIST_DEFAULTS, ...b, priority: i + 1, id: db.nextId++ }));
  }
  const save = () => store("demo-db", db);
  const patchRows = (table, ids, patch) => {
    const out = db[table].filter((r) => ids.includes(r.id)).map((r) => Object.assign(r, patch));
    save();
    return structuredClone(out);
  };
  return {
    load: async () => structuredClone({ families: db.families, people: db.people }),
    insertFamily: async (row) => {
      const r = { ...row, id: db.nextId++ };
      db.families.push(r);
      save();
      return { ...r };
    },
    updateFamilies: async (ids, patch) => patchRows("families", ids, patch),
    deleteFamily: async (id) => {
      db.families = db.families.filter((f) => f.id !== id);
      db.people = db.people.filter((p) => p.family_id !== id);
      save();
    },
    insertPeople: async (rows) => {
      const out = rows.map((r) => ({ ...r, id: db.nextId++ }));
      db.people.push(...out);
      save();
      return structuredClone(out);
    },
    upsertPeople: async (rows) => {
      rows.forEach((r) => Object.assign(db.people.find((p) => p.id === r.id), r));
      save();
      return structuredClone(rows);
    },
    updatePeople: async (ids, patch) => patchRows("people", ids, patch),
    deletePeople: async (ids) => {
      db.people = db.people.filter((p) => !ids.includes(p.id));
      save();
    },
    loadSettings: async () => null, // the demo keeps its look on this device (theme.js)
    saveSettings: async () => null,
    loadBlist: async () => structuredClone(db.blist),
    insertBlist: async (row) => {
      const r = { ...row, id: db.nextId++ };
      db.blist.push(r);
      save();
      return { ...r };
    },
    upsertBlist: async (rows) => {
      rows.forEach((r) => Object.assign(db.blist.find((b) => b.id === r.id), r));
      save();
      return structuredClone(rows);
    },
    deleteBlist: async (id) => {
      db.blist = db.blist.filter((b) => b.id !== id);
      save();
    },
    subscribe() {},
  };
}

// ---------- State ----------

const state = {
  families: [],
  people: [],
  filters: store("filters") || {},
  search: "",
  columns: (store("columns-v2") || DEFAULT_COLUMNS).filter((k) => COL[k]),
  sort: store("sort") || { key: "family_name", dir: 1 },
  showFilters: false,
  bulk: false,
  selected: new Set(),
  bulkField: "hotel_status",
  blist: [],
  blistError: null,
  blistFilter: "",
  tab: store("tab") === "blist" ? "blist" : "main",
};

function upsertLocal(table, row) {
  const list = state[table];
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = row;
  else list.push(row);
}
function removeLocal(table, id) {
  state[table] = state[table].filter((x) => x.id !== id);
  if (table === "families") state.people = state.people.filter((p) => p.family_id !== id);
}

// Fill in a default for any field a person has no answer for yet (for example a newly switched-on event).
function hydrate() {
  const fields = Fields.list("person");
  for (const p of state.people) for (const f of fields) if (p[f.key] === undefined) p[f.key] = PERSON_DEFAULTS[f.key];
  const ffields = Fields.list("family");
  for (const f of state.families) for (const d of ffields) if (f[d.key] === undefined) f[d.key] = FAMILY_DEFAULTS[d.key];
}

// Families with their people attached and rollups filled in.
function familyViews() {
  const byFam = new Map();
  for (const p of state.people) {
    if (!byFam.has(p.family_id)) byFam.set(p.family_id, []);
    byFam.get(p.family_id).push(p);
  }
  return state.families.map((f) => {
    const people = (byFam.get(f.id) || []).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const v = { ...f, people };
    ROLLUPS.forEach((k) => (v[k] = rollup(people, k)));
    return v;
  });
}

function colValue(f, key) {
  const c = COL[key];
  return c.get ? c.get(f) : f[key];
}

function filterOptions(def) {
  let vals = def.options;
  if (!vals) {
    const pool = def.person ? state.people.map((p) => p[def.key]) : state.families.map((f) => f[def.key]);
    vals = [...new Set(pool.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  }
  return [...(def.blank ? [[BLANK, "(blank)"]] : []), ...vals.map((v) => [v, v])];
}

const fv = (v) => (v == null || v === "" ? BLANK : String(v));
function personMatches(p) {
  for (const def of FILTERS) {
    const sel = state.filters[def.key];
    if (!def.person || !sel?.length) continue;
    if (!sel.includes(fv(def.get ? def.get(p) : p[def.key]))) return false;
  }
  return true;
}
function familyMatches(f) {
  for (const def of FILTERS) {
    const sel = state.filters[def.key];
    if (def.person || !sel?.length) continue;
    if (!sel.includes(fv(f[def.key]))) return false;
  }
  if (FILTERS.some((d) => d.person && state.filters[d.key]?.length) && !f.people.some(personMatches)) return false;
  if (state.search) {
    const q = state.search.toLowerCase();
    const hay = [f.family_name, f.city, f.state, f.address, f.notes, f.gift, ...f.people.flatMap((p) => [personName(p), p.email, p.phone, p.role])]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
const activeFilterCount = () => FILTERS.filter((d) => state.filters[d.key]?.length).length;

// What's on screen: matching families, sorted. Export uses exactly this.
function visibleFamilies() {
  const { key, dir } = state.sort;
  const c = COL[key] || COL.family_name;
  return familyViews()
    .filter(familyMatches)
    .sort((a, b) => {
      let x = colValue(a, c.key), y = colValue(b, c.key);
      if (c.key === "family_name") (x = sortName(x)), (y = sortName(y));
      if (c.num) return dir * ((x || 0) - (y || 0));
      x = String(x ?? ""), y = String(y ?? "");
      if (!x !== !y) return x ? -1 : 1; // blanks last
      return dir * x.localeCompare(y, undefined, { numeric: true }) || sortName(a.family_name).localeCompare(sortName(b.family_name));
    });
}
const visiblePeople = (fams) => fams.flatMap((f) => f.people.filter(personMatches).map((p) => ({ ...p, _family: f })));

// ---------- Rendering ----------

function render() {
  hydrate();
  renderTabs();
  if (state.tab === "settings") {
    if (!$("#settings-view").firstChild) Settings.render(); // don't rebuild it under someone mid-edit
    return;
  }
  if (state.tab === "blist") return renderBlist();
  const fams = visibleFamilies();
  renderStats();
  renderFilters();
  renderColumnPicker();
  renderList(fams);
  renderBulkBar();
  const total = state.families.length;
  $("#count").textContent = fams.length === total ? `${total} families` : `${fams.length} of ${total} families`;
}

function pill(v, scope, key) {
  if (v === "" || v == null) return `<span class="muted">—</span>`;
  return `<span class="pill c-${Fields.colorOf(scope, key, v)}">${esc(v)}</span>`;
}
function cellHtml(f, key) {
  const c = COL[key];
  const v = colValue(f, key);
  if (key === "family_name") return `<strong>${esc(v)}</strong>`;
  if (c.color) return pill(v, c.scope, key);
  if (v === "" || v == null) return `<span class="muted">—</span>`;
  return esc(v);
}

function renderList(fams) {
  const box = $("#list");
  if (!state.families.length) {
    box.innerHTML = `<div class="empty">No guests yet. Click <strong>+ Family</strong> to add the first one.</div>`;
    return;
  }
  if (!fams.length) {
    box.innerHTML = `<div class="empty">No families match. <button class="linkish" id="clear-filters2">Clear filters and search</button></div>`;
    return;
  }
  const cols = state.columns;
  const allSel = fams.every((f) => state.selected.has(f.id));
  const head =
    (state.bulk ? `<th class="c-sel"><input type="checkbox" class="check" id="sel-all" ${allSel ? "checked" : ""} aria-label="Select all shown"></th>` : "") +
    cols
      .map((k) => {
        const on = state.sort.key === k;
        return `<th class="c-${k} ${COL[k].num ? "num" : ""}"><button class="sort ${on ? "on" : ""}" data-sort="${k}">${esc(COL[k].label)}${on ? (state.sort.dir > 0 ? " ▲" : " ▼") : ""}</button></th>`;
      })
      .join("");
  const rows = fams
    .map((f) => {
      const sel = state.selected.has(f.id);
      return `<tr data-fam="${f.id}" class="${sel ? "selected" : ""}">
        ${state.bulk ? `<td class="c-sel"><input type="checkbox" class="check" data-sel="${f.id}" ${sel ? "checked" : ""} aria-label="Select"></td>` : ""}
        ${cols.map((k) => `<td class="c-${k} ${COL[k].num ? "num" : ""}" data-label="${esc(COL[k].label)}">${cellHtml(f, k)}</td>`).join("")}
      </tr>`;
    })
    .join("");
  box.innerHTML = `<div class="tablewrap"><table class="guests ${state.bulk ? "bulk" : ""}"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function tally(people, key, weightKey) {
  const out = {};
  for (const p of people) out[p[key]] = (out[p[key]] || 0) + (Number(p[weightKey]) || 0);
  return out;
}
// Each stat ignores its own filter, so clicking "25 yes" doesn't turn the rest of that card into zeros.
function withoutFilter(key, fn) {
  const saved = state.filters;
  state.filters = { ...saved, [key]: [] };
  try {
    return fn(visibleFamilies());
  } finally {
    state.filters = saved;
  }
}
// The stat cards are a carousel: as many as fit, with arrows that go round and round.
let statTiles = [], statStart = 0;
const STAT_W = 205, STAT_GAP = 10, STAT_NAV = 34;
function drawStats() {
  const box = $("#stats"), total = statTiles.length;
  if (!total) return (box.innerHTML = "");
  const W = box.clientWidth || 1000;
  const fit = (w) => Math.max(1, Math.floor((w + STAT_GAP) / (STAT_W + STAT_GAP)));
  const nav = total > fit(W);
  const n = nav ? fit(W - 2 * (STAT_NAV + 8)) : total;
  statStart = ((statStart % total) + total) % total;
  const shown = Array.from({ length: Math.min(n, total) }, (_, i) => statTiles[(statStart + i) % total]);
  const arrow = (d, ch, label) => `<button type="button" class="stat-nav" data-statnav="${d}" aria-label="${label}">${ch}</button>`;
  box.innerHTML = (nav ? arrow(-1, "‹", "Previous stats") : "") + `<div class="stat-track">${shown.join("")}</div>` + (nav ? arrow(1, "›", "Next stats") : "");
}
let statResize;
window.addEventListener("resize", () => {
  clearTimeout(statResize);
  statResize = setTimeout(drawStats, 120);
});

function renderStats() {
  const n = (v) => v || 0;
  const on = (key, val) => state.filters[key]?.length === 1 && state.filters[key][0] === val;
  // A number you can click to filter the list to that value (click again to clear).
  const chip = (key, val, count, label, big) =>
    `<button type="button" class="sv ${big ? "big" : ""} ${on(key, val) ? "on" : ""}" data-stat="${key}" data-val="${esc(val)}" title="Show only ${esc(label)}">${count}<small> ${esc(label)}</small></button>`;
  const has = (scope, key, v) => isOn(scope, key) && Fields.optionValues(scope, key).includes(v);
  const lower = (v) => v.toLowerCase();
  // "TBD (Invited)" is shown as "tbd" to keep the cards narrow.
  const short = (v) => lower(v.replace(/\s*\(.*\)\s*/g, "")) || lower(v);
  const filtered = activeFilterCount() || state.search;
  const hidden = Settings.statsHidden();
  const tiles = [];

  // A card for a person-level answer field like RSVP: the "Yes" count big, the other values smaller.
  // People marked "n/a" (not invited to that event) don't count toward "invited" and aren't listed.
  const answerCard = (id, cls, title, key, weight) => {
    if (hidden.includes(id) || !has("person", key, "Yes")) return;
    const r = withoutFilter(key, (fams) => {
      const people = visiblePeople(fams);
      return { t: tally(people, key, weight), invited: sum(people.filter((p) => p[key] !== "n/a"), weight) };
    });
    const others = Fields.optionValues("person", key).filter((v) => v !== "Yes" && v !== "n/a");
    tiles.push(`<div class="stat ${cls}">
      <span title="${esc(title)}">${esc(title)}${key === "rsvp" && filtered ? " (this view)" : ""}</span>
      <strong>${chip(key, "Yes", n(r.t.Yes), "yes", true)} <small>of ${r.invited}</small></strong>
      <em>${others.map((v) => chip(key, v, n(r.t[v]), short(v))).join(" · ")}</em>
    </div>`);
  };
  answerCard("rsvp", "s-rsvp", "Wedding RSVPs", "rsvp", "invited");

  if (!hidden.includes("hotel") && has("family", "hotel_status", "Yes Host Hotel") && has("family", "hotel_status", "Maybe Host Hotel")) {
    const hotel = withoutFilter("hotel_status", (fams) => ({
      yes: fams.filter((f) => f.hotel_status === "Yes Host Hotel").length,
      maybe: fams.filter((f) => f.hotel_status === "Maybe Host Hotel").length,
    }));
    tiles.push(`<div class="stat s-hotel">
      <span>Host Hotel RSVPs</span>
      <strong>${chip("hotel_status", "Yes Host Hotel", hotel.yes, "yes", true)} · ${chip("hotel_status", "Maybe Host Hotel", hotel.maybe, "maybe", true)}</strong>
      <em>up to ${hotel.yes + hotel.maybe} families</em>
    </div>`);
  }
  // One card per related event that is switched on, in the order of the events.
  for (const ev of Fields.events()) if (ev.enabled) answerCard("ev:" + ev.id, `s-ev s-${ev.id}`, ev.name, ev.rsvpKey, "invited");
  statTiles = tiles;
  drawStats();
}

function renderFilters() {
  const n = activeFilterCount();
  $("#toggle-filters").textContent = n ? `Filters (${n})` : "Filters";
  $("#toggle-filters").classList.toggle("on", n > 0);
  const box = $("#filters");
  box.classList.toggle("open", state.showFilters);
  const openKey = $("details.ms[open]", box)?.dataset.key;
  box.innerHTML =
    FILTERS.map((def) => {
      const sel = state.filters[def.key] || [];
      const opts = filterOptions(def);
      const names = opts.filter(([v]) => sel.includes(v)).map(([, l]) => l);
      const summary = names.length ? (names.length > 2 ? `${names.length} selected` : names.join(", ")) : "All";
      return `<details class="ms" data-key="${def.key}" ${openKey === def.key ? "open" : ""}>
        <summary><span class="ms-label">${esc(def.label)}</span><span class="ms-val ${names.length ? "on" : ""}">${esc(summary)}</span></summary>
        <div class="ms-pop">${
          opts.map(([v, l]) => `<label><input type="checkbox" data-filter="${def.key}" value="${esc(v)}" ${sel.includes(v) ? "checked" : ""}> ${esc(l)}</label>`).join("") ||
          `<span class="muted pad">No values yet</span>`
        }</div>
      </details>`;
    }).join("") + (n ? `<button class="linkish" id="clear-filters">Clear filters</button>` : "");
}

function renderViews() {
  const cur = state.columns.join(",");
  const match = VIEWS.find((v) => v.cols.join(",") === cur);
  $("#views").innerHTML =
    VIEWS.map((v) => `<button type="button" class="vbtn ${v === match ? "on" : ""}" data-view="${esc(v.name)}">${esc(v.name)}</button>`).join("") +
    (match ? "" : `<span class="vbtn custom on" title="You've changed the columns">Custom</span>`);
}

function renderColumnPicker() {
  renderViews();
  $("#column-list").innerHTML =
    COLUMNS.map(
      (c) => `<label><input type="checkbox" data-col="${c.key}" ${state.columns.includes(c.key) ? "checked" : ""} ${c.fixed ? "disabled" : ""}> ${esc(c.label)}</label>`
    ).join("") + `<button class="linkish" id="reset-cols">Reset to ${esc(VIEWS[0].name)} view</button>`;
}

// ---------- Inputs ----------

function optionsHtml(options, value, { blank, multi } = {}) {
  let html = blank ? `<option value="">—</option>` : "";
  if (multi && value === MULTI) html += `<option value="${MULTI}" selected disabled>Multiple</option>`;
  const opts = value && value !== MULTI && !options.includes(value) ? [...options, value] : options;
  return html + opts.map((o) => `<option ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("");
}
function inputHtml(f, value, attrs) {
  const v = value ?? "";
  if (f.type === "select") return `<select ${attrs}>${optionsHtml(f.options, v, { blank: f.blank, multi: f.multi })}</select>`;
  if (f.type === "combo") {
    const extra = [...new Set(state.people.map((p) => p[f.key]).filter(Boolean))];
    const opts = [...new Set([...f.options, ...extra])];
    return `<select ${attrs} data-combo="1">${optionsHtml(opts, v)}<option value="__new__">+ New…</option></select>`;
  }
  // Checkbox: the first value means ticked, the second unticked.
  if (f.type === "checkbox")
    return `<span class="cbfield"><input type="checkbox" class="check" ${v === f.options[0] ? "checked" : ""} data-on="${esc(f.options[0])}" data-off="${esc(f.options[1])}" ${attrs}> <span>${esc(f.options[0])}</span></span>`;
  // Multi-select: stored as one comma-separated text.
  if (f.type === "multi") {
    const picked = String(v).split(",").map((x) => x.trim()).filter(Boolean);
    const opts = [...new Set([...f.options, ...picked])];
    return `<select multiple size="${Math.min(6, Math.max(2, opts.length))}" ${attrs} data-multi="1">${opts.map((o) => `<option ${picked.includes(o) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  }
  if (f.type === "textarea") return `<textarea rows="2" ${attrs}>${esc(v)}</textarea>`;
  if (f.type === "number") return `<input type="number" min="0" step="1" inputmode="numeric" value="${esc(v)}" ${attrs}>`;
  return `<input type="${f.input === "tel" ? "tel" : f.input === "email" ? "email" : "text"}" value="${esc(v)}" ${attrs}>`;
}
function readInput(el) {
  if (el.type === "checkbox") return el.checked ? el.dataset.on : el.dataset.off;
  if (el.multiple) return [...el.selectedOptions].map((o) => o.value).join(", ");
  if (el.type === "number") return el.value === "" ? 0 : Math.max(0, Math.round(Number(el.value)));
  return el.value.trim() === "" ? (el.tagName === "SELECT" ? null : "") : el.value;
}
function handleCombo(el) {
  if (el.value !== "__new__") return false;
  const v = prompt("New role:")?.trim();
  if (v) {
    el.insertAdjacentHTML("afterbegin", `<option>${esc(v)}</option>`);
    el.value = v;
  } else el.value = el.dataset.prev || "Guest";
  return true;
}

// ---------- Family dialog ----------
// Edits happen on a draft copy and are saved together.

let draft = null;

function openFamily(id) {
  const f = id ? familyViews().find((x) => x.id === id) : null;
  if (id && !f) return;
  draft = f
    ? { id: f.id, family: Object.fromEntries(Object.keys(FAMILY_DEFAULTS).map((k) => [k, f[k] ?? FAMILY_DEFAULTS[k]])), people: structuredClone(f.people), removed: [] }
    : { id: null, family: { ...FAMILY_DEFAULTS }, people: [{ ...PERSON_DEFAULTS }], removed: [] };
  draft.nameTouched = !!draft.family.family_name;
  renderDialog();
  $("#family-dialog").showModal();
  $("#family-dialog .sheet-body").scrollTop = 0;
  if (!id) $('[data-p="0"][data-k="first_name"]')?.focus();
}

function familyFieldHtml(key) {
  if (ROLLUPS.includes(key)) {
    const pf = PF[key];
    const val = rollup(draft.people, key);
    const label = `${ROLLUP_LABEL[key]} <i class="badge" title="Rolls up from each person. Changing it here sets everyone.">everyone</i>`;
    const ctl =
      pf.options.length && pf.cfgType !== "multiselect"
        ? `<select data-roll="${key}">${optionsHtml(pf.options, val, { multi: true })}</select>`
        : `<input data-roll="${key}" value="${esc(val === MULTI ? "" : val)}" placeholder="${val === MULTI ? "Multiple" : ""}">`;
    return `<label class="field f-${key}"><span>${label}</span>${ctl}</label>`;
  }
  const f = FF[key];
  const auto = key === "invite_status" ? `<small class="hint">Turns Done when everyone answers Yes or No.</small>` : f.hint ? `<small class="hint">${esc(f.hint)}</small>` : "";
  return `<label class="field f-${key}"><span>${esc(f.label)}</span>${inputHtml(f, draft.family[key], `data-f="${key}"`)}${auto}</label>`;
}

function personCardHtml(p, i) {
  const groups = PERSON_GROUPS.map(
    (g) => `<div class="pgroup">${g.title ? `<h5>${esc(g.title)}</h5>` : ""}<div class="pgrid">${g.keys
      .map((k) => `<label class="field pf-${k}"><span>${esc(PF[k].label)}</span>${inputHtml(PF[k], p[k], `data-p="${i}" data-k="${k}"`)}</label>`)
      .join("")}</div></div>`
  ).join("");
  return `<div class="person" data-pi="${i}">
    <div class="person-head"><strong class="pname">${esc(personName(p))}</strong>
      <button type="button" class="linkish danger-link" data-remove-person="${i}">Remove</button></div>
    ${groups}
  </div>`;
}

function renderDialog() {
  const form = $("#family-form");
  const scroll = $(".sheet-body", form)?.scrollTop || 0;
  form.innerHTML = `
    <div class="sheet-head"><h2>${draft.id ? "Edit family" : "Add family"}</h2><button type="button" class="x" data-close aria-label="Close">✕</button></div>
    <div class="sheet-body">
      <div class="fam-groups">
        ${["L", "R"]
          .map((side) => `<div class="fam-col">${FAMILY_GROUPS.filter((g) => g.side === side).map((g) => `<fieldset class="fgroup"><legend>${esc(g.title)}</legend>${(g.rows || [g.keys]).map((row) => `<div class="form-grid">${row.map(familyFieldHtml).join("")}</div>`).join("")}</fieldset>`).join("")}</div>`)
          .join("")}
      </div>
      <h3 class="people-title">People <span class="muted">(${draft.people.length})</span></h3>
      <div class="people">${draft.people.map(personCardHtml).join("")}</div>
      <div class="add-row"><button type="button" class="btn" id="add-person">+ Add person</button>
      ${draft.people.length ? `<button type="button" class="btn" id="add-plusone">+ Add plus-one</button>` : ""}</div>
    </div>
    <div class="sheet-foot">
      ${draft.id ? `<button type="button" class="btn danger" id="delete-family">Delete family</button>` : "<span></span>"}
      <div class="foot-right"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">Save</button></div>
    </div>`;
  $(".sheet-body", form).scrollTop = scroll;
}

// Keep the family-level rollup controls in step with the people.
function syncDialog() {
  for (const key of ROLLUPS) {
    const el = $(`[data-roll="${key}"]`);
    if (!el || el.disabled) continue;
    const val = rollup(draft.people, key);
    if (el.tagName === "SELECT") el.innerHTML = optionsHtml(PF[key].options, val, { multi: true });
    else (el.value = val === MULTI ? "" : val), (el.placeholder = val === MULTI ? "Multiple" : "");
  }
  if (isOn("family", "invite_status") && allAnswered(draft.people) && draft.family.invite_status !== "Done") setFamilyField("invite_status", "Done");
  $$(".person").forEach((card) => ($(".pname", card).textContent = personName(draft.people[card.dataset.pi])));
  if (!draft.nameTouched) {
    draft.family.family_name = suggestFamilyName(draft.people);
    $('[data-f="family_name"]').value = draft.family.family_name;
  }
}
function setFamilyField(key, v) {
  draft.family[key] = v;
  const el = $(`[data-f="${key}"]`);
  if (el?.type === "checkbox") el.checked = v === el.dataset.on;
  else if (el) el.value = v ?? "";
}

function onDialogInput(e) {
  const el = e.target;
  if (el.dataset.f) {
    draft.family[el.dataset.f] = readInput(el);
    if (el.dataset.f === "family_name") draft.nameTouched = el.value.trim() !== "";
    if (el.dataset.f === "live_in_town" && readInput(el) === "Yes") Object.entries(IN_TOWN).forEach(([k, v]) => setFamilyField(k, v));
  } else if (el.dataset.k) {
    if (el.dataset.combo && handleCombo(el)) return;
    draft.people[el.dataset.p][el.dataset.k] = readInput(el);
    syncDialog();
  } else if (el.dataset.roll) {
    const key = el.dataset.roll;
    const v = readInput(el) ?? "";
    for (const p of targetsFor(draft.people, key)) p[key] = v;
    draft.people.forEach((p, i) => {
      const input = $(`[data-p="${i}"][data-k="${key}"]`);
      if (input) input.value = p[key] ?? "";
    });
    syncDialog();
  }
}

async function saveDialog() {
  const fam = { ...draft.family };
  const people = draft.people.filter((p) => p.id || p.first_name || p.last_name);
  if (!fam.family_name?.trim()) fam.family_name = suggestFamilyName(people);
  if (!fam.family_name?.trim()) return toast("Give the family a name, or add a person with a name", true);
  if (allAnswered(people)) fam.invite_status = "Done";
  try {
    let famId = draft.id;
    if (famId) upsertLocal("families", (await api.updateFamilies([famId], fam))[0]);
    else {
      const row = await api.insertFamily(fam);
      upsertLocal("families", row);
      famId = row.id;
    }
    const rows = people.map((p, i) => ({ ...PERSON_DEFAULTS, ...p, family_id: famId, sort_order: i }));
    const existing = rows.filter((p) => p.id), fresh = rows.filter((p) => !p.id).map(({ id, ...r }) => r);
    const removed = [...draft.removed, ...draft.people.filter((p) => p.id && !people.includes(p)).map((p) => p.id)];
    (await api.upsertPeople(existing)).forEach((r) => upsertLocal("people", r));
    (await api.insertPeople(fresh)).forEach((r) => upsertLocal("people", r));
    if (removed.length) {
      await api.deletePeople(removed);
      removed.forEach((id) => removeLocal("people", id));
    }
    $("#family-dialog").close();
    toast("Saved");
    render();
  } catch (e) {
    toast("Couldn't save: " + e.message, true);
  }
}

async function deleteFamily() {
  if (!confirm(`Delete ${draft.family.family_name || "this family"} and everyone in it? This can't be undone.`)) return;
  try {
    await api.deleteFamily(draft.id);
    removeLocal("families", draft.id);
    $("#family-dialog").close();
    toast("Deleted");
    render();
  } catch (e) {
    toast("Couldn't delete: " + e.message, true);
  }
}

// ---------- Multi-edit ----------

function renderBulkBar() {
  const bar = $("#bulkbar");
  bar.hidden = !state.bulk;
  document.body.classList.toggle("bulk", state.bulk);
  $("#bulk-toggle").classList.toggle("on", state.bulk);
  if (!state.bulk) return;
  const f = BULK_FIELDS.find((x) => x.key === state.bulkField) || BULK_FIELDS[0];
  const keep = $("#bulk-value")?.value;
  bar.innerHTML = `
    <strong>${state.selected.size} selected</strong>
    <label>Set <select id="bulk-field">${BULK_FIELDS.map((x) => `<option value="${x.key}" ${x.key === f.key ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></label>
    <label>to ${f.type === "select" ? `<select id="bulk-value">${optionsHtml(f.options, keep && f.options.includes(keep) ? keep : f.options[0], { blank: f.blank })}</select>` : `<input id="bulk-value" value="${esc(keep && !OPT_VALUES.has(keep) ? keep : "")}">`}</label>
    <button class="btn primary" id="bulk-apply" ${state.selected.size ? "" : "disabled"}>Apply</button>
    <button class="linkish" id="bulk-clear">Clear selection</button>
    <button class="btn" id="bulk-done">Done</button>`;
}

async function applyBulk() {
  const f = BULK_FIELDS.find((x) => x.key === state.bulkField);
  const raw = $("#bulk-value").value;
  const v = raw === "" ? (f.type === "select" ? null : "") : raw;
  const ids = [...state.selected];
  const fams = familyViews().filter((x) => ids.includes(x.id));
  try {
    if (f.scope === "family") {
      const patch = { [f.key]: v };
      if (f.key === "live_in_town" && v === "Yes") Object.assign(patch, IN_TOWN);
      (await api.updateFamilies(ids, patch)).forEach((r) => upsertLocal("families", r));
    } else {
      const pids = fams.flatMap((x) => targetsFor(x.people, f.key).map((p) => p.id));
      (await api.updatePeople(pids, { [f.key]: v ?? "" })).forEach((r) => upsertLocal("people", r));
      if (f.key === "rsvp") {
        const done = familyViews().filter((x) => ids.includes(x.id) && allAnswered(x.people) && x.invite_status !== "Done").map((x) => x.id);
        if (done.length) (await api.updateFamilies(done, { invite_status: "Done" })).forEach((r) => upsertLocal("families", r));
      }
    }
    toast(`Updated ${ids.length} ${ids.length === 1 ? "family" : "families"}`);
    render();
  } catch (e) {
    toast("Couldn't update: " + e.message, true);
  }
}

// ---------- Hooks for Settings ----------
// Renaming a value in Settings > Fields can carry the guests that use it along with it.
window.AppHooks = {
  refreshStats: () => renderStats(),
  async renameValue(scope, key, oldV, newV) {
    const rows = scope === "family" ? state.families : state.people;
    const table = scope === "family" ? "families" : "people";
    const groups = new Map(); // new text -> ids
    for (const r of rows) {
      const parts = String(r[key] ?? "").split(",").map((x) => x.trim());
      if (!parts.includes(oldV)) continue;
      const next = [...new Set(parts.map((x) => (x === oldV ? newV : x)).filter(Boolean))].join(", ");
      if (!groups.has(next)) groups.set(next, []);
      groups.get(next).push(r.id);
    }
    for (const [next, ids] of groups) {
      const saved = scope === "family" ? await api.updateFamilies(ids, { [key]: next }) : await api.updatePeople(ids, { [key]: next });
      saved.forEach((r) => upsertLocal(table, r));
    }
  },
};

// ---------- B-list ----------

function renderTabs() {
  const onB = state.tab === "blist", onS = state.tab === "settings", onM = state.tab === "main";
  $$("#tabs .tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === state.tab));
  $("#tabs").hidden = onS;
  $("#main-view").hidden = !onM;
  $("#blist-view").hidden = !onB;
  $("#settings-view").hidden = !onS;
  $("#add-family").hidden = !onM;
  $("#add-blist").hidden = !onB;
  $("#open-settings").classList.toggle("on", onS);
  $("#bulkbar").hidden = !onM || !state.bulk;
  $("#blist-count").textContent = state.blistError ? "" : `(${state.blist.reduce((n, b) => n + blistCount(b), 0)})`;
}

function setTab(tab) {
  state.tab = tab;
  if (tab !== "settings") store("tab", tab); // Settings is a visit, not somewhere to land next time
  else $("#settings-view").innerHTML = "";
  render();
  window.scrollTo(0, 0);
}

function renderBlist() {
  const box = $("#blist-view");
  if (state.blistError) {
    box.innerHTML = `<div class="empty"><strong>The B-list isn't set up yet.</strong><br>
      In Supabase, open <strong>SQL Editor &gt; New query</strong>, paste all of <code>supabase/03_blist.sql</code>, click <strong>Run</strong>, then reload this page.
      <br><span class="muted">${esc(state.blistError)}</span></div>`;
    return;
  }
  const all = [...state.blist].sort(byPriority);
  const shown = all.filter((b) => !state.blistFilter || (b.affiliation || "") === (state.blistFilter === BLANK ? "" : state.blistFilter));
  const heads = (arr) => arr.reduce((n, b) => n + blistCount(b), 0);

  // Where the gaps are: guests who said No, next to who's waiting on the B-list, by affiliation.
  const declined = {};
  for (const f of familyViews())
    for (const p of f.people) if (p.rsvp === "No") declined[f.affiliation || ""] = (declined[f.affiliation || ""] || 0) + (Number(p.invited) || 0);
  const affs = [...affOptions(), ""];
  const gaps = affs
    .map((a) => ({ a, no: declined[a] || 0, bl: heads(all.filter((b) => (b.affiliation || "") === a)) }))
    .filter((r) => r.no || r.bl);
  const totalNo = Object.values(declined).reduce((n, v) => n + v, 0);

  const filterBtns = [["", "All"], ...affOptions().map((a) => [a, a])]
    .map(([v, l]) => `<button type="button" class="vbtn ${state.blistFilter === v ? "on" : ""}" data-blfilter="${esc(v)}">${esc(l)}</button>`)
    .join("");

  const rows = shown
    .map((b) => {
      const i = all.indexOf(b);
      const lines = blistLines(b);
      return `<tr data-bl="${b.id}">
        <td class="c-rank num" data-label="#">${i + 1}</td>
        <td class="c-family_name" data-label="Name"><strong>${esc(b.family_name)}</strong></td>
        <td class="c-people" data-label="People">${lines.length ? esc(lines.join(", ")) : `<span class="muted">1 person</span>`}</td>
        <td data-label="Affiliation">${b.affiliation ? esc(b.affiliation) : `<span class="muted">—</span>`}</td>
        <td data-label="Would make room for">${b.would_replace ? esc(b.would_replace) : `<span class="muted">—</span>`}</td>
        <td data-label="Where">${esc([b.city, b.state].filter(Boolean).join(", ")) || `<span class="muted">—</span>`}</td>
        <td class="c-notes" data-label="Notes">${b.notes ? esc(b.notes) : `<span class="muted">—</span>`}</td>
        <td class="c-actions">
          <button type="button" class="iconbtn" data-blmove="${b.id}" data-dir="-1" title="Move up (invite sooner)" aria-label="Move up" ${i === 0 ? "disabled" : ""}>▲</button>
          <button type="button" class="iconbtn" data-blmove="${b.id}" data-dir="1" title="Move down (invite later)" aria-label="Move down" ${i === all.length - 1 ? "disabled" : ""}>▼</button>
          <button type="button" class="btn primary small" data-blpromote="${b.id}">Promote ➜</button>
        </td>
      </tr>`;
    })
    .join("");

  box.innerHTML = `
    <section class="blist-intro">
      <div>
        <h2>B-list</h2>
        <p class="muted">People we haven't contacted yet and may or may not ever invite. If we need more RSVPs, <strong>Promote</strong> moves someone to the main guest list.
        Higher up = invite sooner.</p>
      </div>
      <div class="gaps">
        <div class="gaps-title">Declined so far: <strong>${totalNo}</strong> · On B-list: <strong>${heads(all)}</strong></div>
        ${
          gaps.length
            ? `<table class="gaptable"><thead><tr><th></th><th>Declined</th><th>On B-list</th></tr></thead><tbody>${gaps
                .map((r) => `<tr><td>${esc(r.a || "No affiliation")}</td><td class="num">${r.no}</td><td class="num">${r.bl}</td></tr>`)
                .join("")}</tbody></table>`
            : ""
        }
      </div>
    </section>
    <div class="navrow"><div class="views" role="group" aria-label="Filter by affiliation">${filterBtns}</div>
      <span class="count muted">${shown.length === all.length ? `${all.length} on the list` : `${shown.length} of ${all.length}`}</span></div>
    ${
      all.length
        ? shown.length
          ? `<div class="tablewrap"><table class="guests blist"><thead><tr><th class="num">#</th><th>Name</th><th>People</th><th>Affiliation</th><th>Would make room for</th><th>Where</th><th>Notes</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
          : `<div class="empty">Nobody on the B-list for that affiliation.</div>`
        : `<div class="empty">The B-list is empty. Click <strong>+ B-list</strong> to add someone you might invite later.</div>`
    }`;
}

let bdraft = null;

function openBlist(id) {
  const b = id ? state.blist.find((x) => x.id === id) : null;
  if (id && !b) return;
  bdraft = b ? { id, ...Object.fromEntries(Object.keys(BLIST_DEFAULTS).map((k) => [k, b[k] ?? BLIST_DEFAULTS[k]])) } : { id: null, ...BLIST_DEFAULTS };
  $("#blist-form").innerHTML = `
    <div class="sheet-head"><h2>${id ? "Edit B-list entry" : "Add to B-list"}</h2><button type="button" class="x" data-bclose aria-label="Close">✕</button></div>
    <div class="sheet-body"><div class="form-grid blform">
      ${blistFields().map(
        (f) => `<label class="field bf-${f.key}"><span>${esc(f.label)}</span>${inputHtml(f, bdraft[f.key], `data-bf="${f.key}"`)}${f.hint ? `<small class="hint">${esc(f.hint)}</small>` : ""}</label>`
      ).join("")}
    </div></div>
    <div class="sheet-foot">
      ${id ? `<button type="button" class="btn danger" id="delete-blist">Remove</button>` : "<span></span>"}
      <div class="foot-right">
        ${id ? `<button type="button" class="btn" id="promote-blist">Promote ➜</button>` : ""}
        <button type="button" class="btn" data-bclose>Cancel</button><button type="submit" class="btn primary">Save</button>
      </div>
    </div>`;
  $("#blist-dialog").showModal();
  if (!id) $('[data-bf="family_name"]').focus();
}

async function saveBlist() {
  const row = { ...bdraft };
  row.family_name = String(row.family_name || "").trim();
  if (!row.family_name) {
    const first = String(row.people || "").split("\n").map((x) => x.trim()).find(Boolean);
    if (!first) return toast("Give them a name", true);
    row.family_name = first;
  }
  try {
    if (row.id) (await api.upsertBlist([{ ...state.blist.find((b) => b.id === row.id), ...row }])).forEach((r) => upsertLocal("blist", r));
    else upsertLocal("blist", await api.insertBlist({ ...row, id: undefined, priority: Math.max(0, ...state.blist.map((b) => b.priority)) + 1 }));
    $("#blist-dialog").close();
    toast("Saved");
    render();
  } catch (e) {
    toast("Couldn't save: " + e.message, true);
  }
}

async function deleteBlist() {
  if (!confirm(`Remove ${bdraft.family_name || "this entry"} from the B-list?`)) return;
  try {
    await api.deleteBlist(bdraft.id);
    removeLocal("blist", bdraft.id);
    $("#blist-dialog").close();
    toast("Removed");
    render();
  } catch (e) {
    toast("Couldn't remove: " + e.message, true);
  }
}

// Swap with the neighbour and renumber 1..n so the order is always clean.
async function moveBlist(id, dir) {
  const all = [...state.blist].sort(byPriority);
  const i = all.findIndex((b) => b.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  const changed = all.map((b, k) => ({ ...b, priority: k + 1 })).filter((b) => state.blist.find((x) => x.id === b.id).priority !== b.priority);
  try {
    (await api.upsertBlist(changed)).forEach((r) => upsertLocal("blist", r));
    render();
  } catch (e) {
    toast("Couldn't move: " + e.message, true);
  }
}

// "Brad Johnson" -> first "Brad", last "Johnson". "Guest of Jane Doe" keeps the plus-one convention.
function splitName(line) {
  const guest = line.match(/^guest of\s+(.+)$/i);
  if (guest) return { first_name: "Guest of", last_name: guest[1].trim() };
  const parts = line.trim().split(/\s+/);
  return parts.length === 1 ? { first_name: parts[0], last_name: "" } : { first_name: parts.slice(0, -1).join(" "), last_name: parts.at(-1) };
}

// Move a B-list entry onto the main list as a new family, then open it so you can fill in the rest.
async function promoteBlist(id) {
  const b = state.blist.find((x) => x.id === id);
  if (!b) return;
  if (!confirm(`Move ${b.family_name} to the main guest list?\n\nThey'll be added as a new family (not contacted yet) and removed from the B-list.`)) return;
  try {
    const fam = await api.insertFamily({
      ...FAMILY_DEFAULTS,
      family_name: b.family_name,
      affiliation: b.affiliation || null,
      city: b.city || "",
      state: b.state || "",
      notes: b.notes || "",
    });
    const names = blistLines(b);
    const rows = (names.length ? names : [b.family_name]).map((line, i) => ({
      ...PERSON_DEFAULTS,
      ...splitName(line),
      family_id: fam.id,
      sort_order: i,
      phone: i === 0 ? b.phone || "" : "",
      email: i === 0 ? b.email || "" : "",
    }));
    upsertLocal("families", fam);
    (await api.insertPeople(rows)).forEach((r) => upsertLocal("people", r));
    await api.deleteBlist(id);
    removeLocal("blist", id);
    if ($("#blist-dialog").open) $("#blist-dialog").close();
    state.search = "";
    $("#search").value = "";
    setTab("main");
    toast(`${b.family_name} moved to the guest list`);
    openFamily(fam.id);
  } catch (e) {
    toast("Couldn't promote: " + e.message, true);
  }
}

// ---------- Export ----------
// Exports exactly what's on screen: the filtered, sorted families with the
// visible columns, plus a People sheet (one row per person, handy for name tags).

function exportExcel() {
  if (!window.XLSX) return toast("Export is still loading, try again in a moment", true);
  const fams = visibleFamilies();
  const famRows = fams.map((f) => Object.fromEntries(state.columns.map((k) => [COL[k].label, colValue(f, k) ?? ""])));
  const peopleRows = visiblePeople(fams).map((p) => ({
    Family: p._family.family_name,
    ...Object.fromEntries(PERSON_FIELDS.map((f) => [f.label, p[f.key] ?? ""])),
    Affiliation: p._family.affiliation ?? "",
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(famRows), "Families");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(peopleRows), "People");
  XLSX.writeFile(wb, `Guest List ${todayIso()}.xlsx`);
}

// ---------- Events ----------

let renderQueued = false;
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function wire() {
  $("#search").addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    render();
  });
  $("#add-family").addEventListener("click", () => openFamily(null));
  $("#add-blist").addEventListener("click", () => openBlist(null));
  $("#open-settings").addEventListener("click", () => setTab(state.tab === "settings" ? "main" : "settings"));
  Settings.wire();
  $("#tabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) setTab(t.dataset.tab);
  });
  $("#blist-view").addEventListener("click", (e) => {
    const t = e.target;
    const f = t.closest("[data-blfilter]");
    if (f) return (state.blistFilter = f.dataset.blfilter), renderBlist();
    const mv = t.closest("[data-blmove]");
    if (mv) return moveBlist(Number(mv.dataset.blmove), Number(mv.dataset.dir));
    const pr = t.closest("[data-blpromote]");
    if (pr) return promoteBlist(Number(pr.dataset.blpromote));
    const row = t.closest("tr[data-bl]");
    if (row) openBlist(Number(row.dataset.bl));
  });
  const bdlg = $("#blist-dialog");
  const onBInput = (e) => {
    const k = e.target.dataset.bf;
    if (k) bdraft[k] = readInput(e.target);
  };
  bdlg.addEventListener("input", (e) => e.target.tagName !== "SELECT" && onBInput(e));
  bdlg.addEventListener("change", (e) => e.target.tagName === "SELECT" && onBInput(e));
  bdlg.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-bclose]")) return bdlg.close();
    if (t.closest("#delete-blist")) return deleteBlist();
    if (t.closest("#promote-blist")) return promoteBlist(bdraft.id);
  });
  $("#blist-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveBlist();
  });
  bdlg.addEventListener("close", () => {
    bdraft = null;
    queueRender();
  });
  $("#export").addEventListener("click", exportExcel);
  $("#sign-out").addEventListener("click", async () => {
    if (DEMO) return toast("Demo mode has no sign-in");
    await sb.auth.signOut();
    location.reload();
  });
  $("#toggle-filters").addEventListener("click", () => {
    state.showFilters = !state.showFilters;
    renderFilters();
  });
  $("#bulk-toggle").addEventListener("click", () => {
    state.bulk = !state.bulk;
    if (!state.bulk) state.selected.clear();
    render();
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.filter) {
      const k = el.dataset.filter;
      const set = new Set(state.filters[k] || []);
      el.checked ? set.add(el.value) : set.delete(el.value);
      state.filters[k] = [...set];
      store("filters", state.filters);
      render();
    } else if (el.dataset.col) {
      const k = el.dataset.col;
      state.columns = el.checked ? COLUMNS.map((c) => c.key).filter((x) => x === k || state.columns.includes(x)) : state.columns.filter((x) => x !== k);
      store("columns-v2", state.columns);
      render();
    } else if (el.dataset.sel) {
      const id = Number(el.dataset.sel);
      el.checked ? state.selected.add(id) : state.selected.delete(id);
      render();
    } else if (el.id === "sel-all") {
      visibleFamilies().forEach((f) => (el.checked ? state.selected.add(f.id) : state.selected.delete(f.id)));
      render();
    } else if (el.id === "bulk-field") {
      state.bulkField = el.value;
      renderBulkBar();
    }
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("#clear-filters, #clear-filters2")) {
      state.filters = {};
      state.search = "";
      $("#search").value = "";
      store("filters", state.filters);
      return render();
    }
    const viewBtn = t.closest("[data-view]");
    if (viewBtn) {
      state.columns = [...VIEWS.find((v) => v.name === viewBtn.dataset.view).cols];
      store("columns-v2", state.columns);
      return render();
    }
    if (t.closest("#reset-cols")) {
      state.columns = [...DEFAULT_COLUMNS];
      store("columns-v2", state.columns);
      return render();
    }
    const sortBtn = t.closest("[data-sort]");
    if (sortBtn) {
      const k = sortBtn.dataset.sort;
      state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : 1 };
      store("sort", state.sort);
      return render();
    }
    const navBtn = t.closest("[data-statnav]");
    if (navBtn) {
      statStart += Number(navBtn.dataset.statnav);
      return drawStats();
    }
    const statBtn = t.closest("[data-stat]");
    if (statBtn) {
      const { stat, val } = statBtn.dataset;
      const cur = state.filters[stat] || [];
      state.filters[stat] = cur.length === 1 && cur[0] === val ? [] : [val];
      store("filters", state.filters);
      return render();
    }
    if (t.closest("#bulk-apply")) return applyBulk();
    if (t.closest("#bulk-clear")) {
      state.selected.clear();
      return render();
    }
    if (t.closest("#bulk-done")) {
      state.bulk = false;
      state.selected.clear();
      return render();
    }
    const row = t.closest("tr[data-fam]");
    if (row && !t.closest("input")) {
      const id = Number(row.dataset.fam);
      if (state.bulk) {
        state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
        return render();
      }
      return openFamily(id);
    }
    // Close open popovers when clicking elsewhere.
    $$("details.ms[open]").forEach((d) => !d.contains(t) && d.removeAttribute("open"));
  });

  const dlg = $("#family-dialog");
  dlg.addEventListener("focusin", (e) => e.target.dataset.combo && (e.target.dataset.prev = e.target.value));
  dlg.addEventListener("input", (e) => e.target.tagName !== "SELECT" && onDialogInput(e));
  dlg.addEventListener("change", (e) => e.target.tagName === "SELECT" && onDialogInput(e));
  dlg.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("[data-close]")) return dlg.close();
    if (t.closest("#delete-family")) return deleteFamily();
    const plusOne = t.closest("#add-plusone");
    if (t.closest("#add-person") || plusOne) {
      const first = draft.people[0] || {};
      const p = plusOne
        ? { ...PERSON_DEFAULTS, first_name: "Guest of", last_name: personName(first) }
        : { ...PERSON_DEFAULTS, last_name: first.last_name || "" };
      ROLLUPS.forEach((k) => {
        const v = rollup(draft.people, k);
        if (v && v !== MULTI) p[k] = v;
      });
      draft.people.push(p);
      renderDialog();
      const body = $(".sheet-body", dlg);
      body.scrollTop = body.scrollHeight;
      $(`[data-p="${draft.people.length - 1}"][data-k="first_name"]`).focus();
      return;
    }
    const rm = t.closest("[data-remove-person]");
    if (rm) {
      const i = Number(rm.dataset.removePerson);
      const [p] = draft.people.splice(i, 1);
      if (p.id) draft.removed.push(p.id);
      renderDialog();
      syncDialog();
    }
  });
  $("#family-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveDialog();
  });
  dlg.addEventListener("close", () => {
    draft = null;
    queueRender();
  });
}

// ---------- Sign-in ----------

function showLogin(msg) {
  $("#app").hidden = true;
  $("#login").hidden = false;
  if (msg) $("#login-msg").textContent = msg;
}

function wireLogin() {
  const allowed = (cfg.allowedEmails || []).map((e) => e.toLowerCase());
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#login-email").value.trim().toLowerCase();
    const msg = $("#login-msg");
    if (allowed.length && !allowed.includes(email)) {
      msg.textContent = "Sorry, this site is private.";
      return;
    }
    msg.textContent = "Sending…";
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) {
      msg.textContent = "Couldn't send the email: " + error.message;
      return;
    }
    msg.textContent = `Sent! Check ${email} for your sign-in link.`;
    $("#code-box").hidden = false;
  });
  $("#verify-code").addEventListener("click", async () => {
    const email = $("#login-email").value.trim().toLowerCase();
    const token = $("#login-code").value.trim();
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    if (error) $("#login-msg").textContent = "That code didn't work: " + error.message;
  });
}

// ---------- Start ----------

async function startApp(email) {
  $("#login").hidden = true;
  $("#app").hidden = false;
  $("#who").textContent = DEMO ? "Demo mode (data stays in this browser)" : `Signed in as ${email}`;
  try {
    const data = await api.load();
    state.families = data.families;
    state.people = data.people;
  } catch (e) {
    toast("Couldn't load guests: " + e.message, true);
  }
  await Settings.loadRemote();
  try {
    state.blist = await api.loadBlist();
  } catch (e) {
    state.blistError = e.message || String(e);
  }
  render();
  api.subscribe((table, p) => {
    if (p.eventType === "DELETE") removeLocal(table, p.old.id);
    else upsertLocal(table, p.new);
    queueRender();
  });
}

wire();
if (DEMO) {
  startApp();
} else {
  wireLogin();
  let started = false;
  sb.auth.onAuthStateChange((_event, session) => {
    if (session && !started) {
      started = true;
      startApp(session.user.email);
    } else if (!session) {
      started = false;
      showLogin();
    }
  });
}
