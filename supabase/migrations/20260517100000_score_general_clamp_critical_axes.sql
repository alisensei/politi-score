-- ============================================================
-- Score général PLAFONNÉ par les axes critiques (probité + atteintes
-- aux personnes). La moyenne pondérée reste, mais elle ne peut pas
-- être meilleure que score_probity NI que score_harm.
-- → Balkany E en probité = E global, peu importe le reste.
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
  score_to_grade(base.score_general)        as grade_general,
  score_to_grade(base.score_probity)        as grade_probity,
  score_to_grade(base.score_conflicts)      as grade_conflicts,
  score_to_grade(base.score_opacity)        as grade_opacity,
  score_to_grade(base.score_sincerity)      as grade_sincerity,
  score_to_grade(base.score_harm)           as grade_harm,
  score_to_grade(base.score_speech_offenses) as grade_speech_offenses
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
    -- Score général : moyenne pondérée plafonnée par les 2 axes critiques.
    -- Pondération : probity 25%, harm 25%, conflicts 15%,
    --               opacity 15%, sincerity 10%, speech_offenses 10%
    least(
      round(
        vpr.score * 0.25 +
        vha.score * 0.25 +
        vci.score * 0.15 +
        vop.score * 0.15 +
        vsi.score * 0.10 +
        vse.score * 0.10
      )::integer,
      vpr.score::integer,
      vha.score::integer
    ) as score_general
  from politicians p
  join v_score_probity         vpr on vpr.politician_id = p.id
  join v_score_conflicts       vci on vci.politician_id = p.id
  join v_score_opacity         vop on vop.politician_id = p.id
  join v_score_sincerity       vsi on vsi.politician_id = p.id
  join v_score_harm            vha on vha.politician_id = p.id
  join v_score_speech_offenses vse on vse.politician_id = p.id
  where p.status = 'active'
) base;
