"use strict";

// ---------- Field definitions ----------

const OPT = {
  rsvp: ["TBD", "Yes", "No", "Maybe"],
  afterparty: ["Unknown", "Yes", "Maybe", "No"],
  table_status: ["Need to Seat", "Seated", "n/a"],
  affiliation: ["Dylan Family", "Dylan Friends", "Joe Family", "Joe Friends", "Mutual"],
  invite_status: ["Not Contacted", "Need to Text for Address", "Texted for Address", "Emailed", "Postcard Sent", "Texted for RSVP", "Done"],
  yesno: ["Yes", "No"],
  hotel_status: ["Unknown", "Maybe Host Hotel", "Yes Host Hotel", "Yes Tracey BnB", "Yes Other Home", "n/a"],
  hotel_swag: ["Need to Do", "Done", "Delivered", "n/a"],
  transportation: ["Self", "Hotel Shuttle", "Tracey BnB Shuttle", "Unknown"],
  role: ["Guest", "Wedding Party", "DJ", "Officiant"],
};
const MULTI = "Multiple";

// Fields stored on each person.
const PERSON_FIELDS = [
  { key: "first_name", label: "First name", type: "text" },
  { key: "last_name", label: "Last name", type: "text" },
  { key: "role", label: "Role", type: "combo", options: OPT.role },
  { key: "invited", label: "Invited (count)", type: "number" },
  { key: "rsvp", label: "RSVP", type: "select", options: OPT.rsvp },
  { key: "rd_invited", label: "Rehearsal dinner invited", type: "number" },
  { key: "rd_status", label: "Rehearsal dinner RSVP", type: "select", options: OPT.rsvp },
  { key: "afterparty", label: "After-party", type: "select", options: OPT.afterparty },
  { key: "afterparty_swag", label: "After-party SWAG", type: "select", options: OPT.afterparty },
  { key: "table_status", label: "Table status", type: "select", options: OPT.table_status },
  { key: "table_number", label: "Table #", type: "text" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "notes", label: "Notes", type: "textarea" },
];
const PF = Object.fromEntries(PERSON_FIELDS.map((f) => [f.key, f]));
const PERSON_GROUPS = [
  { title: "Name", keys: ["first_name", "last_name", "role"] },
  { title: "Wedding", keys: ["invited", "rsvp"] },
  { title: "Rehearsal dinner", keys: ["rd_invited", "rd_status"] },
  { title: "After-party", keys: ["afterparty", "afterparty_swag"] },
  { title: "Seating", keys: ["table_status", "table_number"] },
  { title: "Contact", keys: ["phone", "email"] },
  { title: "", keys: ["notes"] },
];
const PERSON_DEFAULTS = {
  first_name: "", last_name: "", role: "Guest", invited: 1, rsvp: "TBD", rd_invited: 0, rd_status: "TBD",
  afterparty: "Unknown", afterparty_swag: "Unknown", table_status: "Need to Seat", table_number: "", phone: "", email: "", notes: "",
};

// Fields stored on the family.
const FAMILY_FIELDS = [
  { key: "family_name", label: "Family name", type: "text", hint: "How we address them, e.g. The Brad Johnson Family" },
  { key: "affiliation", label: "Affiliation", type: "select", options: OPT.affiliation, blank: true },
  { key: "invite_status", label: "Invite status", type: "select", options: OPT.invite_status },
  { key: "live_in_town", label: "Live in town?", type: "select", options: OPT.yesno, blank: true },
  { key: "hotel_status", label: "Hotel", type: "select", options: OPT.hotel_status },
  { key: "hotel_swag", label: "Hotel SWAG bag", type: "select", options: OPT.hotel_swag },
  { key: "transportation", label: "Transportation", type: "select", options: OPT.transportation },
  { key: "address", label: "Address", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "zip", label: "Zip", type: "text" },
  { key: "gift", label: "Gift", type: "textarea" },
  { key: "thank_you_sent", label: "Thank-you sent?", type: "select", options: OPT.yesno },
  { key: "notes", label: "Notes", type: "textarea" },
];
const FF = Object.fromEntries(FAMILY_FIELDS.map((f) => [f.key, f]));
const FAMILY_DEFAULTS = {
  family_name: "", affiliation: null, invite_status: "Not Contacted", live_in_town: null, hotel_status: "Unknown",
  hotel_swag: "Need to Do", transportation: "Unknown", address: "", city: "", state: "", zip: "", gift: "", thank_you_sent: "No", notes: "",
};

// Person fields that roll up to the family: same value for everyone, or "Multiple".
// Setting one on the family copies it down to the people.
const ROLLUPS = ["rsvp", "rd_status", "afterparty", "afterparty_swag", "table_status", "table_number"];
const ROLLUP_LABEL = { rsvp: "RSVP", rd_status: "Rehearsal dinner", afterparty: "After-party", afterparty_swag: "After-party SWAG", table_status: "Table status", table_number: "Table #" };

// Groups in the edit dialog. Rollup keys are shown as family-level controls.
const FAMILY_GROUPS = [
  { title: "Family", keys: ["family_name", "affiliation"] },
  { title: "Invite & RSVP", keys: ["invite_status", "rsvp", "rd_status"] },
  { title: "Travel & stay", keys: ["live_in_town", "hotel_status", "hotel_swag", "transportation"] },
  { title: "After-party", keys: ["afterparty", "afterparty_swag"] },
  { title: "Seating", keys: ["table_status", "table_number"] },
  { title: "Address", keys: ["address", "city", "state", "zip"] },
  { title: "Gifts & notes", keys: ["gift", "thank_you_sent", "notes"] },
];

// Columns the main list can show. Everything is per family.
const sum = (arr, k) => arr.reduce((n, p) => n + (Number(p[k]) || 0), 0);
const uniqJoin = (arr) => [...new Set(arr.filter(Boolean))].join(", ");
const COLUMNS = [
  { key: "family_name", label: "Family", fixed: true },
  { key: "people", label: "People", get: (f) => f.people.map(personName).join(", ") },
  { key: "party", label: "Invited", num: true, get: (f) => sum(f.people, "invited") },
  { key: "attending", label: "Coming", num: true, get: (f) => sum(f.people.filter((p) => p.rsvp === "Yes"), "invited") },
  { key: "affiliation", label: "Affiliation" },
  { key: "rsvp", label: "RSVP", pill: true },
  { key: "invite_status", label: "Invite status", pill: true },
  { key: "rd_invited", label: "Rehearsal invited", num: true, get: (f) => sum(f.people, "rd_invited") },
  { key: "rd_status", label: "Rehearsal RSVP", pill: true },
  { key: "live_in_town", label: "In town?" },
  { key: "hotel_status", label: "Hotel", pill: true },
  { key: "hotel_swag", label: "SWAG bag", pill: true },
  { key: "transportation", label: "Transport" },
  { key: "afterparty", label: "After-party", pill: true },
  { key: "afterparty_swag", label: "After-party SWAG", pill: true },
  { key: "table_status", label: "Table status", pill: true },
  { key: "table_number", label: "Table #" },
  { key: "roles", label: "Roles", get: (f) => uniqJoin(f.people.map((p) => p.role).filter((r) => r !== "Guest")) },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "phones", label: "Phone", get: (f) => uniqJoin(f.people.map((p) => p.phone)) },
  { key: "emails", label: "Email", get: (f) => uniqJoin(f.people.map((p) => p.email)) },
  { key: "gift", label: "Gift" },
  { key: "thank_you_sent", label: "Thank-you sent" },
  { key: "notes", label: "Notes" },
];
const COL = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
const DEFAULT_COLUMNS = ["family_name", "people", "party", "affiliation", "rsvp", "invite_status", "live_in_town", "hotel_status", "state"];

// Filters above the list. Person-level filters match a family when ANY of its
// people match, and also narrow which people go into the People export.
const BLANK = "__blank__";
const FILTERS = [
  { key: "rsvp", label: "RSVP", person: true, options: OPT.rsvp },
  { key: "affiliation", label: "Affiliation", options: OPT.affiliation, blank: true },
  { key: "live_in_town", label: "In town?", options: OPT.yesno, blank: true },
  { key: "invite_status", label: "Invite status", options: OPT.invite_status },
  { key: "hotel_status", label: "Hotel", options: OPT.hotel_status },
  { key: "rd_inv", label: "Rehearsal invited", person: true, options: OPT.yesno, get: (p) => (Number(p.rd_invited) > 0 ? "Yes" : "No") },
  { key: "rd_status", label: "Rehearsal RSVP", person: true, options: OPT.rsvp, onlyInvited: true },
  { key: "afterparty", label: "After-party", person: true, options: OPT.afterparty },
  { key: "table_status", label: "Table status", person: true, options: OPT.table_status },
  { key: "role", label: "Role", person: true },
  { key: "state", label: "State", blank: true },
];

// Multi-edit can change any of these on many families at once.
const BULK_FIELDS = [
  ...["affiliation", "invite_status", "live_in_town", "hotel_status", "hotel_swag", "transportation", "thank_you_sent"].map((k) => ({ ...FF[k], scope: "family" })),
  ...ROLLUPS.map((k) => ({ ...PF[k], label: ROLLUP_LABEL[k] + " (everyone)", scope: "people" })),
  ...["city", "state", "gift", "notes"].map((k) => ({ ...FF[k], type: "text", scope: "family" })),
];

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
  const pool = key === "rd_status" ? people.filter((p) => Number(p.rd_invited) > 0) : people;
  if (!pool.length) return "";
  const vals = new Set(pool.map((p) => p[key] ?? ""));
  return vals.size === 1 ? [...vals][0] : MULTI;
}
// Which people a family-level change to `key` applies to.
const targetsFor = (people, key) => (key === "rd_status" ? people.filter((p) => Number(p.rd_invited) > 0) : people);

// Everyone has answered Yes or No → invite is Done.
const allAnswered = (people) => people.length > 0 && people.every((p) => p.rsvp === "Yes" || p.rsvp === "No");
// Living in town fills in the travel fields.
const IN_TOWN = { hotel_status: "n/a", hotel_swag: "n/a", transportation: "Self" };

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
  return {
    load: async () => ({ families: await all("gl_families"), people: await all("gl_people") }),
    insertFamily: async (row) => check(await sb.from("gl_families").insert(strip(row)).select().single()),
    updateFamilies: async (ids, patch) => check(await sb.from("gl_families").update(patch).in("id", ids).select()),
    deleteFamily: async (id) => check(await sb.from("gl_families").delete().eq("id", id)),
    insertPeople: async (rows) => (rows.length ? check(await sb.from("gl_people").insert(rows.map(strip)).select()) : []),
    upsertPeople: async (rows) => (rows.length ? check(await sb.from("gl_people").upsert(rows.map(strip)).select()) : []),
    updatePeople: async (ids, patch) => (ids.length ? check(await sb.from("gl_people").update(patch).in("id", ids).select()) : []),
    deletePeople: async (ids) => (ids.length ? check(await sb.from("gl_people").delete().in("id", ids)) : null),
    subscribe(onChange) {
      sb.channel("guests")
        .on("postgres_changes", { event: "*", schema: "public", table: "gl_families" }, (p) => onChange("families", p))
        .on("postgres_changes", { event: "*", schema: "public", table: "gl_people" }, (p) => onChange("people", p))
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
    subscribe() {},
  };
}

// ---------- State ----------

const state = {
  families: [],
  people: [],
  filters: store("filters") || {},
  search: "",
  columns: (store("columns") || DEFAULT_COLUMNS).filter((k) => COL[k]),
  sort: store("sort") || { key: "family_name", dir: 1 },
  showFilters: false,
  bulk: false,
  selected: new Set(),
  bulkField: "hotel_status",
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
    if (def.onlyInvited && !(Number(p.rd_invited) > 0)) return false;
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
  const fams = visibleFamilies();
  renderStats();
  renderFilters();
  renderColumnPicker();
  renderList(fams);
  renderBulkBar();
  const total = state.families.length;
  $("#count").textContent = fams.length === total ? `${total} families` : `${fams.length} of ${total} families`;
}

function pill(v) {
  if (v === "" || v == null) return `<span class="muted">—</span>`;
  return `<span class="pill v-${slug(v)}">${esc(v)}</span>`;
}
function cellHtml(f, key) {
  const c = COL[key];
  const v = colValue(f, key);
  if (key === "family_name") return `<strong>${esc(v)}</strong>`;
  if (c.pill) return pill(v);
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
function renderStats() {
  const n = (v) => v || 0;
  const on = (key, val) => state.filters[key]?.length === 1 && state.filters[key][0] === val;
  // A number you can click to filter the list to that value (click again to clear).
  const chip = (key, val, count, label, big) =>
    `<button type="button" class="sv ${big ? "big" : ""} ${on(key, val) ? "on" : ""}" data-stat="${key}" data-val="${esc(val)}" title="Show only ${esc(label)}">${count}<small> ${esc(label)}</small></button>`;

  const rsvp = withoutFilter("rsvp", (fams) => {
    const people = visiblePeople(fams);
    return { t: tally(people, "rsvp", "invited"), invited: sum(people, "invited") };
  });
  const rd = withoutFilter("rd_status", (fams) => {
    const people = visiblePeople(fams).filter((p) => Number(p.rd_invited) > 0);
    return { t: tally(people, "rd_status", "rd_invited"), invited: sum(people, "rd_invited") };
  });
  const hotel = withoutFilter("hotel_status", (fams) => ({
    yes: fams.filter((f) => f.hotel_status === "Yes Host Hotel").length,
    maybe: fams.filter((f) => f.hotel_status === "Maybe Host Hotel").length,
  }));
  const ap = withoutFilter("afterparty", (fams) => tally(visiblePeople(fams), "afterparty", "invited"));
  const filtered = activeFilterCount() || state.search;
  const rest = (key, t, vals) => vals.map(([v, l]) => chip(key, v, n(t[v]), l)).join(" · ");
  $("#stats").innerHTML = `
    <div class="stat s-rsvp">
      <span>RSVP${filtered ? " (this view)" : ""}</span>
      <strong>${chip("rsvp", "Yes", n(rsvp.t.Yes), "yes", true)} <small>of ${rsvp.invited} invited</small></strong>
      <em>${rest("rsvp", rsvp.t, [["No", "no"], ["Maybe", "maybe"], ["TBD", "TBD"]])}</em>
    </div>
    <div class="stat s-rd">
      <span>Rehearsal dinner</span>
      <strong>${chip("rd_status", "Yes", n(rd.t.Yes), "yes", true)} <small>of ${rd.invited} invited</small></strong>
      <em>${rest("rd_status", rd.t, [["No", "no"], ["Maybe", "maybe"], ["TBD", "TBD"]])}</em>
    </div>
    <div class="stat s-hotel">
      <span>Host Hotel (families)</span>
      <strong>${chip("hotel_status", "Yes Host Hotel", hotel.yes, "yes", true)} · ${chip("hotel_status", "Maybe Host Hotel", hotel.maybe, "maybe", true)}</strong>
      <em>${hotel.yes + hotel.maybe} rooms if every maybe comes</em>
    </div>
    <div class="stat s-ap">
      <span>After-party</span>
      <strong>${chip("afterparty", "Yes", n(ap.Yes), "yes", true)}</strong>
      <em>${rest("afterparty", ap, [["Maybe", "maybe"], ["No", "no"], ["Unknown", "unknown"]])}</em>
    </div>`;
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

function renderColumnPicker() {
  $("#column-list").innerHTML =
    COLUMNS.map(
      (c) => `<label><input type="checkbox" data-col="${c.key}" ${state.columns.includes(c.key) ? "checked" : ""} ${c.fixed ? "disabled" : ""}> ${esc(c.label)}</label>`
    ).join("") + `<button class="linkish" id="reset-cols">Reset to defaults</button>`;
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
  if (f.type === "textarea") return `<textarea rows="2" ${attrs}>${esc(v)}</textarea>`;
  if (f.type === "number") return `<input type="number" min="0" step="1" inputmode="numeric" value="${esc(v)}" ${attrs}>`;
  return `<input type="${f.type === "tel" ? "tel" : f.type === "email" ? "email" : "text"}" value="${esc(v)}" ${attrs}>`;
}
function readInput(el) {
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
    if (key === "rd_status" && !draft.people.some((p) => Number(p.rd_invited) > 0))
      return `<label class="field"><span>${label}</span><input disabled value="Nobody invited" data-roll="${key}"></label>`;
    const ctl =
      pf.type === "select"
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
        ${FAMILY_GROUPS.map((g) => `<fieldset class="fgroup"><legend>${esc(g.title)}</legend><div class="form-grid">${g.keys.map(familyFieldHtml).join("")}</div></fieldset>`).join("")}
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
  const rdEl = $('[data-roll="rd_status"]');
  if (rdEl && rdEl.disabled === draft.people.some((p) => Number(p.rd_invited) > 0)) renderDialog();
  for (const key of ROLLUPS) {
    const el = $(`[data-roll="${key}"]`);
    if (!el || el.disabled) continue;
    const val = rollup(draft.people, key);
    if (el.tagName === "SELECT") el.innerHTML = optionsHtml(PF[key].options, val, { multi: true });
    else (el.value = val === MULTI ? "" : val), (el.placeholder = val === MULTI ? "Multiple" : "");
  }
  if (allAnswered(draft.people) && draft.family.invite_status !== "Done") setFamilyField("invite_status", "Done");
  $$(".person").forEach((card) => ($(".pname", card).textContent = personName(draft.people[card.dataset.pi])));
  if (!draft.nameTouched) {
    draft.family.family_name = suggestFamilyName(draft.people);
    $('[data-f="family_name"]').value = draft.family.family_name;
  }
}
function setFamilyField(key, v) {
  draft.family[key] = v;
  const el = $(`[data-f="${key}"]`);
  if (el) el.value = v ?? "";
}

function onDialogInput(e) {
  const el = e.target;
  if (el.dataset.f) {
    draft.family[el.dataset.f] = readInput(el);
    if (el.dataset.f === "family_name") draft.nameTouched = el.value.trim() !== "";
    if (el.dataset.f === "live_in_town" && el.value === "Yes") Object.entries(IN_TOWN).forEach(([k, v]) => setFamilyField(k, v));
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
const OPT_VALUES = new Set(Object.values(OPT).flat());

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
      store("columns", state.columns);
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
    if (t.closest("#reset-cols")) {
      state.columns = [...DEFAULT_COLUMNS];
      store("columns", state.columns);
      return render();
    }
    const sortBtn = t.closest("[data-sort]");
    if (sortBtn) {
      const k = sortBtn.dataset.sort;
      state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : 1 };
      store("sort", state.sort);
      return render();
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
    $$("details[open]").forEach((d) => !d.contains(t) && d.removeAttribute("open"));
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
        if (v && v !== MULTI && k !== "rd_status") p[k] = v;
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
