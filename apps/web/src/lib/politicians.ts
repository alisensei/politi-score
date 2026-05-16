import { supabase } from './supabase'
import type { PoliticianWithScores, PoliticianFull, Source } from '@politi-score/types'

export async function getAllPoliticians(): Promise<PoliticianWithScores[]> {
  const { data, error } = await supabase
    .from('scores_computed')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data ?? []
}

type FactTable = 'affairs' | 'lies' | 'conflicts' | 'patrimoine' | 'financement'

const LINKED_TYPE_BY_TABLE: Record<FactTable, Source['linked_type']> = {
  affairs: 'affair',
  lies: 'lie',
  conflicts: 'conflict',
  patrimoine: 'patrimoine',
  financement: 'financement',
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

  const [affairs, lies, conflicts, patrimoine, financement] = await Promise.all([
    fetchFactsWithSources('affairs', scores.politician_id),
    fetchFactsWithSources('lies', scores.politician_id),
    fetchFactsWithSources('conflicts', scores.politician_id),
    fetchFactsWithSources('patrimoine', scores.politician_id),
    fetchFactsWithSources('financement', scores.politician_id),
  ])

  return {
    ...scores,
    affairs: affairs as PoliticianFull['affairs'],
    lies: lies as PoliticianFull['lies'],
    conflicts: conflicts as PoliticianFull['conflicts'],
    patrimoine: patrimoine as PoliticianFull['patrimoine'],
    financement: financement as PoliticianFull['financement'],
  }
}
