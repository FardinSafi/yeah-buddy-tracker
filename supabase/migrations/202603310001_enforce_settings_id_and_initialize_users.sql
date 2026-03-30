-- Enforce canonical app_settings schema and initialize default user data automatically.
begin;

-- Ensure app_settings has canonical id column and composite primary key.
do $$
declare
  existing_pk_name text;
begin
  -- Add id column if it doesn't exist
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_settings'
      and column_name = 'id'
  ) then
    alter table public.app_settings add column id text;
  end if;

  -- Set existing null ids to 'settings'
  update public.app_settings
  set id = 'settings'
  where id is null;

  -- Make id column NOT NULL with default
  alter table public.app_settings
    alter column id set default 'settings',
    alter column id set not null;

  -- Deduplicate: Keep only one row per (user_id, id)
  -- Prefer the most recently updated row, fallback to newer physical row (ctid)
  with ranked as (
    select
      ctid,
      row_number() over (
        partition by user_id, id
        order by updated_at desc nulls last, ctid desc
      ) as rn
    from public.app_settings
  )
  delete from public.app_settings target
  using ranked
  where target.ctid = ranked.ctid
    and ranked.rn > 1;

  -- Drop existing primary key if any
  select conname
  into existing_pk_name
  from pg_constraint
  where conrelid = 'public.app_settings'::regclass
    and contype = 'p'
  limit 1;

  if existing_pk_name is not null then
    execute format('alter table public.app_settings drop constraint %I', existing_pk_name);
  end if;

  -- Add composite primary key (user_id, id)
  alter table public.app_settings
    add constraint app_settings_pkey primary key (user_id, id);
end $$;

-- Idempotent initializer that can be called from triggers or RPC.
create or replace function public.initialize_user_defaults(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  -- Insert default muscle groups
  insert into public.muscle_groups (id, user_id, name, weekly_target_kg, accent_color)
  values
    ('chest', target_user_id, 'Chest', 25000, '#D4AF37'),
    ('back', target_user_id, 'Back', 35000, '#B91C1C'),
    ('shoulders', target_user_id, 'Shoulders', 18000, '#D4AF37'),
    ('legs', target_user_id, 'Legs', 40000, '#B91C1C'),
    ('arms', target_user_id, 'Arms', 15000, '#D4AF37')
  on conflict (user_id, id) do nothing;

  -- Insert default exercises
  insert into public.exercises (id, user_id, name, muscle_group_id)
  values
    ('chest-bench-press', target_user_id, 'Barbell Bench Press', 'chest'),
    ('chest-incline-bench', target_user_id, 'Incline Barbell Bench', 'chest'),
    ('chest-decline-bench', target_user_id, 'Decline Bench Press', 'chest'),
    ('chest-db-press', target_user_id, 'Dumbbell Flat Press', 'chest'),
    ('chest-incline-db-press', target_user_id, 'Incline Dumbbell Press', 'chest'),
    ('chest-cable-fly', target_user_id, 'Cable Fly', 'chest'),
    ('chest-pec-deck', target_user_id, 'Pec Deck Fly', 'chest'),
    ('chest-machine-press', target_user_id, 'Machine Chest Press', 'chest'),
    ('chest-smith-bench', target_user_id, 'Smith Machine Bench', 'chest'),
    ('chest-push-up', target_user_id, 'Push-Up', 'chest'),
    ('chest-weighted-dip', target_user_id, 'Weighted Dips', 'chest'),
    ('chest-floor-press', target_user_id, 'Barbell Floor Press', 'chest'),
    ('chest-guillotine-press', target_user_id, 'Guillotine Press', 'chest'),
    ('chest-squeeze-press', target_user_id, 'Dumbbell Squeeze Press', 'chest'),
    ('back-deadlift', target_user_id, 'Conventional Deadlift', 'back'),
    ('back-barbell-row', target_user_id, 'Barbell Row', 'back'),
    ('back-yates-row', target_user_id, 'Yates Row', 'back'),
    ('back-tbar-row', target_user_id, 'T-Bar Row', 'back'),
    ('back-seated-row', target_user_id, 'Seated Cable Row', 'back'),
    ('back-lat-pulldown', target_user_id, 'Wide-Grip Lat Pulldown', 'back'),
    ('back-neutral-pulldown', target_user_id, 'Neutral Lat Pulldown', 'back'),
    ('back-pull-up', target_user_id, 'Pull-Up', 'back'),
    ('back-chin-up', target_user_id, 'Chin-Up', 'back'),
    ('back-single-arm-db-row', target_user_id, 'Single-Arm Dumbbell Row', 'back'),
    ('back-machine-row', target_user_id, 'Machine Row', 'back'),
    ('back-straight-arm-pulldown', target_user_id, 'Straight-Arm Pulldown', 'back'),
    ('back-reverse-fly', target_user_id, 'Reverse Pec Deck', 'back'),
    ('back-rack-pull', target_user_id, 'Rack Pull', 'back'),
    ('shoulders-ohp', target_user_id, 'Standing Overhead Press', 'shoulders'),
    ('shoulders-seated-db-press', target_user_id, 'Seated Dumbbell Press', 'shoulders'),
    ('shoulders-machine-press', target_user_id, 'Machine Shoulder Press', 'shoulders'),
    ('shoulders-smith-press', target_user_id, 'Smith Shoulder Press', 'shoulders'),
    ('shoulders-arnold', target_user_id, 'Arnold Press', 'shoulders'),
    ('shoulders-lateral-raise', target_user_id, 'Dumbbell Lateral Raise', 'shoulders'),
    ('shoulders-cable-lateral', target_user_id, 'Cable Lateral Raise', 'shoulders'),
    ('shoulders-front-raise', target_user_id, 'Front Raise', 'shoulders'),
    ('shoulders-upright-row', target_user_id, 'Upright Row', 'shoulders'),
    ('shoulders-rear-delt-fly', target_user_id, 'Rear Delt Fly', 'shoulders'),
    ('shoulders-face-pull', target_user_id, 'Face Pull', 'shoulders'),
    ('shoulders-landmine-press', target_user_id, 'Landmine Press', 'shoulders'),
    ('shoulders-plate-raise', target_user_id, 'Plate Front Raise', 'shoulders'),
    ('shoulders-cuban-press', target_user_id, 'Cuban Press', 'shoulders'),
    ('legs-back-squat', target_user_id, 'Barbell Back Squat', 'legs'),
    ('legs-front-squat', target_user_id, 'Front Squat', 'legs'),
    ('legs-leg-press', target_user_id, 'Leg Press', 'legs'),
    ('legs-hack-squat', target_user_id, 'Hack Squat', 'legs'),
    ('legs-smith-squat', target_user_id, 'Smith Machine Squat', 'legs'),
    ('legs-romanian-deadlift', target_user_id, 'Romanian Deadlift', 'legs'),
    ('legs-bulgarian-split', target_user_id, 'Bulgarian Split Squat', 'legs'),
    ('legs-walking-lunge', target_user_id, 'Walking Lunges', 'legs'),
    ('legs-leg-extension', target_user_id, 'Leg Extension', 'legs'),
    ('legs-seated-leg-curl', target_user_id, 'Seated Leg Curl', 'legs'),
    ('legs-lying-leg-curl', target_user_id, 'Lying Leg Curl', 'legs'),
    ('legs-calf-raise', target_user_id, 'Standing Calf Raise', 'legs'),
    ('legs-seated-calf', target_user_id, 'Seated Calf Raise', 'legs'),
    ('legs-pendulum', target_user_id, 'Pendulum Squat', 'legs'),
    ('arms-barbell-curl', target_user_id, 'Barbell Curl', 'arms'),
    ('arms-ez-curl', target_user_id, 'EZ-Bar Curl', 'arms'),
    ('arms-incline-db-curl', target_user_id, 'Incline Dumbbell Curl', 'arms'),
    ('arms-hammer-curl', target_user_id, 'Hammer Curl', 'arms'),
    ('arms-preacher-curl', target_user_id, 'Preacher Curl', 'arms'),
    ('arms-cable-curl', target_user_id, 'Cable Curl', 'arms'),
    ('arms-spider-curl', target_user_id, 'Spider Curl', 'arms'),
    ('arms-skullcrusher', target_user_id, 'Skull Crushers', 'arms'),
    ('arms-close-grip-bench', target_user_id, 'Close-Grip Bench Press', 'arms'),
    ('arms-rope-pushdown', target_user_id, 'Rope Pushdown', 'arms'),
    ('arms-straight-bar-pushdown', target_user_id, 'Straight-Bar Pushdown', 'arms'),
    ('arms-overhead-extension', target_user_id, 'Overhead Triceps Extension', 'arms'),
    ('arms-kickback', target_user_id, 'Dumbbell Kickback', 'arms'),
    ('arms-weighted-dip', target_user_id, 'Weighted Triceps Dips', 'arms')
  on conflict (user_id, id) do nothing;

  -- Insert default app settings
  insert into public.app_settings (id, user_id, is_muted, unit)
  values ('settings', target_user_id, false, 'kg')
  on conflict (user_id, id) do nothing;
end;
$$;

-- Function to ensure current user has default data
create or replace function public.ensure_current_user_initialized()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.initialize_user_defaults(current_user_id);
end;
$$;

grant execute on function public.ensure_current_user_initialized() to authenticated;

-- Trigger function to initialize defaults for new users
create or replace function public.handle_new_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.initialize_user_defaults(new.id);
  return new;
end;
$$;

-- Create trigger on users table
drop trigger if exists on_public_user_created_initialize_defaults on public.users;
create trigger on_public_user_created_initialize_defaults
after insert on public.users
for each row
execute function public.handle_new_user_defaults();

-- Backfill default data for all existing users
select public.initialize_user_defaults(id) from public.users;

commit;