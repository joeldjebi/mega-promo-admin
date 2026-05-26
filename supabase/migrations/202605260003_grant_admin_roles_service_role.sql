-- MegaPromo - Privileges service_role pour la gouvernance admin
-- A executer dans Supabase SQL Editor.
-- Necessaire pour l'Edge Function admin-access qui cree/modifie les roles.

grant select, insert, update, delete on public.admin_roles to service_role;
grant select, insert, update, delete on public.admin_role_permissions to service_role;

grant usage on schema public to service_role;

notify pgrst, 'reload schema';
