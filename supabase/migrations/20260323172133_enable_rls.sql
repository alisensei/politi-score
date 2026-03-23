-- ============================================================
-- RLS : Lecture publique, écriture protégée
-- ============================================================

-- Activation RLS sur toutes les tables
alter table politicians      enable row level security;
alter table affairs          enable row level security;
alter table lies             enable row level security;
alter table conflicts        enable row level security;
alter table patrimoine       enable row level security;
alter table financement      enable row level security;
alter table sources          enable row level security;
alter table contributions    enable row level security;
alter table reviews          enable row level security;
alter table contributors     enable row level security;
alter table scoring_rules    enable row level security;
alter table audit_log        enable row level security;

-- Lecture publique sur les données approuvées
create policy "public can read politicians"
  on politicians for select using (status = 'active');

create policy "public can read approved affairs"
  on affairs for select using (review_status = 'approved');

create policy "public can read approved lies"
  on lies for select using (review_status = 'approved');

create policy "public can read approved conflicts"
  on conflicts for select using (review_status = 'approved');

create policy "public can read approved patrimoine"
  on patrimoine for select using (review_status = 'approved');

create policy "public can read approved financement"
  on financement for select using (review_status = 'approved');

create policy "public can read sources"
  on sources for select using (true);

create policy "public can read scoring rules"
  on scoring_rules for select using (true);

create policy "public can read contributions"
  on contributions for select using (true);

create policy "public can read reviews"
  on reviews for select using (true);

create policy "public can read contributors"
  on contributors for select using (true);

-- Soumission publique de contributions (anonyme autorisé)
create policy "anyone can submit contribution"
  on contributions for insert with check (true);

-- Vote public (authentifié uniquement — géré côté app)
create policy "anyone can submit review"
  on reviews for insert with check (true);