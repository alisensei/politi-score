-- ============================================================
-- Plafond de grade par sévérité : un fait approuvé impose un grade
-- max sur son axe, indépendamment du score numérique.
--   Ex : condamnation_definitive en probity → max D (jamais A).
-- Empêche le cas "1 condamnation + score 95 → A".
-- ============================================================

-- 1. Ajouter min_grade aux règles de scoring
alter table scoring_rules
  add column if not exists min_grade char(1) default 'A'
  check (min_grade in ('A','B','C','D','E'));

-- 2. Remplir les plafonds par axe/sévérité
-- Probité (condamnations → max D)
update scoring_rules set min_grade = 'D' where criterion = 'probity' and severity in ('condamnation_definitive','condamnation_premiere_instance');
update scoring_rules set min_grade = 'C' where criterion = 'probity' and severity = 'mise_en_examen';
update scoring_rules set min_grade = 'B' where criterion = 'probity' and severity in ('enquete_judiciaire','soupcons_documentes');

-- Atteintes aux personnes (violences sexuelles = E direct)
update scoring_rules set min_grade = 'E' where criterion = 'harm' and severity = 'condamnation_violences_sexuelles';
update scoring_rules set min_grade = 'D' where criterion = 'harm' and severity = 'condamnation_violences';
update scoring_rules set min_grade = 'C' where criterion = 'harm' and severity = 'mise_en_examen_violences';
update scoring_rules set min_grade = 'B' where criterion = 'harm' and severity in ('accusations_documentees','signalements_publics');

-- Conflits d'intérêts
update scoring_rules set min_grade = 'C' where criterion = 'conflicts' and severity = 'non_declare_etabli';
update scoring_rules set min_grade = 'B' where criterion = 'conflicts' and severity in ('partiellement_declare','declare_problematique');

-- Opacité financière
update scoring_rules set min_grade = 'C' where criterion = 'opacity' and severity = 'omission_volontaire';
update scoring_rules set min_grade = 'B' where criterion = 'opacity' and severity in ('declaration_incomplete','irregularite_constatee');

-- Sincérité
update scoring_rules set min_grade = 'C' where criterion = 'sincerity' and severity = 'mensonge_repete';
update scoring_rules set min_grade = 'B' where criterion = 'sincerity' and severity in ('mensonge_etabli','inexactitude_etablie');

-- Délits d'expression (condamnations toujours → max B ou C)
update scoring_rules set min_grade = 'C' where criterion = 'speech_offenses' and severity = 'condamnation_provocation_haine';
update scoring_rules set min_grade = 'B' where criterion = 'speech_offenses' and severity in ('condamnation_injure_diffamation','condamnation_outrage');

-- ============================================================
-- 3. Refonte de scores_computed : grade par axe = GREATEST(grade_from_score, ceiling_from_severities)
-- ============================================================
drop view if exists scores_computed cascade;

create view scores_computed as
select
  base.id,
  base.politician_id,
  base.full_name,
  base.slug,
  base.party,
  base.role,
  base.level,
  base.status,
  base.photo_url,
  base.mandate_start,
  base.mandate_end,
  base.created_at,
  base.updated_at,
  base.score_probity,
  base.score_conflicts,
  base.score_opacity,
  base.score_sincerity,
  base.score_harm,
  base.score_speech_offenses,
  base.score_general,
  -- Grade par axe : pire entre le score calculé et le ceiling de sévérité
  greatest(score_to_grade(base.score_probity),         base.ceiling_probity)         as grade_probity,
  greatest(score_to_grade(base.score_conflicts),       base.ceiling_conflicts)       as grade_conflicts,
  greatest(score_to_grade(base.score_opacity),         base.ceiling_opacity)         as grade_opacity,
  greatest(score_to_grade(base.score_sincerity),       base.ceiling_sincerity)       as grade_sincerity,
  greatest(score_to_grade(base.score_harm),            base.ceiling_harm)            as grade_harm,
  greatest(score_to_grade(base.score_speech_offenses), base.ceiling_speech_offenses) as grade_speech_offenses,
  -- Grade général : pire entre le score général et les grades des axes critiques (probity, harm)
  greatest(
    score_to_grade(base.score_general),
    greatest(score_to_grade(base.score_probity), base.ceiling_probity),
    greatest(score_to_grade(base.score_harm),    base.ceiling_harm)
  ) as grade_general
from (
  select
    p.id,
    p.id as politician_id,
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
    vpr.score::integer as score_probity,
    vci.score::integer as score_conflicts,
    vop.score::integer as score_opacity,
    vsi.score::integer as score_sincerity,
    vha.score::integer as score_harm,
    vse.score::integer as score_speech_offenses,
    least(
      round(vpr.score*0.25 + vha.score*0.25 + vci.score*0.15 + vop.score*0.15 + vsi.score*0.10 + vse.score*0.10)::integer,
      vpr.score::integer,
      vha.score::integer
    ) as score_general,
    -- Ceiling par axe : pire grade autorisé d'après les sévérités présentes
    coalesce(
      (select max(sr.min_grade) from probity x join scoring_rules sr on sr.criterion='probity' and sr.severity=x.severity where x.politician_id=p.id and x.review_status='approved'),
      'A'
    ) as ceiling_probity,
    coalesce(
      (select max(sr.min_grade) from conflicts x join scoring_rules sr on sr.criterion='conflicts' and sr.severity=x.severity where x.politician_id=p.id and x.review_status='approved'),
      'A'
    ) as ceiling_conflicts,
    coalesce(
      (select max(sr.min_grade) from opacity x join scoring_rules sr on sr.criterion='opacity' and sr.severity=x.severity where x.politician_id=p.id and x.review_status='approved'),
      'A'
    ) as ceiling_opacity,
    coalesce(
      (select max(sr.min_grade) from sincerity x join scoring_rules sr on sr.criterion='sincerity' and sr.severity=x.severity where x.politician_id=p.id and x.review_status='approved'),
      'A'
    ) as ceiling_sincerity,
    coalesce(
      (select max(sr.min_grade) from harm x join scoring_rules sr on sr.criterion='harm' and sr.severity=x.severity where x.politician_id=p.id and x.review_status='approved'),
      'A'
    ) as ceiling_harm,
    coalesce(
      (select max(sr.min_grade) from speech_offenses x join scoring_rules sr on sr.criterion='speech_offenses' and sr.severity=x.severity where x.politician_id=p.id and x.review_status='approved'),
      'A'
    ) as ceiling_speech_offenses
  from politicians p
  join v_score_probity         vpr on vpr.politician_id = p.id
  join v_score_conflicts       vci on vci.politician_id = p.id
  join v_score_opacity         vop on vop.politician_id = p.id
  join v_score_sincerity       vsi on vsi.politician_id = p.id
  join v_score_harm            vha on vha.politician_id = p.id
  join v_score_speech_offenses vse on vse.politician_id = p.id
  where p.status = 'active'
) base;
