import { supabase } from './supabase'
import type { PoliticianWithScores, PoliticianFull } from '@politi-score/types'

export async function getAllPoliticians(): Promise<PoliticianWithScores[]> {
  const { data, error } = await supabase
    .from('scores_computed')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data ?? []
}

export async function getPoliticianBySlug(slug: string): Promise<PoliticianFull | null> {
  const { data: scores, error } = await supabase
    .from('scores_computed')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !scores) return null

  const [affairs, lies, conflicts, patrimoine, financement] = await Promise.all([
    supabase.from('affairs').select('*, sources(*)').eq('politician_id', scores.politician_id).eq('review_status', 'approved'),
    supabase.from('lies').select('*, sources(*)').eq('politician_id', scores.politician_id).eq('review_status', 'approved'),
    supabase.from('conflicts').select('*, sources(*)').eq('politician_id', scores.politician_id).eq('review_status', 'approved'),
    supabase.from('patrimoine').select('*, sources(*)').eq('politician_id', scores.politician_id).eq('review_status', 'approved'),
    supabase.from('financement').select('*, sources(*)').eq('politician_id', scores.politician_id).eq('review_status', 'approved'),
  ])

  return {
    ...scores,
    affairs: affairs.data ?? [],
    lies: lies.data ?? [],
    conflicts: conflicts.data ?? [],
    patrimoine: patrimoine.data ?? [],
    financement: financement.data ?? [],
  }
}
