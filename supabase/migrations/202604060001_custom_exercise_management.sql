begin;

alter table public.exercises
  add column if not exists is_custom boolean not null default false;

create unique index if not exists exercises_user_muscle_lower_name_unique_idx
  on public.exercises (user_id, muscle_group_id, lower(btrim(name)));

commit;
