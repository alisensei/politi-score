-- ============================================================
-- ROLLBACK de 20260516134532_harden_rls.sql
-- À NE JOUER QUE SI LA MIGRATION CASSE LA PROD.
-- À copier-coller dans le SQL Editor du dashboard Supabase
-- (utilise service_role, donc bypass des nouvelles RLS).
-- ============================================================

-- 1. Re-créer les anciennes policies permissives (état pré-durcissement)
drop policy if exists "moderators can insert politicians" on politicians;
drop policy if exists "moderators can update politicians" on politicians;
drop policy if exists "moderators can delete politicians" on politicians;
create policy "admins can insert politicians" on politicians for insert with check (true);
create policy "admins can update politicians" on politicians for update using (true);
create policy "admins can delete politicians" on politicians for delete using (true);

drop policy if exists "moderators can insert affairs" on affairs;
drop policy if exists "moderators can update affairs" on affairs;
drop policy if exists "moderators can delete affairs" on affairs;
create policy "admins can insert affairs" on affairs for insert with check (true);
create policy "admins can update affairs" on affairs for update using (true);
create policy "admins can delete affairs" on affairs for delete using (true);

drop policy if exists "moderators can insert lies" on lies;
drop policy if exists "moderators can update lies" on lies;
drop policy if exists "moderators can delete lies" on lies;
create policy "admins can insert lies" on lies for insert with check (true);
create policy "admins can update lies" on lies for update using (true);
create policy "admins can delete lies" on lies for delete using (true);

drop policy if exists "moderators can insert conflicts" on conflicts;
drop policy if exists "moderators can update conflicts" on conflicts;
drop policy if exists "moderators can delete conflicts" on conflicts;
create policy "admins can insert conflicts" on conflicts for insert with check (true);
create policy "admins can update conflicts" on conflicts for update using (true);
create policy "admins can delete conflicts" on conflicts for delete using (true);

drop policy if exists "moderators can insert patrimoine" on patrimoine;
drop policy if exists "moderators can update patrimoine" on patrimoine;
drop policy if exists "moderators can delete patrimoine" on patrimoine;
create policy "admins can insert patrimoine" on patrimoine for insert with check (true);
create policy "admins can update patrimoine" on patrimoine for update using (true);
create policy "admins can delete patrimoine" on patrimoine for delete using (true);

drop policy if exists "moderators can insert financement" on financement;
drop policy if exists "moderators can update financement" on financement;
drop policy if exists "moderators can delete financement" on financement;
create policy "admins can insert financement" on financement for insert with check (true);
create policy "admins can update financement" on financement for update using (true);
create policy "admins can delete financement" on financement for delete using (true);

drop policy if exists "moderators can insert sources" on sources;
drop policy if exists "moderators can update sources" on sources;
drop policy if exists "moderators can delete sources" on sources;
create policy "admins can insert sources" on sources for insert with check (true);
create policy "admins can update sources" on sources for update using (true);
create policy "admins can delete sources" on sources for delete using (true);

-- 2. Restaurer la policy contributions permissive
drop policy if exists "anyone can submit contribution" on contributions;
drop policy if exists "moderators can update contributions" on contributions;
drop policy if exists "moderators can delete contributions" on contributions;
create policy "anyone can submit contribution" on contributions for insert with check (true);

-- 3. Retirer les policies sur contributors / scoring_rules / reviews
drop policy if exists "moderators can update reviews" on reviews;
drop policy if exists "moderators can delete reviews" on reviews;
drop policy if exists "admins can manage contributors insert" on contributors;
drop policy if exists "admins can manage contributors update" on contributors;
drop policy if exists "admins can manage contributors delete" on contributors;
drop policy if exists "admins can manage scoring rules insert" on scoring_rules;
drop policy if exists "admins can manage scoring rules update" on scoring_rules;
drop policy if exists "admins can manage scoring rules delete" on scoring_rules;

-- 4. Supprimer les fonctions helper
drop function if exists is_moderator();
drop function if exists is_admin();

-- 5. (manuel) Marquer la migration comme non appliquée si tu veux la rejouer plus tard :
-- delete from supabase_migrations.schema_migrations where version = '20260516134532';
