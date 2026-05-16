-- ============================================================
-- DURCISSEMENT RLS
--   Avant : toutes les écritures admin étaient `with check (true)`
--           → n'importe quel détenteur de l'anon key pouvait écrire.
--   Après : écritures gouvernées par is_moderator(), qui vérifie
--           le rôle dans contributors via le JWT GitHub.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper : is_moderator()
-- ------------------------------------------------------------
-- Retourne true ssi l'appelant est authentifié ET inscrit dans
-- contributors avec un rôle moderator ou admin.
--
-- SECURITY DEFINER : la fonction lit contributors avec les droits
-- du propriétaire, ce qui évite tout effet de bord RLS si on
-- restreint un jour la lecture de cette table.
create or replace function is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from contributors
    where github_username = (auth.jwt() -> 'user_metadata' ->> 'user_name')
      and role in ('moderator', 'admin')
  );
$$;

revoke all on function is_moderator() from public;
grant execute on function is_moderator() to authenticated, anon;

-- ------------------------------------------------------------
-- 2. Remplacement des policies permissives
-- ------------------------------------------------------------
-- politicians
drop policy if exists "admins can insert politicians" on politicians;
drop policy if exists "admins can update politicians" on politicians;
drop policy if exists "admins can delete politicians" on politicians;

create policy "moderators can insert politicians"
  on politicians for insert to authenticated
  with check (is_moderator());
create policy "moderators can update politicians"
  on politicians for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete politicians"
  on politicians for delete to authenticated
  using (is_moderator());

-- affairs
drop policy if exists "admins can insert affairs" on affairs;
drop policy if exists "admins can update affairs" on affairs;
drop policy if exists "admins can delete affairs" on affairs;

create policy "moderators can insert affairs"
  on affairs for insert to authenticated
  with check (is_moderator());
create policy "moderators can update affairs"
  on affairs for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete affairs"
  on affairs for delete to authenticated
  using (is_moderator());

-- lies
drop policy if exists "admins can insert lies" on lies;
drop policy if exists "admins can update lies" on lies;
drop policy if exists "admins can delete lies" on lies;

create policy "moderators can insert lies"
  on lies for insert to authenticated
  with check (is_moderator());
create policy "moderators can update lies"
  on lies for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete lies"
  on lies for delete to authenticated
  using (is_moderator());

-- conflicts
drop policy if exists "admins can insert conflicts" on conflicts;
drop policy if exists "admins can update conflicts" on conflicts;
drop policy if exists "admins can delete conflicts" on conflicts;

create policy "moderators can insert conflicts"
  on conflicts for insert to authenticated
  with check (is_moderator());
create policy "moderators can update conflicts"
  on conflicts for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete conflicts"
  on conflicts for delete to authenticated
  using (is_moderator());

-- patrimoine
drop policy if exists "admins can insert patrimoine" on patrimoine;
drop policy if exists "admins can update patrimoine" on patrimoine;
drop policy if exists "admins can delete patrimoine" on patrimoine;

create policy "moderators can insert patrimoine"
  on patrimoine for insert to authenticated
  with check (is_moderator());
create policy "moderators can update patrimoine"
  on patrimoine for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete patrimoine"
  on patrimoine for delete to authenticated
  using (is_moderator());

-- financement
drop policy if exists "admins can insert financement" on financement;
drop policy if exists "admins can update financement" on financement;
drop policy if exists "admins can delete financement" on financement;

create policy "moderators can insert financement"
  on financement for insert to authenticated
  with check (is_moderator());
create policy "moderators can update financement"
  on financement for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete financement"
  on financement for delete to authenticated
  using (is_moderator());

-- sources
drop policy if exists "admins can insert sources" on sources;
drop policy if exists "admins can update sources" on sources;
drop policy if exists "admins can delete sources" on sources;

create policy "moderators can insert sources"
  on sources for insert to authenticated
  with check (is_moderator());
create policy "moderators can update sources"
  on sources for update to authenticated
  using (is_moderator()) with check (is_moderator());
create policy "moderators can delete sources"
  on sources for delete to authenticated
  using (is_moderator());

-- ------------------------------------------------------------
-- 3. Modération des contributions/reviews
-- ------------------------------------------------------------
-- Les contributions publiques restent ouvertes en INSERT mais on
-- empêche un soumissionnaire de pré-approuver sa propre entrée.
drop policy if exists "anyone can submit contribution" on contributions;

create policy "anyone can submit contribution"
  on contributions for insert
  with check (
    status = 'pending'
    and upvotes = 0
    and downvotes = 0
    and reviewed_at is null
  );

-- Seuls les modérateurs peuvent faire évoluer le statut d'une contribution.
create policy "moderators can update contributions"
  on contributions for update to authenticated
  using (is_moderator()) with check (is_moderator());

create policy "moderators can delete contributions"
  on contributions for delete to authenticated
  using (is_moderator());

-- Reviews : on garde l'insertion ouverte (le vote sera limité côté
-- app), mais update/delete réservés aux modérateurs.
create policy "moderators can update reviews"
  on reviews for update to authenticated
  using (is_moderator()) with check (is_moderator());

create policy "moderators can delete reviews"
  on reviews for delete to authenticated
  using (is_moderator());

-- ------------------------------------------------------------
-- 4. Tables sensibles non écrites par l'API
-- ------------------------------------------------------------
-- contributors : seul un admin peut promouvoir/rétrograder.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from contributors
    where github_username = (auth.jwt() -> 'user_metadata' ->> 'user_name')
      and role = 'admin'
  );
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated, anon;

create policy "admins can manage contributors insert"
  on contributors for insert to authenticated
  with check (is_admin());
create policy "admins can manage contributors update"
  on contributors for update to authenticated
  using (is_admin()) with check (is_admin());
create policy "admins can manage contributors delete"
  on contributors for delete to authenticated
  using (is_admin());

-- scoring_rules : barème modifiable uniquement par admin.
create policy "admins can manage scoring rules insert"
  on scoring_rules for insert to authenticated
  with check (is_admin());
create policy "admins can manage scoring rules update"
  on scoring_rules for update to authenticated
  using (is_admin()) with check (is_admin());
create policy "admins can manage scoring rules delete"
  on scoring_rules for delete to authenticated
  using (is_admin());
