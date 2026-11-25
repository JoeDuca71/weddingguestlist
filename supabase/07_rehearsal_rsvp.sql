-- Rehearsal Dinner now uses the standard event RSVP values (n/a, TBD (Invited), Yes, No, Maybe).
-- Everyone starts as n/a; update who is invited with Multi-edit in the app.
-- Run once (running it again would reset the answers to n/a). Run 05_open_values.sql first.

update public.gl_people set rd_status = 'n/a';
alter table public.gl_people alter column rd_status set default 'n/a';
