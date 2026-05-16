export type Grade = 'A' | 'B' | 'C' | 'D' | 'E'

export type PoliticianLevel =
  | 'Gouvernement'
  | 'Parlement'
  | 'Régional'
  | 'Local'
  | 'Européen'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

// ============================================================
// 6 axes éthiques
// ============================================================

export type ProbitySeverity =
  | 'condamnation_definitive'
  | 'condamnation_premiere_instance'
  | 'mise_en_examen'
  | 'enquete_judiciaire'
  | 'soupcons_documentes'

export type ConflictSeverity =
  | 'non_declare_etabli'
  | 'partiellement_declare'
  | 'declare_problematique'
  | 'potentiel'

export type OpacitySeverity =
  | 'omission_volontaire'
  | 'declaration_incomplete'
  | 'irregularite_constatee'
  | 'retard_anomalie'

export type SinceritySeverity =
  | 'mensonge_repete'
  | 'mensonge_etabli'
  | 'inexactitude_etablie'
  | 'approximation'

export type HarmSeverity =
  | 'condamnation_violences_sexuelles'
  | 'condamnation_violences'
  | 'mise_en_examen_violences'
  | 'accusations_documentees'
  | 'signalements_publics'

export type SpeechOffenseSeverity =
  | 'condamnation_provocation_haine'
  | 'condamnation_injure_diffamation'
  | 'condamnation_outrage'
  | 'polemique_documentee'

export type FactTable =
  | 'probity'
  | 'conflicts'
  | 'opacity'
  | 'sincerity'
  | 'harm'
  | 'speech_offenses'

export type LinkedType =
  | 'probity'
  | 'conflict'
  | 'opacity'
  | 'sincerity'
  | 'harm'
  | 'speech_offense'

export interface Source {
  id: string
  linked_id: string
  linked_type: LinkedType
  label: string
  url: string
  source_type: 'presse' | 'legal' | 'officiel' | 'hatvp' | 'parquet' | 'autre'
  media_name?: string
  publication_date?: string
  is_legal_doc: boolean
  is_verified: boolean
}

interface BaseFact {
  id: string
  politician_id: string
  title: string
  review_status: ReviewStatus
  created_at: string
  sources?: Source[]
}

export interface Probity extends BaseFact {
  description: string
  severity: ProbitySeverity
  date_start?: string
  date_end?: string
  is_active: boolean
}

export interface Conflict extends BaseFact {
  description: string
  severity: ConflictSeverity
  conflict_type?: 'financier' | 'familial' | 'professionnel' | 'actionariat'
  declared_hatvp: boolean
}

export interface Opacity extends BaseFact {
  description: string
  severity: OpacitySeverity
  date_constat?: string
}

export interface Sincerity extends BaseFact {
  statement_original: string
  statement_correction: string
  severity: SinceritySeverity
  date_declared?: string
  fact_check_org?: string
}

export interface Harm extends BaseFact {
  description: string
  severity: HarmSeverity
  date_start?: string
}

export interface SpeechOffense extends BaseFact {
  description: string
  severity: SpeechOffenseSeverity
  date_event?: string
}

// ============================================================
// Politicien + scores
// ============================================================

export interface PoliticianScores {
  score_probity: number
  score_conflicts: number
  score_opacity: number
  score_sincerity: number
  score_harm: number
  score_speech_offenses: number
  score_general: number
  grade_probity: Grade
  grade_conflicts: Grade
  grade_opacity: Grade
  grade_sincerity: Grade
  grade_harm: Grade
  grade_speech_offenses: Grade
  grade_general: Grade
}

export interface Politician {
  id: string
  slug: string
  full_name: string
  photo_url?: string
  party: string
  role: string
  level: PoliticianLevel
  mandate_start: string
  mandate_end?: string
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface PoliticianWithScores extends Politician, PoliticianScores {}

export interface PoliticianFull extends PoliticianWithScores {
  probity: Probity[]
  conflicts: Conflict[]
  opacity: Opacity[]
  sincerity: Sincerity[]
  harm: Harm[]
  speech_offenses: SpeechOffense[]
}

// ============================================================
// Constantes UI
// ============================================================

export const AXIS_LABELS: Record<FactTable, string> = {
  probity: 'Probité',
  conflicts: "Conflits d'intérêts",
  opacity: 'Opacité financière',
  sincerity: 'Sincérité',
  harm: 'Atteintes aux personnes',
  speech_offenses: "Délits d'expression",
}

export const AXIS_SHORT: Record<FactTable, string> = {
  probity: 'Prob.',
  conflicts: 'Conf.',
  opacity: 'Opac.',
  sincerity: 'Sinc.',
  harm: 'Att.',
  speech_offenses: 'Expr.',
}

export const AXIS_ICONS: Record<FactTable, string> = {
  probity: '⚖️',
  conflicts: '🔗',
  opacity: '🏛️',
  sincerity: '📋',
  harm: '👤',
  speech_offenses: '💬',
}

export const SEVERITIES_BY_TABLE: Record<FactTable, readonly string[]> = {
  probity: [
    'condamnation_definitive',
    'condamnation_premiere_instance',
    'mise_en_examen',
    'enquete_judiciaire',
    'soupcons_documentes',
  ],
  conflicts: [
    'non_declare_etabli',
    'partiellement_declare',
    'declare_problematique',
    'potentiel',
  ],
  opacity: [
    'omission_volontaire',
    'declaration_incomplete',
    'irregularite_constatee',
    'retard_anomalie',
  ],
  sincerity: [
    'mensonge_repete',
    'mensonge_etabli',
    'inexactitude_etablie',
    'approximation',
  ],
  harm: [
    'condamnation_violences_sexuelles',
    'condamnation_violences',
    'mise_en_examen_violences',
    'accusations_documentees',
    'signalements_publics',
  ],
  speech_offenses: [
    'condamnation_provocation_haine',
    'condamnation_injure_diffamation',
    'condamnation_outrage',
    'polemique_documentee',
  ],
}

export const LINKED_TYPE_BY_TABLE: Record<FactTable, LinkedType> = {
  probity: 'probity',
  conflicts: 'conflict',
  opacity: 'opacity',
  sincerity: 'sincerity',
  harm: 'harm',
  speech_offenses: 'speech_offense',
}

export const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  // Probity
  condamnation_definitive:        { label: 'Condamnation définitive',        color: '#fde8e8' },
  condamnation_premiere_instance: { label: 'Condamné (1re instance)',         color: '#fde8e8' },
  mise_en_examen:                 { label: 'Mis en examen',                  color: '#fef3e2' },
  enquete_judiciaire:             { label: 'Enquête judiciaire',             color: '#fef9e7' },
  soupcons_documentes:            { label: 'Soupçons documentés',            color: '#fef9e7' },
  // Conflicts
  non_declare_etabli:             { label: 'Non déclaré (établi)',           color: '#fde8e8' },
  partiellement_declare:          { label: 'Partiellement déclaré',          color: '#fef3e2' },
  declare_problematique:          { label: 'Déclaré mais problématique',     color: '#fef9e7' },
  potentiel:                      { label: 'Potentiel',                      color: '#f0f0f0' },
  // Opacity
  omission_volontaire:            { label: 'Omission volontaire',            color: '#fde8e8' },
  declaration_incomplete:         { label: 'Déclaration incomplète',         color: '#fef3e2' },
  irregularite_constatee:         { label: 'Irrégularité constatée',         color: '#fef3e2' },
  retard_anomalie:                { label: 'Retard / anomalie',              color: '#fef9e7' },
  // Sincerity
  mensonge_repete:                { label: 'Mensonge répété',                color: '#fde8e8' },
  mensonge_etabli:                { label: 'Mensonge établi',                color: '#fef3e2' },
  inexactitude_etablie:           { label: 'Inexactitude établie',           color: '#fef9e7' },
  approximation:                  { label: 'Approximation',                  color: '#f0f0f0' },
  // Harm
  condamnation_violences_sexuelles: { label: 'Condamnation violences sexuelles', color: '#fde8e8' },
  condamnation_violences:         { label: 'Condamnation pour violences',    color: '#fde8e8' },
  mise_en_examen_violences:       { label: 'Mis en examen (violences)',      color: '#fef3e2' },
  accusations_documentees:        { label: 'Accusations documentées',        color: '#fef9e7' },
  signalements_publics:           { label: 'Signalements publics',           color: '#fef9e7' },
  // Speech offenses
  condamnation_provocation_haine:    { label: 'Condamnation provocation à la haine', color: '#fde8e8' },
  condamnation_injure_diffamation:   { label: 'Condamnation injure/diffamation',     color: '#fef3e2' },
  condamnation_outrage:              { label: 'Condamnation outrage',                color: '#fef9e7' },
  polemique_documentee:              { label: 'Polémique documentée',                color: '#f0f0f0' },
}

export const GRADE_COLORS: Record<Grade, string> = {
  A: '#038141',
  B: '#85BB2F',
  C: '#FECB02',
  D: '#EE8100',
  E: '#E63312',
}

export const GRADE_LABELS: Record<Grade, string> = {
  A: 'Irréprochable',
  B: 'Bien',
  C: 'Moyen',
  D: 'Préoccupant',
  E: 'Très préoccupant',
}

export function scoreToGrade(score: number): Grade {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  if (score >= 20) return 'D'
  return 'E'
}
