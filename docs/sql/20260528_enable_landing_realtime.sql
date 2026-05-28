-- MegaPromo - Realtime public landing
-- A executer dans Supabase SQL Editor.
-- Permet a la landing publique de se mettre a jour automatiquement
-- apres modification depuis le Super Admin.

do $$
begin
  begin
    alter publication supabase_realtime
    add table public.landing_page_content;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime
    add table public.landing_contact_settings;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime
    add table public.player_plans;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime
    add table public.player_plan_benefits;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime
    add table public.contests;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
