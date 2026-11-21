"""Turn Joe's guest list spreadsheet into supabase/02_import.sql (and a demo JSON).

Usage: python3 -I scripts/excel_to_sql.py <guest list.xlsx> <out.sql> [demo.json]
One spreadsheet row = one family; First/Last Name 1-4 become its people.
"""
import json, re, sys
import openpyxl

src, out = sys.argv[1], sys.argv[2]
demo_out = sys.argv[3] if len(sys.argv) > 3 else None
ws = openpyxl.load_workbook(src, data_only=True).active
rows = list(ws.iter_rows(values_only=True))
H = [str(h).strip() if h else "" for h in rows[0]]
col = lambda r, name: r[H.index(name)]

def clean(v):
    if v is None:
        return ""
    s = re.sub(r"[​-‏‪-‮⁦-⁩]", "", str(v)).strip()
    return s

AFFIL = {"Dylan Friend": "Dylan Friends", "Joe Friend": "Joe Friends"}
INVITE = {"Can't Attend": "Done", "Emailed (S Africa)": "Emailed"}
INVITE_OK = ["Not Contacted", "Need to Text for Address", "Texted for Address", "Emailed", "Postcard Sent", "Texted for RSVP", "Done"]
TOWN = {"in": "Yes", "out": "No"}

families, warnings = [], []
for r in rows[1:]:
    names = []
    for i in range(1, 5):
        fn, ln = clean(col(r, f"First Name {i}")), clean(col(r, f"Last Name {i}"))
        if fn or ln:
            names.append((fn, ln))
    if not names:
        if any(v not in (None, "") for v in r):
            warnings.append(f"Skipped a row with no names: {[v for v in r if v not in (None, '')]}")
        continue
    fam_name = clean(col(r, "Family Name")) or " & ".join(f"{a} {b}".strip() for a, b in names)
    first_full = f"{names[0][0]} {names[0][1]}".strip()

    notes = []
    invite_raw = clean(col(r, "Invite Status"))
    invite = INVITE.get(invite_raw, invite_raw) or "Not Contacted"
    if invite_raw == "Emailed (S Africa)":
        notes.append("Lives in South Africa (emailed)")
    if invite not in INVITE_OK:
        warnings.append(f"{fam_name}: unknown invite status {invite_raw!r}, set to Not Contacted")
        invite = "Not Contacted"
    rsvp = clean(col(r, "RSVP Status")) or "TBD"
    if invite_raw == "Can't Attend":
        rsvp = "No"
    affil = AFFIL.get(clean(col(r, "Affiliation")), clean(col(r, "Affiliation"))) or None
    if not affil:
        warnings.append(f"{fam_name}: no affiliation")
    town = TOWN.get(clean(col(r, "InTown?")).lower())
    street, apt = clean(col(r, "Street Address")), clean(col(r, "Apartment"))
    if apt and apt.isdigit():
        apt = "#" + apt
    zip_ = clean(col(r, "Zip"))
    if zip_.isdigit() and len(zip_) < 5:
        zip_ = zip_.zfill(5)

    # People: named people first, "GUEST" placeholders and extra invites become "Guest of <first person>".
    people = []
    for fn, ln in names:
        if fn.upper() == "GUEST" and ln.upper() in ("GUEST", ""):
            people.append({"first_name": "Guest of", "last_name": first_full, "plus": True})
        else:
            people.append({"first_name": fn, "last_name": ln, "plus": False})
    invited = int(col(r, "Invited") or len(people))
    rd_invited = int(col(r, "Rehearsal Dinner Invited") or 0)
    while len(people) < max(invited, rd_invited):
        people.append({"first_name": "Guest of", "last_name": first_full, "plus": True})
        warnings.append(f"{fam_name}: invited {max(invited, rd_invited)} but listed {len(names)} name(s), added a plus-one")
    if invited < len(people):
        warnings.append(f"{fam_name}: invited {invited} but listed {len(people)} people; kept everyone at 1 each (family total now {len(people)})")

    # Roles: "Kevin: Dylan's Groomsman; Nick: Bubble Boy" goes to the named people, a plain role to everyone named.
    role_raw = clean(col(r, "Role")) or "Guest"
    by_name = {}
    if ":" in role_raw:
        for part in role_raw.split(";"):
            if ":" in part:
                who, what = part.split(":", 1)
                by_name[who.strip().lower()] = what.strip()
    for i, p in enumerate(people):
        if p["plus"]:
            p["role"] = "Guest"
        elif by_name:
            p["role"] = by_name.get(p["first_name"].lower(), "Guest")
        else:
            p["role"] = role_raw
        p["invited"] = 1
        p["rsvp"] = rsvp
        p["rd_invited"] = 1 if i < rd_invited else 0
        p["rd_status"] = (clean(col(r, "Rehearsal Dinner Status")) or "TBD") if p["rd_invited"] else "TBD"
        p["afterparty"] = clean(col(r, "After-Party Status")) or "Unknown"
        p["afterparty_swag"] = clean(col(r, "After-Party SWAG")) or "Unknown"
        p["table_status"] = clean(col(r, "Table Status")) or "Need to Seat"
        p["table_number"] = clean(col(r, "Table Number"))
        p["phone"] = clean(col(r, "PHONE")) if i == 0 else clean(col(r, "Phone 2")) if i == 1 else ""
        p["email"] = clean(col(r, "Email 1")) if i == 0 else clean(col(r, "Email 2")) if i == 1 else ""
    unmatched = set(by_name) - {p["first_name"].lower() for p in people}
    if unmatched:
        warnings.append(f"{fam_name}: role names not found: {unmatched}")
    if all(p["rsvp"] in ("Yes", "No") for p in people):
        invite = "Done"

    families.append({
        "family_name": fam_name, "affiliation": affil, "invite_status": invite, "live_in_town": town,
        "hotel_status": clean(col(r, "Hotel Status")) or ("n/a" if town == "Yes" else "Unknown"),
        "hotel_swag": clean(col(r, "Hotel SWAG Bag Status")) or ("n/a" if town == "Yes" else "Need to Do"),
        "transportation": clean(col(r, "Transportation Status")) or ("Self" if town == "Yes" else "Unknown"),
        "address": ", ".join(x for x in (street, apt) if x), "city": clean(col(r, "City")),
        "state": clean(col(r, "State")).upper(), "zip": zip_, "notes": "; ".join(notes),
        "people": [{k: v for k, v in p.items() if k != "plus"} for p in people],
    })

def q(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"

FCOLS = ["family_name", "affiliation", "invite_status", "live_in_town", "hotel_status", "hotel_swag", "transportation", "address", "city", "state", "zip", "notes"]
PCOLS = ["sort_order", "first_name", "last_name", "role", "invited", "rsvp", "rd_invited", "rd_status", "afterparty", "afterparty_swag", "table_status", "table_number", "phone", "email"]
lines = [
    "-- Wedding Guest List: load Joe's spreadsheet (generated by scripts/excel_to_sql.py).",
    f"-- {len(families)} families, {sum(len(f['people']) for f in families)} people.",
    "-- Run AFTER 01_schema.sql. It refuses to run if the guest list already has families.",
    "",
    "-- Allow the extra values the spreadsheet uses (same as the end of 01_schema.sql).",
    "alter table public.gl_families drop constraint if exists gl_families_invite_status_check;",
    "alter table public.gl_families add constraint gl_families_invite_status_check",
    "  check (invite_status in ('Not Contacted', 'Need to Text for Address', 'Texted for Address', 'Emailed', 'Postcard Sent', 'Texted for RSVP', 'Done'));",
    "alter table public.gl_people drop constraint if exists gl_people_afterparty_check;",
    "alter table public.gl_people add constraint gl_people_afterparty_check check (afterparty in ('Unknown', 'Yes', 'Maybe', 'No'));",
    "alter table public.gl_people drop constraint if exists gl_people_afterparty_swag_check;",
    "alter table public.gl_people add constraint gl_people_afterparty_swag_check check (afterparty_swag in ('Unknown', 'Yes', 'Maybe', 'No'));",
    "",
    "do $$",
    "begin",
    "  if exists (select 1 from public.gl_families) then",
    "    raise exception 'The guest list already has families, so the import was skipped to avoid duplicates.';",
    "  end if;",
    "end $$;",
    "",
]
for f in families:
    fv = ", ".join(q(f[c]) for c in FCOLS)
    pv = ",\n    ".join("(" + ", ".join(q(i if c == "sort_order" else p[c]) for c in PCOLS) + ")" for i, p in enumerate(f["people"]))
    lines.append(
        f"with f as (insert into public.gl_families ({', '.join(FCOLS)}) values ({fv}) returning id)\n"
        f"insert into public.gl_people (family_id, {', '.join(PCOLS)})\n"
        f"select f.id, v.* from f, (values\n    {pv}\n) as v({', '.join(PCOLS)});\n"
    )
open(out, "w").write("\n".join(lines))
if demo_out:
    json.dump(families, open(demo_out, "w"), indent=1)
print(f"{len(families)} families, {sum(len(f['people']) for f in families)} people")
print("\n".join(warnings))
