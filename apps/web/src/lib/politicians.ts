import { supabase } from './supabase'
import type {
  PoliticianWithScores,
  PoliticianFull,
  Source,
  FactTable,
} from '@politi-score/types'
import { LINKED_TYPE_BY_TABLE } from '@politi-score/types'

export async function getAllPoliticians(): Promise<PoliticianWithScores[]> {
  const { data, error } = await supabase
    .from('scores_computed')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data ?? []
}

async function fetchFactsWithSources<T extends { id: string }>(
  table: FactTable,
  politicianId: string
): Promise<(T & { sources: Source[] })[]> {
  const { data: facts } = await supabase
    .from(table)
    .select('*')
    .eq('politician_id', politicianId)
    .eq('review_status', 'approved')

  if (!facts || facts.length === 0) return []

  const factIds = facts.map((f) => f.id as string)
  const { data: sources } = await supabase
    .from('sources')
    .select('*')
    .eq('linked_type', LINKED_TYPE_BY_TABLE[table])
    .in('linked_id', factIds)

  const sourcesByFact = new Map<string, Source[]>()
  for (const s of (sources ?? []) as Source[]) {
    const list = sourcesByFact.get(s.linked_id) ?? []
    list.push(s)
    sourcesByFact.set(s.linked_id, list)
  }

  return facts.map((f) => ({
    ...(f as T),
    sources: sourcesByFact.get(f.id as string) ?? [],
  }))
}

export async function getPoliticianBySlug(slug: string): Promise<PoliticianFull | null> {
  const { data: scores, error } = await supabase
    .from('scores_computed')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !scores) return null

  const [probity, conflicts, opacity, sincerity, harm, speech_offenses] = await Promise.all([
    fetchFactsWithSources('probity', scores.politician_id),
    fetchFactsWithSources('conflicts', scores.politician_id),
    fetchFactsWithSources('opacity', scores.politician_id),
    fetchFactsWithSources('sincerity', scores.politician_id),
    fetchFactsWithSources('harm', scores.politician_id),
    fetchFactsWithSources('speech_offenses', scores.politician_id),
  ])

  return {
    ...scores,
    probity: probity as PoliticianFull['probity'],
    conflicts: conflicts as PoliticianFull['conflicts'],
    opacity: opacity as PoliticianFull['opacity'],
    sincerity: sincerity as PoliticianFull['sincerity'],
    harm: harm as PoliticianFull['harm'],
    speech_offenses: speech_offenses as PoliticianFull['speech_offenses'],
  }
}
