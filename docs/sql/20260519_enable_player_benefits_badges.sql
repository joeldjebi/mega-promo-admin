-- MegaPromo Mobile - Player benefits and automatic badges
-- A executer dans Supabase SQL Editor.
-- Script idempotent : permet a l'app mobile de lire les badges et d'attribuer
-- automatiquement les badges gagnés par le joueur connecté.

grant usage on schema public to authenticated;
grant select on public.badges to authenticated;
grant select, insert on public.user_badges to authenticated;
grant select on public.player_plans to authenticated;
grant select on public.player_plan_benefits to authenticated;
grant select on public.player_subscriptions to authenticated;
grant select on public.participations to authenticated;

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.player_plans enable row level security;
alter table public.player_plan_benefits enable row level security;
alter table public.player_subscriptions enable row level security;
alter table public.participations enable row level security;

with badge_seed as (
  select *
  from (
    values
      (
        'Premier pas',
        'Premiere participation a un concours MegaPromo.',
        'participations',
        1
      ),
      (
        'Joueur regulier',
        'Atteindre 10 participations.',
        'participations',
        10
      ),
      (
        'Chasseur de points',
        'Atteindre 100 points.',
        'points',
        100
      ),
      (
        'Premium',
        'Avoir un forfait joueur premium actif.',
        'premium',
        1
      )
  ) as seed(name, description, condition_type, condition_value)
)
insert into public.badges (name, description, condition_type, condition_value)
select
  badge_seed.name,
  badge_seed.description,
  badge_seed.condition_type,
  badge_seed.condition_value
from badge_seed
where not exists (
  select 1
  from public.badges existing
  where lower(existing.name) = lower(badge_seed.name)
);

drop policy if exists badges_players_select on public.badges;
create policy badges_players_select
on public.badges
for select
to authenticated
using (true);

drop policy if exists user_badges_players_select_own on public.user_badges;
create policy user_badges_players_select_own
on public.user_badges
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists user_badges_players_insert_own on public.user_badges;
create policy user_badges_players_insert_own
on public.user_badges
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists player_subscriptions_players_select_active_own on public.player_subscriptions;
create policy player_subscriptions_players_select_active_own
on public.player_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists participations_players_select_own_for_badges on public.participations;
create policy participations_players_select_own_for_badges
on public.participations
for select
to authenticated
using (user_id = auth.uid());
