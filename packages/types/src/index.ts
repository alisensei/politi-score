export type Grade = 'A' | 'B' | 'C' | 'D' | 'E'

export type PoliticianLevel =
  | 'Gouvernement'
  | 'Parlement'
  | 'Régional'
  | 'Local'
  | 'Européen'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type AffairSeverity =
  | 'condamne'
  | 'mis_en_examen'
  | 'inculpe'
  | 'soupcon'
  | 'classe'

export type LieSeverity = 'avere' | 'etabli' | 'probable' | 'nuance'

export type ConflictSeverity = 'avere' | 'soupcon' | 'potentiel'

export type PatrimoineSeverity =
  | 'omission_volontaire'
  | 'declaration_incomplete'
  | 'retard'

export type FinancementSeverity =
  | 'condamnation_cnccfp'
  | 'irregularite_constatee'
  | 'anomalie_signalee'

export interface Source {
  id: string
  linked_id: string
  linked_type: 'affair' | 'lie' | 'conflict' | 'patrimoine' | 'financement'
  label: string
  url: string
  source_type: 'presse' | 'legal' | 'officiel' | 'hatvp' | 'parquet' | 'autre'
  media_name?: string
  publication_date?: string
  is_legal_doc: boolean
  is_verified: boolean
}

export interface Affair {
  id: string
  politician_id: string
  title: string
  description: string
  severity: AffairSeverity
  judicial_status?: string
  date_start?: string
  date_end?: string
  is_active: boolean
  review_status: ReviewStatus
  created_at: string
  sources?: Source[]
}

export interface Lie {
  id: string
  politician_id: string
  title: string
  statement_original: string
  statement_correction: string
  severity: LieSeverity
  date_declared?: string
  fact_check_org?: string
  review_status: ReviewStatus
  created_at: string
  sources?: Source[]
}

export interface Conflict {
  id: string
  politician_id: string
  title: string
  description: string
  severity: ConflictSeverity
  conflict_type: 'financier' | 'familial' | 'professionnel' | 'actionariat'
  declared_hatvp: boolean
  review_status: ReviewStatus
  created_at: string
  sources?: Source[]
}

export interface Patrimoine {
  id: string
  politician_id: string
  title: string
  description: string
  severity: PatrimoineSeverity
  date_constat?: string
  review_status: ReviewStatus
  created_at: string
  sources?: Source[]
}

export interface Financement {
  id: string
  politician_id: string
  title: string
  description: string
  severity: FinancementSeverity
  date_constat?: string
  review_status: ReviewStatus
  created_at: string
  sources?: Source[]
}

export interface PoliticianScores {
  score_corruption: number
  score_lies: number
  score_conflicts: number
  score_patrimoine: number
  score_financement: number
  score_general: number
  grade_corruption: Grade
  grade_lies: Grade
  grade_conflicts: Grade
  grade_patrimoine: Grade
  grade_financement: Grade
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
  affairs: Affair[]
  lies: Lie[]
  conflicts: Conflict[]
  patrimoine: Patrimoine[]
  financement: Financement[]
}

export const SCORE_LABELS: Record<string, string> = {
  score_corruption: 'Corruption',
  score_lies: 'Mensonges',
  score_conflicts: "Conflits d'intérêts",
  score_patrimoine: 'Transparence patrimoniale',
  score_financement: 'Financement politique',
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
