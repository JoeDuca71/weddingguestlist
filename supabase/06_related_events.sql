-- Related events (Engagement Party, Bachelorette Party, After Party, and any events you add in Settings).
-- Answers for events and fields added later are kept in one jsonb column, so adding an event or field in
-- Settings never needs a database change. Safe to run more than once. Run 05_open_values.sql first.

alter table public.gl_people add column if not exists extra jsonb not null default '{}'::jsonb;

-- After Party RSVP now uses the standard values: Unknown becomes n/a, Likely becomes TBD (Invited).
update public.gl_people set afterparty = 'n/a' where afterparty = 'Unknown';
update public.gl_people set afterparty = 'TBD (Invited)' where afterparty = 'Likely';
alter table public.gl_people alter column afterparty set default 'n/a';
