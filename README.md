# Wedding Guest List

A private guest list for the wedding, for laptops and phones. Only joe@capriogroup.com and
dtracey809@gmail.com can sign in (same allowlist as the Wedding To-Do app).

- **Families** are the rows of the main list (e.g. "Sue & Chris Tracey"). Each family holds its **people**.
- RSVP, rehearsal dinner, after-party and table fields live on each person and **roll up** to the family:
  everyone the same shows that value, otherwise **Multiple**. Changing one on the family sets everyone.
- Auto-rules: when everyone has answered Yes or No, Invite status becomes **Done**. Setting **Live in town?**
  to Yes sets Hotel and SWAG bag to n/a and Transportation to Self (you can still change them).
- Search, filters, sortable and selectable columns (remembered per device), and stats at the top
  (RSVP and rehearsal dinner vs invited, Host Hotel yes/maybe, after-party). Stats follow the filters.
- **Multi-edit**: select several families and set one field on all of them.
- **Export** downloads exactly what's on screen: a Families sheet with your columns, and a People sheet
  (one row per person, good for name tags).
- **B-list** tab: people we haven't contacted yet and may or may not ever invite. Reorder with the arrows
  (higher = invite sooner), and see declined guests next to who's waiting, by affiliation. **Promote** moves
  someone onto the main list as a new family (not contacted yet) and removes them from the B-list.
- Changes show up live for both of you.

## How it's built

- `app/` is the whole website: plain HTML, CSS and JavaScript, no build step. Same stack and theme as the to-do app.
- `supabase/01_schema.sql` creates `gl_families`, `gl_people` and `gl_views` (saved column presets, for later)
  in the to-do app's Supabase project, reusing its allowlist and security rules.
- `supabase/03_blist.sql` adds the `gl_blist` table for the B-list.
- `supabase/04_settings.sql` adds the `gl_settings` table (saved theme and colors).
- `supabase/07_rehearsal_rsvp.sql` moves Rehearsal Dinner to the standard RSVP values (everyone n/a). Run once.
- `supabase/08_family_extra.sql` adds an `extra` jsonb column to `gl_families` (Apartment/Unit, Country and any field you add to a Family section). Run once.
- `supabase/05_open_values.sql` removes the fixed value lists from the database so Settings > Fields can add and rename values.
- `app/fields.js` holds the built-in fields and their defaults; the Fields settings are stored as overrides on top of them.
- `app/theme.js` is the theme engine (themes, background patterns, color math); `app/settings.js` is the Settings page.

## Settings and themes

The **⚙** button opens Settings. **Design** lets you pick a theme (Floral, Formal, Country, Beach, Disco), which sets the
background pattern, header, heading font, accent and four status colors: **Color 1 / Done**, **Color 2 / In process**, **Color 3 / To do** and **Color 4 / Unknown**.
Each color has a color picker and a hex box, and the soft background and readable text color for status pills are worked out
from the one color you pick, so any color stays legible (including in dark mode). Run `supabase/04_settings.sql` once so the
look is shared with everyone; until then it is saved on each device.

### Fields

**Fields** (in Settings) lists every field for **Family** and for **People**, grouped into sections you can rename. Each field can be
switched off (hidden everywhere, data kept), renamed, moved to another section, and given a type: Text, Long text, Drop Down,
Checkbox, Multi-Select (Number is fixed for the count fields). Drop downs, checkboxes and multi-selects have a list of values, and
each value gets a color: Color 1 / Done, Color 2 / In process, Color 3 / To do, Color 4 / Unknown, Accent, Muted or plain (the drop downs show each color). Renaming a value that guests already use offers to
update them. A few values (marked 🔒) drive the app's automatic rules (RSVP Yes/No, Invite status Done, Live in town Yes, "n/a" and
"Self" travel values) and can be recolored but not renamed or removed. Run `supabase/05_open_values.sql` once, or new or renamed
values will be rejected by the database. Every section has an **Add Field** button for brand-new fields (stored in `extra`; run `supabase/06` and `08`). Names are limited to 50 characters. Affiliation values pick their partner from a drop down. Drag the ⠿ handle to reorder fields within a section, or values within a field (desktop; touch screens can't drag yet). A People field you add can also be shown on the family form ("Also show on the family form"). On the Family tab, People fields that also show on the family form appear as read-only "auto" cards.

### Related events

Settings > Fields > **Related events** lists events that go with the wedding: Engagement Party, Bachelorette Party, Bachelor Party,
Rehearsal Dinner, After Party and Post-Wedding Brunch (each can be switched on or off), plus any you add. An enabled event adds its
RSVP (n/a, TBD (Invited), Yes, No, Maybe) to every person and to the family form under Related Events, and can have extra fields of
its own. Answers for the newer events and fields are stored in one `extra` jsonb column on `gl_people`, so run
`supabase/06_related_events.sql` once (after 05) before using them. It also changes the After Party values: Unknown becomes n/a and
Likely becomes TBD (Invited).

## B-list setup

Run `supabase/03_blist.sql` once in the Supabase SQL Editor. Until you do, the rest of the site works
normally and the B-list tab tells you it needs setting up.

## Loading the guest list

`scripts/excel_to_sql.py` turns the guest spreadsheet into `supabase/02_import.sql`
(`python3 scripts/excel_to_sql.py "Guest List.xlsx" supabase/02_import.sql`). Run that file once in the
Supabase SQL Editor after the schema. It refuses to run twice. The generated file holds guests' personal
details, so it is git-ignored and never committed.

## One-time setup

1. **Database:** in Supabase, open **SQL Editor > New query**, paste all of `supabase/01_schema.sql`, and click **Run**.
2. **Website:** in Vercel, **Add New > Project**, pick **weddingguestlist**, leave the settings as they are, and click **Deploy**.
3. **Sign-in:** in Supabase, **Authentication > URL Configuration > Redirect URLs**, add the new Vercel address followed by `/**`
   (keep the to-do app's entries; leave Site URL as it is).

## Trying it without signing in
Open the site with `?demo` on the end. Demo mode uses made-up guests, keeps changes only in that browser, and never touches the real data.
