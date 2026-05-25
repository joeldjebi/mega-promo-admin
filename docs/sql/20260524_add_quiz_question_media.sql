-- MegaPromo - Images pour questions et reponses de quiz
-- A executer dans Supabase SQL Editor.
-- Ajoute des URLs d'images sans casser les quiz texte existants.

alter table public.questions
add column if not exists question_image_url text,
add column if not exists option_a_image_url text,
add column if not exists option_b_image_url text,
add column if not exists option_c_image_url text,
add column if not exists option_d_image_url text;

notify pgrst, 'reload schema';
