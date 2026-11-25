-- Extra family fields (Apartment/Unit, Country, and any field you add to a Family section in Settings).
-- Answers are kept in one jsonb column, so adding a field never needs a database change.
-- Safe to run more than once.

alter table public.gl_families add column if not exists extra jsonb not null default '{}'::jsonb;
