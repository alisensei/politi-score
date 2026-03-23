-- ============================================================
-- MIGRATION : Système de scoring automatique
-- Remplace la table scores par des vues calculées
-- 5 critères d'intégrité + score général pondéré
-- ============================================================

-- 1. Suppression de l'ancienne table scores
drop table if exists scores cascade;

-- 2. Ajout des nouvelles tables de financement et patrimoine

create table patrimoine (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in ('omission_volontaire','declaration_incomplete','retard')),
  date_constat    date,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

create table financement (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in ('condamnation_cnccfp','irregularite_constatee','anomalie_signalee')),
  date_constat    date,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- 3. Mise à jour du check de linked_type dans sources
alter table sources
  drop constraint if exists sources_linked_type_check;

alter table sources
  add constraint sources_linked_type_check
  check (linked_type in ('affair','lie','conflict','patrimoine','financement'));

-- 4. Mise à jour du check de contribution_type dans contributions
alter table contributions
  drop constraint if exists contributions_contribution_type_check;

alter table contributions
  add constraint contributions_contribution_type_check
  check (contribution_type in ('affair','lie','conflict','patrimoine','financement','new_politician'));

-- 5. Triggers audit sur les nouvelles tables
create trigger audit_patrimoine
  after insert or update or delete on patrimoine
  for each row execute function audit_trigger();

create trigger audit_financement
  after insert or update or delete on financement
  for each row execute function audit_trigger();

-- 6. Index sur les nouvelles tables
create index on patrimoine(politician_id);
create index on patrimoine(review_status);
create index on financement(politician_id);
create index on financement(review_status);

-- ============================================================
-- 7. TABLE DE RÉFÉRENCE DU BARÈME
-- Source de vérité pour les pénalités — modifiable sans
-- toucher au code ni aux vues
-- ============================================================

create table scoring_rules (
  id           uuid primary key default gen_random_uuid(),
  criterion    varchar not null check (criterion in ('corruption','lies','conflicts','patrimoine','financement')),
  severity     varchar not null,
  penalty      integer not null check (penalty >= 0),
  description  text,
  unique (criterion, severity)
);

insert into scoring_rules (criterion, severity, penalty, description) values
  -- Corruption
  ('corruption', 'condamne',          40, 'Condamnation définitive par la justice'),
  ('corruption', 'mis_en_examen',     20, 'Mise en examen — présomption d''innocence'),
  ('corruption', 'inculpe',           15, 'Inculpation en cours'),
  ('corruption', 'soupcon',            5, 'Soupçon documenté, non judiciaire'),
  ('corruption', 'classe',             3, 'Affaire classée sans suite'),
  -- Mensonges
  ('lies',       'avere',             15, 'Mensonge avéré par fact-check officiel'),
  ('lies',       'etabli',             8, 'Inexactitude établie et documentée'),
  ('lies',       'probable',           5, 'Probable inexactitude'),
  ('lies',       'nuance',             3, 'Approximation ou déclaration nuancée'),
  -- Conflits d''intérêts
  ('conflicts',  'avere',             25, 'Conflit avéré non déclaré à la HATVP'),
  ('conflicts',  'soupcon',            8, 'Soupçon documenté de conflit'),
  ('conflicts',  'potentiel',          4, 'Conflit potentiel identifié'),
  -- Transparence patrimoniale
  ('patrimoine', 'omission_volontaire', 30, 'Omission volontaire prouvée'),
  ('patrimoine', 'declaration_incomplete', 15, 'Déclaration patrimoniale incomplète'),
  ('patrimoine', 'retard',             5, 'Retard de déclaration'),
  -- Financement politique
  ('financement','condamnation_cnccfp', 30, 'Condamnation par la CNCCFP'),
  ('financement','irregularite_constatee', 15, 'Irrégularité de financement constatée'),
  ('financement','anomalie_signalee',   8, 'Anomalie de financement signalée');

-- ============================================================
-- 8. VUES DE SCORING CALCULÉES
-- Chaque vue calcule le score brut (0-100) d'un critère
-- en soustrayant les pénalités des entrées approuvées
-- ============================================================

-- Score corruption (0-100)
create or replace view v_score_corruption as
select
  p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join affairs a
  on a.politician_id = p.id
  and a.review_status = 'approved'
left join scoring_rules sr
  on sr.criterion = 'corruption'
  and sr.severity = a.severity
group by p.id;

-- Score mensonges (0-100)
create or replace view v_score_lies as
select
  p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join lies l
  on l.politician_id = p.id
  and l.review_status = 'approved'
left join scoring_rules sr
  on sr.criterion = 'lies'
  and sr.severity = l.severity
group by p.id;

-- Score conflits d'intérêts (0-100)
create or replace view v_score_conflicts as
select
  p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join conflicts c
  on c.politician_id = p.id
  and c.review_status = 'approved'
left join scoring_rules sr
  on sr.criterion = 'conflicts'
  and sr.severity = c.severity
group by p.id;

-- Score transparence patrimoniale (0-100)
create or replace view v_score_patrimoine as
select
  p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join patrimoine pt
  on pt.politician_id = p.id
  and pt.review_status = 'approved'
left join scoring_rules sr
  on sr.criterion = 'patrimoine'
  and sr.severity = pt.severity
group by p.id;

-- Score financement politique (0-100)
create or replace view v_score_financement as
select
  p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join financement f
  on f.politician_id = p.id
  and f.review_status = 'approved'
left join scoring_rules sr
  on sr.criterion = 'financement'
  and sr.severity = f.severity
group by p.id;

-- ============================================================
-- 9. VUE PRINCIPALE : scores_computed
-- Agrège les 5 critères avec pondération
-- et calcule le score général + la note lettre
-- Pondération : corruption 30%, mensonges 20%,
--               conflits 20%, patrimoine 15%, financement 15%
-- ============================================================

create or replace view scores_computed as
select
  p.id                          as politician_id,
  p.full_name,
  p.slug,
  p.party,
  p.role,
  p.level,
  p.status,

  -- Scores bruts par critère (0-100)
  vc.score                      as score_corruption,
  vl.score                      as score_lies,
  vco.score                     as score_conflicts,
  vp.score                      as score_patrimoine,
  vf.score                      as score_financement,

  -- Score général pondéré (0-100)
  round(
    vc.score  * 0.30 +
    vl.score  * 0.20 +
    vco.score * 0.20 +
    vp.score  * 0.15 +
    vf.score  * 0.15
  )::integer                    as score_general,

  -- Conversion en lettre A-E (côté base pour commodité API)
  case
    when round(vc.score  * 0.30 + vl.score * 0.20 + vco.score * 0.20 + vp.score * 0.15 + vf.score * 0.15) >= 80 then 'A'
    when round(vc.score  * 0.30 + vl.score * 0.20 + vco.score * 0.20 + vp.score * 0.15 + vf.score * 0.15) >= 60 then 'B'
    when round(vc.score  * 0.30 + vl.score * 0.20 + vco.score * 0.20 + vp.score * 0.15 + vf.score * 0.15) >= 40 then 'C'
    when round(vc.score  * 0.30 + vl.score * 0.20 + vco.score * 0.20 + vp.score * 0.15 + vf.score * 0.15) >= 20 then 'D'
    else 'E'
  end                           as grade_general,

  -- Grades individuels par critère
  case when vc.score  >= 80 then 'A' when vc.score  >= 60 then 'B' when vc.score  >= 40 then 'C' when vc.score  >= 20 then 'D' else 'E' end as grade_corruption,
  case when vl.score  >= 80 then 'A' when vl.score  >= 60 then 'B' when vl.score  >= 40 then 'C' when vl.score  >= 20 then 'D' else 'E' end as grade_lies,
  case when vco.score >= 80 then 'A' when vco.score >= 60 then 'B' when vco.score >= 40 then 'C' when vco.score >= 20 then 'D' else 'E' end as grade_conflicts,
  case when vp.score  >= 80 then 'A' when vp.score  >= 60 then 'B' when vp.score  >= 40 then 'C' when vp.score  >= 20 then 'D' else 'E' end as grade_patrimoine,
  case when vf.score  >= 80 then 'A' when vf.score  >= 60 then 'B' when vf.score  >= 40 then 'C' when vf.score  >= 20 then 'D' else 'E' end as grade_financement

from politicians p
join v_score_corruption  vc  on vc.politician_id  = p.id
join v_score_lies        vl  on vl.politician_id  = p.id
join v_score_conflicts   vco on vco.politician_id = p.id
join v_score_patrimoine  vp  on vp.politician_id  = p.id
join v_score_financement vf  on vf.politician_id  = p.id
where p.status = 'active';

-- ============================================================
-- 10. FONCTION UTILITAIRE : score_to_grade()
-- Utilisable partout dans le code SQL
-- ============================================================

create or replace function score_to_grade(score integer)
returns char(1) as $$
begin
  return case
    when score >= 80 then 'A'
    when score >= 60 then 'B'
    when score >= 40 then 'C'
    when score >= 20 then 'D'
    else 'E'
  end;
end;
$$ language plpgsql immutable;