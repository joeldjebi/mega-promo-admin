-- MegaPromo - Contest views system
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute un suivi propre des vues par concours.
--
-- Fonctionnement :
-- - une vue est comptabilisee quand un joueur ouvre la page detail d'un concours
-- - une meme personne ne compte qu'une fois par concours et par jour
-- - contests.views_count est incremente uniquement lors d'une nouvelle vue valide

create table if not exists public.contest_views (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  view_date date not null default current_date,
  viewed_at timestamptz not null default now()
);

create unique index if not exists contest_views_unique_user_day_idx
on public.contest_views(contest_id, user_id, view_date);

create index if not exists contest_views_contest_id_idx
on public.contest_views(contest_id);

create index if not exists contest_views_user_id_idx
on public.contest_views(user_id);

grant usage on schema public to authenticated;
grant select, insert on public.contest_views to authenticated;
grant select, update on public.contests to authenticated;

alter table public.contest_views enable row level security;

drop policy if exists contest_views_insert_own on public.contest_views;
create policy contest_views_insert_own
on public.contest_views
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists contest_views_select_own on public.contest_views;
create policy contest_views_select_own
on public.contest_views
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists contest_views_admin_select on public.contest_views;
create policy contest_views_admin_select
on public.contest_views
for select
to authenticated
using (public.current_user_is_admin());

create or replace function public.register_contest_view(p_contest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_inserted boolean := false;
  v_row_count int4 := 0;
  v_views_count int4 := 0;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User must be authenticated';
  end if;

  insert into public.contest_views (
    contest_id,
    user_id,
    view_date,
    viewed_at
  )
  values (
    p_contest_id,
    v_user_id,
    current_date,
    now()
  )
  on conflict (contest_id, user_id, view_date) do nothing;

  get diagnostics v_row_count = row_count;
  v_inserted := v_row_count > 0;

  if v_inserted then
    update public.contests
    set views_count = coalesce(views_count, 0) + 1
    where id = p_contest_id
    returning coalesce(views_count, 0) into v_views_count;
  else
    select coalesce(views_count, 0)
    into v_views_count
    from public.contests
    where id = p_contest_id;
  end if;

  return jsonb_build_object(
    'counted', v_inserted,
    'views_count', coalesce(v_views_count, 0)
  );
end;
$$;

grant execute on function public.register_contest_view(uuid) to authenticated;
