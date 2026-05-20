-- MegaPromo Web - Player participation history with rank
-- A executer dans Supabase SQL Editor.
-- Script idempotent : ajoute une fonction RPC pour calculer les rangs cote base.

create or replace function public.get_player_participation_history(
  target_user_id uuid,
  row_limit int default 50
)
returns table (
  participation_id uuid,
  contest_id uuid,
  contest_title text,
  score int4,
  rank int8,
  completed bool,
  participated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with ranked_participations as (
    select
      participations.id as participation_id,
      participations.user_id,
      participations.contest_id,
      contests.title::text as contest_title,
      coalesce(participations.score, 0)::int4 as score,
      participations.completed,
      participations.participated_at,
      rank() over (
        partition by participations.contest_id
        order by coalesce(participations.score, 0) desc, participations.participated_at asc
      ) as rank
    from public.participations
    left join public.contests on contests.id = participations.contest_id
  )
  select
    ranked_participations.participation_id,
    ranked_participations.contest_id,
    coalesce(ranked_participations.contest_title, 'Concours') as contest_title,
    ranked_participations.score,
    ranked_participations.rank,
    ranked_participations.completed,
    ranked_participations.participated_at
  from ranked_participations
  where ranked_participations.user_id = target_user_id
  order by ranked_participations.participated_at desc
  limit row_limit;
$$;

grant execute on function public.get_player_participation_history(uuid, int) to authenticated;

