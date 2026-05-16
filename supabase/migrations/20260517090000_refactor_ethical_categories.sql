-- ============================================================
-- REFONTE DES CATÉGORIES ÉTHIQUES
-- 5 catégories procédurales → 6 catégories éthiques :
--   probity, conflicts, opacity, sincerity, harm, speech_offenses
-- Préserve la table politicians. Supprime tous les faits.
-- ============================================================

-- 1. Drop les vues de scoring
drop view if exists scores_computed cascade;
drop view if exists v_score_corruption cascade;
drop view if exists v_score_lies cascade;
drop view if exists v_score_conflicts cascade;
drop view if exists v_score_patrimoine cascade;
drop view if exists v_score_financement cascade;

-- 2. Drop les anciennes tables de faits (cascade purge les sources liées + audit)
drop table if exists affairs cascade;
drop table if exists lies cascade;
drop table if exists conflicts cascade;
drop table if exists patrimoine cascade;
drop table if exists financement cascade;

-- 3. Truncate les sources (orphelines après les drops)
truncate sources;

-- 4. Drop scoring_rules (pénalités à redéfinir)
drop table if exists scoring_rules cascade;

-- 5. Update la contrainte de sources.linked_type
alter table sources drop constraint if exists sources_linked_type_check;
alter table sources add constraint sources_linked_type_check
  check (linked_type in ('probity', 'conflict', 'opacity', 'sincerity', 'harm', 'speech_offense'));

-- 6. Update la contrainte de contributions.contribution_type
alter table contributions drop constraint if exists contributions_contribution_type_check;
alter table contributions add constraint contributions_contribution_type_check
  check (contribution_type in ('probity', 'conflict', 'opacity', 'sincerity', 'harm', 'speech_offense', 'new_politician'));

-- ============================================================
-- 7. CRÉATION DES 6 NOUVELLES TABLES
-- ============================================================

-- 7.1 probity : enrichissement personnel illégal
create table probity (
  id            uuid primary key default gen_random_uuid(),
  politician_id uuid not null references politicians(id) on delete cascade,
  title         varchar not null,
  description   text not null,
  severity      varchar not null check (severity in (
    'condamnation_definitive',
    'condamnation_premiere_instance',
    'mise_en_examen',
    'enquete_judiciaire',
    'soupcons_documentes'
  )),
  date_start    date,
  date_end      date,
  is_active     boolean not null default true,
  submitted_by  uuid references contributors(id),
  review_status varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at    timestamp with time zone default now()
);

-- 7.2 conflicts : conflits d'intérêts (situation)
create table conflicts (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in (
    'non_declare_etabli',
    'partiellement_declare',
    'declare_problematique',
    'potentiel'
  )),
  conflict_type   varchar check (conflict_type in ('financier','familial','professionnel','actionariat')),
  declared_hatvp  boolean not null default false,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- 7.3 opacity : manquements aux obligations déclaratives
create table opacity (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in (
    'omission_volontaire',
    'declaration_incomplete',
    'irregularite_constatee',
    'retard_anomalie'
  )),
  date_constat    date,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- 7.4 sincerity : mensonges et manipulations factuels
create table sincerity (
  id                   uuid primary key default gen_random_uuid(),
  politician_id        uuid not null references politicians(id) on delete cascade,
  title                varchar not null,
  statement_original   text not null default '',
  statement_correction text not null,
  severity             varchar not null check (severity in (
    'mensonge_repete',
    'mensonge_etabli',
    'inexactitude_etablie',
    'approximation'
  )),
  date_declared        date,
  fact_check_org       varchar,
  submitted_by         uuid references contributors(id),
  review_status        varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at           timestamp with time zone default now()
);

-- 7.5 harm : atteintes aux personnes (violences, harcèlement, agressions)
create table harm (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in (
    'condamnation_violences_sexuelles',
    'condamnation_violences',
    'mise_en_examen_violences',
    'accusations_documentees',
    'signalements_publics'
  )),
  date_start      date,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- 7.6 speech_offenses : délits d'expression publique
create table speech_offenses (
  id              uuid primary key default gen_random_uuid(),
  politician_id   uuid not null references politicians(id) on delete cascade,
  title           varchar not null,
  description     text not null,
  severity        varchar not null check (severity in (
    'condamnation_provocation_haine',
    'condamnation_injure_diffamation',
    'condamnation_outrage',
    'polemique_documentee'
  )),
  date_event      date,
  submitted_by    uuid references contributors(id),
  review_status   varchar not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at      timestamp with time zone default now()
);

-- ============================================================
-- 8. INDEXES sur les nouvelles tables
-- ============================================================
create index on probity(politician_id);
create index on probity(review_status);
create index on conflicts(politician_id);
create index on conflicts(review_status);
create index on opacity(politician_id);
create index on opacity(review_status);
create index on sincerity(politician_id);
create index on sincerity(review_status);
create index on harm(politician_id);
create index on harm(review_status);
create index on speech_offenses(politician_id);
create index on speech_offenses(review_status);

-- ============================================================
-- 9. TRIGGERS d'audit
-- ============================================================
create trigger audit_probity         after insert or update or delete on probity         for each row execute function audit_trigger();
create trigger audit_conflicts       after insert or update or delete on conflicts       for each row execute function audit_trigger();
create trigger audit_opacity         after insert or update or delete on opacity         for each row execute function audit_trigger();
create trigger audit_sincerity       after insert or update or delete on sincerity       for each row execute function audit_trigger();
create trigger audit_harm            after insert or update or delete on harm            for each row execute function audit_trigger();
create trigger audit_speech_offenses after insert or update or delete on speech_offenses for each row execute function audit_trigger();

-- ============================================================
-- 10. RLS sur les nouvelles tables
-- ============================================================
alter table probity         enable row level security;
alter table conflicts       enable row level security;
alter table opacity         enable row level security;
alter table sincerity       enable row level security;
alter table harm            enable row level security;
alter table speech_offenses enable row level security;

-- Lectures publiques (approuvés uniquement)
create policy "public read approved probity"
  on probity for select using (review_status = 'approved');
create policy "public read approved conflicts"
  on conflicts for select using (review_status = 'approved');
create policy "public read approved opacity"
  on opacity for select using (review_status = 'approved');
create policy "public read approved sincerity"
  on sincerity for select using (review_status = 'approved');
create policy "public read approved harm"
  on harm for select using (review_status = 'approved');
create policy "public read approved speech_offenses"
  on speech_offenses for select using (review_status = 'approved');

-- Écritures réservées aux modérateurs (utilise is_moderator() de la migration 20260516134532)
create policy "moderators insert probity" on probity for insert to authenticated with check (is_moderator());
create policy "moderators update probity" on probity for update to authenticated using (is_moderator()) with check (is_moderator());
create policy "moderators delete probity" on probity for delete to authenticated using (is_moderator());

create policy "moderators insert conflicts" on conflicts for insert to authenticated with check (is_moderator());
create policy "moderators update conflicts" on conflicts for update to authenticated using (is_moderator()) with check (is_moderator());
create policy "moderators delete conflicts" on conflicts for delete to authenticated using (is_moderator());

create policy "moderators insert opacity" on opacity for insert to authenticated with check (is_moderator());
create policy "moderators update opacity" on opacity for update to authenticated using (is_moderator()) with check (is_moderator());
create policy "moderators delete opacity" on opacity for delete to authenticated using (is_moderator());

create policy "moderators insert sincerity" on sincerity for insert to authenticated with check (is_moderator());
create policy "moderators update sincerity" on sincerity for update to authenticated using (is_moderator()) with check (is_moderator());
create policy "moderators delete sincerity" on sincerity for delete to authenticated using (is_moderator());

create policy "moderators insert harm" on harm for insert to authenticated with check (is_moderator());
create policy "moderators update harm" on harm for update to authenticated using (is_moderator()) with check (is_moderator());
create policy "moderators delete harm" on harm for delete to authenticated using (is_moderator());

create policy "moderators insert speech_offenses" on speech_offenses for insert to authenticated with check (is_moderator());
create policy "moderators update speech_offenses" on speech_offenses for update to authenticated using (is_moderator()) with check (is_moderator());
create policy "moderators delete speech_offenses" on speech_offenses for delete to authenticated using (is_moderator());

-- ============================================================
-- 11. NOUVEAU BARÈME
-- ============================================================
create table scoring_rules (
  id           uuid primary key default gen_random_uuid(),
  criterion    varchar not null check (criterion in ('probity', 'conflicts', 'opacity', 'sincerity', 'harm', 'speech_offenses')),
  severity     varchar not null,
  penalty      integer not null check (penalty >= 0),
  description  text,
  unique (criterion, severity)
);

alter table scoring_rules enable row level security;
create policy "public read scoring rules" on scoring_rules for select using (true);
create policy "admins insert scoring rules" on scoring_rules for insert to authenticated with check (is_admin());
create policy "admins update scoring rules" on scoring_rules for update to authenticated using (is_admin()) with check (is_admin());
create policy "admins delete scoring rules" on scoring_rules for delete to authenticated using (is_admin());

insert into scoring_rules (criterion, severity, penalty, description) values
  -- Probité (max -50)
  ('probity', 'condamnation_definitive',        50, 'Condamnation définitive (corruption, abus de biens, blanchiment, fraude fiscale aggravée)'),
  ('probity', 'condamnation_premiere_instance', 35, 'Condamnation en première instance, appel possible'),
  ('probity', 'mise_en_examen',                 20, 'Mise en examen (présomption d''innocence)'),
  ('probity', 'enquete_judiciaire',             10, 'Enquête judiciaire ouverte sans mise en examen'),
  ('probity', 'soupcons_documentes',             5, 'Soupçons documentés sans suite judiciaire'),

  -- Conflits d'intérêts (max -30)
  ('conflicts', 'non_declare_etabli',    30, 'Conflit d''intérêts non déclaré à la HATVP, établi'),
  ('conflicts', 'partiellement_declare', 15, 'Déclaration HATVP partielle ou tardive'),
  ('conflicts', 'declare_problematique',  8, 'Conflit déclaré mais comportement problématique'),
  ('conflicts', 'potentiel',              4, 'Conflit potentiel identifié, non démontré'),

  -- Opacité financière (max -30)
  ('opacity', 'omission_volontaire',     30, 'Omission volontaire prouvée (patrimoine, financement, lobbying)'),
  ('opacity', 'declaration_incomplete',  15, 'Déclaration incomplète (HATVP, CNCCFP)'),
  ('opacity', 'irregularite_constatee',  10, 'Irrégularité constatée par autorité de contrôle'),
  ('opacity', 'retard_anomalie',          5, 'Retard de déclaration ou anomalie signalée'),

  -- Sincérité (max -20)
  ('sincerity', 'mensonge_repete',      20, 'Mensonge documenté et répété malgré démentis'),
  ('sincerity', 'mensonge_etabli',      12, 'Mensonge établi par fact-check officiel'),
  ('sincerity', 'inexactitude_etablie',  6, 'Inexactitude factuelle établie'),
  ('sincerity', 'approximation',         3, 'Approximation ou déclaration nuancée'),

  -- Atteintes aux personnes (max -60, le plus grave)
  ('harm', 'condamnation_violences_sexuelles', 60, 'Condamnation pour violences ou agressions sexuelles'),
  ('harm', 'condamnation_violences',           40, 'Condamnation pour violences (physiques, harcèlement, discrimination active)'),
  ('harm', 'mise_en_examen_violences',         25, 'Mise en examen pour violences ou atteintes graves'),
  ('harm', 'accusations_documentees',          12, 'Accusations documentées (plusieurs témoignages publics)'),
  ('harm', 'signalements_publics',              5, 'Signalements publics isolés'),

  -- Délits d'expression (max -15, le moins grave)
  ('speech_offenses', 'condamnation_provocation_haine',   15, 'Condamnation pour provocation à la haine, négationnisme'),
  ('speech_offenses', 'condamnation_injure_diffamation',   8, 'Condamnation pour injure publique ou diffamation'),
  ('speech_offenses', 'condamnation_outrage',              5, 'Condamnation pour outrage'),
  ('speech_offenses', 'polemique_documentee',              2, 'Polémique publique documentée sans condamnation');

-- ============================================================
-- 12. VUES DE SCORING (1 par axe)
-- ============================================================
create or replace view v_score_probity as
select p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join probity x on x.politician_id = p.id and x.review_status = 'approved'
left join scoring_rules sr on sr.criterion = 'probity' and sr.severity = x.severity
group by p.id;

create or replace view v_score_conflicts as
select p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join conflicts x on x.politician_id = p.id and x.review_status = 'approved'
left join scoring_rules sr on sr.criterion = 'conflicts' and sr.severity = x.severity
group by p.id;

create or replace view v_score_opacity as
select p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join opacity x on x.politician_id = p.id and x.review_status = 'approved'
left join scoring_rules sr on sr.criterion = 'opacity' and sr.severity = x.severity
group by p.id;

create or replace view v_score_sincerity as
select p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join sincerity x on x.politician_id = p.id and x.review_status = 'approved'
left join scoring_rules sr on sr.criterion = 'sincerity' and sr.severity = x.severity
group by p.id;

create or replace view v_score_harm as
select p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join harm x on x.politician_id = p.id and x.review_status = 'approved'
left join scoring_rules sr on sr.criterion = 'harm' and sr.severity = x.severity
group by p.id;

create or replace view v_score_speech_offenses as
select p.id as politician_id,
  greatest(0, 100 - coalesce(sum(sr.penalty), 0)) as score
from politicians p
left join speech_offenses x on x.politician_id = p.id and x.review_status = 'approved'
left join scoring_rules sr on sr.criterion = 'speech_offenses' and sr.severity = x.severity
group by p.id;

-- ============================================================
-- 13. scores_computed — pondération sur les 6 axes
-- Pondération : probity 25%, harm 25%, conflicts 15%, opacity 15%,
--               sincerity 10%, speech_offenses 10%
-- ============================================================
create or replace view scores_computed as
select
  p.id                          as id,
  p.id                          as politician_id,
  p.full_name,
  p.slug,
  p.party,
  p.role,
  p.level,
  p.status,
  p.photo_url,
  p.mandate_start,
  p.mandate_end,
  p.created_at,
  p.updated_at,
  vpr.score  as score_probity,
  vci.score  as score_conflicts,
  vop.score  as score_opacity,
  vsi.score  as score_sincerity,
  vha.score  as score_harm,
  vse.score  as score_speech_offenses,
  round(
    vpr.score * 0.25 +
    vha.score * 0.25 +
    vci.score * 0.15 +
    vop.score * 0.15 +
    vsi.score * 0.10 +
    vse.score * 0.10
  )::integer as score_general,
  case
    when round(vpr.score*0.25 + vha.score*0.25 + vci.score*0.15 + vop.score*0.15 + vsi.score*0.10 + vse.score*0.10) >= 80 then 'A'
    when round(vpr.score*0.25 + vha.score*0.25 + vci.score*0.15 + vop.score*0.15 + vsi.score*0.10 + vse.score*0.10) >= 60 then 'B'
    when round(vpr.score*0.25 + vha.score*0.25 + vci.score*0.15 + vop.score*0.15 + vsi.score*0.10 + vse.score*0.10) >= 40 then 'C'
    when round(vpr.score*0.25 + vha.score*0.25 + vci.score*0.15 + vop.score*0.15 + vsi.score*0.10 + vse.score*0.10) >= 20 then 'D'
    else 'E'
  end as grade_general,
  score_to_grade(vpr.score) as grade_probity,
  score_to_grade(vci.score) as grade_conflicts,
  score_to_grade(vop.score) as grade_opacity,
  score_to_grade(vsi.score) as grade_sincerity,
  score_to_grade(vha.score) as grade_harm,
  score_to_grade(vse.score) as grade_speech_offenses
from politicians p
join v_score_probity         vpr on vpr.politician_id = p.id
join v_score_conflicts       vci on vci.politician_id = p.id
join v_score_opacity         vop on vop.politician_id = p.id
join v_score_sincerity       vsi on vsi.politician_id = p.id
join v_score_harm            vha on vha.politician_id = p.id
join v_score_speech_offenses vse on vse.politician_id = p.id
where p.status = 'active';
