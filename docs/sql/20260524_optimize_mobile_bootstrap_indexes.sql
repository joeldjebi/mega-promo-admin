-- MegaPromo - Indexes for mobile bootstrap performance
-- A executer dans Supabase SQL Editor.
-- Script idempotent : optimise get_mobile_home_bootstrap(), les listes de jeux
-- et les checks rapides de participation/inscription.

create index if not exists contests_mobile_active_idx
on public.contests(status, ends_at, starts_at)
where coalesce(is_live, false) = false;

create index if not exists contests_mobile_live_idx
on public.contests(is_live, live_status, status, live_starts_at, ends_at)
where coalesce(is_live, false) = true;

create index if not exists contests_mobile_sort_idx
on public.contests(is_boosted desc, starts_at, ends_at);

create index if not exists questions_contest_duration_idx
on public.questions(contest_id, time_limit);

create index if not exists participations_user_contest_idx
on public.participations(user_id, contest_id);

create index if not exists participations_contest_score_idx
on public.participations(contest_id, score desc);

create index if not exists live_quiz_registrations_user_status_idx
on public.live_quiz_registrations(user_id, status, contest_id);

create index if not exists notifications_user_unread_idx
on public.notifications(user_id, is_read, created_at desc)
where is_read = false;

create index if not exists player_subscriptions_user_active_idx
on public.player_subscriptions(user_id, status, expires_at desc, created_at desc)
where status = 'active';

create index if not exists contest_draw_settings_contest_idx
on public.contest_draw_settings(contest_id);

create index if not exists contest_predictions_contest_idx
on public.contest_predictions(contest_id);

notify pgrst, 'reload schema';
