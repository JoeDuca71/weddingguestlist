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
- Changes show up live for both of you.

## How it's built

- `app/` is the whole website: plain HTML, CSS and JavaScript, no build step. Same stack and theme as the to-do app.
- `supabase/01_schema.sql` creates `gl_families`, `gl_people` and `gl_views` (saved column presets, for later)
  in the to-do app's Supabase project, reusing its allowlist and security rules.

## One-time setup

1. **Database:** in Supabase, open **SQL Editor > New query**, paste all of `supabase/01_schema.sql`, and click **Run**.
2. **Website:** in Vercel, **Add New > Project**, pick **weddingguestlist**, leave the settings as they are, and click **Deploy**.
3. **Sign-in:** in Supabase, **Authentication > URL Configuration > Redirect URLs**, add the new Vercel address followed by `/**`
   (keep the to-do app's entries; leave Site URL as it is).

## Trying it without signing in
Open the site with `?demo` on the end. Demo mode uses made-up guests, keeps changes only in that browser, and never touches the real data.
