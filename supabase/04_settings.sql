-- Wedding Guest List: app settings (theme and colors).
-- One row (id = 1) holding the saved look, so everyone who uses this guest list sees the same design.
-- Until this is run, the Settings page still works; the look is just saved on each device.
-- Run this once: SQL Editor > New query > paste > Run. Safe to run again.
-- Reuses the same allowlist and security rules as the rest of the guest list.

create table if not exists public.gl_settings (
  id int primary key check (id = 1),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

drop trigger if exists gl_settings_touch on public.gl_settings;
create trigger gl_settings_touch before update on public.gl_settings
  for each row execute function public.touch_updated_at();

alter table public.gl_settings enable row level security;
drop policy if exists "allowed users" on public.gl_settings;
create policy "allowed users" on public.gl_settings
  for all to authenticated using (public.is_allowed()) with check (public.is_allowed());
