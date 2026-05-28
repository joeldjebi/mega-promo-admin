-- MegaPromo - QL public pour landing page
-- A executer dans Supabase SQL Editor.
-- Expose uniquement les champs necessaires au bloc flottant public de la landing.

grant select (
  id,
  title,
  brand_name,
  brand_logo_url,
  image_url,
  prize_description,
  prize_value,
  live_starts_at,
  ends_at,
  live_status,
  registered_count,
  is_live,
  status,
  created_at
) on public.contests to anon;

drop policy if exists "contests_public_landing_live_select" on public.contests;
create policy "contests_public_landing_live_select"
on public.contests
for select
to anon
using (
  coalesce(is_live, false) = true
  and status = 'active'
  and coalesce(live_status, 'scheduled') <> 'ended'
  and ends_at > now()
);

drop function if exists public.get_public_landing_live_quiz();

create or replace function public.get_public_landing_live_quiz()
returns table (
  id uuid,
  title text,
  brand_name text,
  brand_logo_url text,
  image_url text,
  prize_label text,
  prize_value numeric,
  live_starts_at timestamptz,
  ends_at timestamptz,
  live_status text,
  registered_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    contests.id,
    contests.title,
    coalesce(nullif(contests.brand_name, ''), 'MegaPromo') as brand_name,
    nullif(contests.brand_logo_url, '') as brand_logo_url,
    nullif(contests.image_url, '') as image_url,
    coalesce(
      nullif(contests.prize_description, ''),
      case
        when coalesce(contests.prize_value, 0) > 0
          then trim(to_char(contests.prize_value, 'FM999G999G999G999')) || ' FCFA'
        else 'Recompense promotionnelle'
      end
    ) as prize_label,
    coalesce(contests.prize_value, 0) as prize_value,
    contests.live_starts_at,
    contests.ends_at,
    coalesce(contests.live_status, 'scheduled') as live_status,
    coalesce(contests.registered_count, 0) as registered_count
  from public.contests
  where coalesce(contests.is_live, false) = true
    and contests.status = 'active'
    and coalesce(contests.live_status, 'scheduled') <> 'ended'
    and contests.ends_at > now()
  order by
    case
      when contests.live_starts_at <= now() then 0
      else 1
    end,
    contests.live_starts_at asc nulls last,
    contests.created_at desc
  limit 1;
$$;

grant execute on function public.get_public_landing_live_quiz()
to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime
    add table public.contests;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
