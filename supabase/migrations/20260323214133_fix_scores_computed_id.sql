drop view if exists scores_computed;

create view scores_computed as
select
  p.id                          as id,
  p.id                          as politician_id,
  p.full_name,
  p.slug,
  p.party,
  p.role,
  p.level,
  p.status,
  vc.score                      as score_corruption,
  vl.score                      as score_lies,
  vco.score                     as score_conflicts,
  vp.score                      as score_patrimoine,
  vf.score                      as score_financement,
  round(
    vc.score  * 0.30 +
    vl.score  * 0.20 +
    vco.score * 0.20 +
    vp.score  * 0.15 +
    vf.score  * 0.15
  )::integer                    as score_general,
  case
    when round(vc.score*0.30+vl.score*0.20+vco.score*0.20+vp.score*0.15+vf.score*0.15) >= 80 then 'A'
    when round(vc.score*0.30+vl.score*0.20+vco.score*0.20+vp.score*0.15+vf.score*0.15) >= 60 then 'B'
    when round(vc.score*0.30+vl.score*0.20+vco.score*0.20+vp.score*0.15+vf.score*0.15) >= 40 then 'C'
    when round(vc.score*0.30+vl.score*0.20+vco.score*0.20+vp.score*0.15+vf.score*0.15) >= 20 then 'D'
    else 'E'
  end                           as grade_general,
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