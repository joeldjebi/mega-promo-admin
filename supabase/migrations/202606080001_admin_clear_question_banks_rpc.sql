-- MegaPromo Web - Maintenance SA pour vider les banques de questions
-- A executer dans Supabase SQL Editor.
--
-- Objectif:
-- - permettre au Super Admin de vider toutes les banques de questions depuis
--   la page Maintenance;
-- - supprimer les liens categorie/banque et les questions rattachees aux
--   banques;
-- - conserver les concours, les categories, les joueurs et les questions
--   directement rattachees a un concours.

grant usage on schema public to authenticated;

create or replace function public.admin_maintenance_clear_question_banks(
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  total_count integer := 0;
begin
  if not public.current_user_is_admin() then
    raise exception 'Action reservee au Super Admin.';
  end if;

  if p_confirmation <> 'CONFIRMER' then
    raise exception 'Confirmation invalide. Ecris CONFIRMER pour executer cette action.';
  end if;

  if to_regclass('public.quiz_participation_questions') is not null
    and to_regclass('public.questions') is not null
  then
    delete from public.quiz_participation_questions participation_questions
    where exists (
      select 1
      from public.questions questions
      where questions.id = participation_questions.question_id
        and questions.question_bank_id is not null
    );
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;
  end if;

  if to_regclass('public.questions') is not null then
    delete from public.questions
    where question_bank_id is not null;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;
  end if;

  if to_regclass('public.question_bank_categories') is not null then
    delete from public.question_bank_categories
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;
  end if;

  if to_regclass('public.question_banks') is not null then
    delete from public.question_banks
    where true;
    get diagnostics deleted_count = row_count;
    total_count := total_count + deleted_count;
  end if;

  return jsonb_build_object(
    'scope',
    'question_banks',
    'deleted',
    total_count,
    'message',
    'Banques de questions, liens categories et questions de banque vides.'
  );
end;
$$;

grant execute on function public.admin_maintenance_clear_question_banks(text)
to authenticated;

notify pgrst, 'reload schema';
