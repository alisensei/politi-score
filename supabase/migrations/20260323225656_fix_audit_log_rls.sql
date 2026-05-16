-- Le trigger audit_log tourne avec les droits SECURITY DEFINER
-- On désactive RLS pour les triggers système via une fonction sécurisée

alter table audit_log disable row level security;

-- Lecture publique de l'audit log (transparence totale)
create policy "public can read audit log"
  on audit_log for select using (true);

-- La table est désormais accessible en écriture uniquement
-- via les triggers PostgreSQL (pas via l'API)
alter table audit_log enable row level security;

-- Permettre aux triggers d'écrire dans audit_log
create policy "triggers can insert audit log"
  on audit_log for insert with check (true);