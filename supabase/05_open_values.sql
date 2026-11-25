-- Settings > Fields lets you rename values and add new ones (for example a new Invite status, or a new
-- Affiliation). The database originally only allowed a fixed list of values for these columns, which
-- would reject anything new. This removes those list checks so the Settings page decides what is allowed.
-- Safe to run more than once. Your data is not changed.

do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.gl_families'::regclass, 'public.gl_people'::regclass)
      and pg_get_constraintdef(c.oid) ilike '%ARRAY[%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;

  -- The B-list's affiliation list, if that table exists.
  if to_regclass('public.gl_blist') is not null then
    for r in
      select c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
      where c.contype = 'c'
        and c.conrelid = 'public.gl_blist'::regclass
        and pg_get_constraintdef(c.oid) ilike '%ARRAY[%'
    loop
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    end loop;
  end if;
end $$;
