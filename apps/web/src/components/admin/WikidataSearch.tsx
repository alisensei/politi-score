'use client'

import { useEffect, useState } from 'react'

export interface WikidataPrefill {
  full_name: string
  party: string
  role: string
  mandate_start: string
  mandate_end: string
  photo_url: string
  wikidata_id: string
}

interface SearchResult {
  id: string
  label: string
  description?: string
}

const SEARCH_API = 'https://www.wikidata.org/w/api.php'

async function searchWikidata(query: string): Promise<SearchResult[]> {
  const url = `${SEARCH_API}?action=wbsearchentities&search=${encodeURIComponent(
    query
  )}&language=fr&format=json&origin=*&limit=8&type=item`
  const res = await fetch(url)
  const data = await res.json()
  return (
    data.search?.map((s: { id: string; label: string; description?: string }) => ({
      id: s.id,
      label: s.label,
      description: s.description,
    })) ?? []
  )
}

function parseWikidataDate(timeStr: string | undefined): string {
  if (!timeStr) return ''
  const m = timeStr.match(/^[+-](\d{4})-(\d{2})-(\d{2})/)
  if (!m) return ''
  return `${m[1]}-${m[2]}-${m[3]}`
}

function getActiveStatement(statements: any[] | undefined): any {
  if (!statements || statements.length === 0) return null
  return statements.find((s) => !s.qualifiers?.P582) ?? statements[statements.length - 1]
}

async function fetchEntities(qids: string[]): Promise<Record<string, any>> {
  if (qids.length === 0) return {}
  const url = `${SEARCH_API}?action=wbgetentities&ids=${qids.join(
    '|'
  )}&props=labels|claims&languages=fr&format=json&origin=*`
  const res = await fetch(url)
  const data = await res.json()
  return data.entities ?? {}
}

async function fetchLabels(qids: string[]): Promise<Record<string, string>> {
  if (qids.length === 0) return {}
  const url = `${SEARCH_API}?action=wbgetentities&ids=${qids.join(
    '|'
  )}&props=labels&languages=fr|en&format=json&origin=*`
  const res = await fetch(url)
  const data = await res.json()
  const out: Record<string, string> = {}
  for (const [qid, entity] of Object.entries<any>(data.entities ?? {})) {
    out[qid] = entity.labels?.fr?.value || entity.labels?.en?.value || ''
  }
  return out
}

async function buildPrefill(qid: string): Promise<WikidataPrefill> {
  const entities = await fetchEntities([qid])
  const entity = entities[qid]
  const claims = entity?.claims ?? {}

  const full_name = entity?.labels?.fr?.value || entity?.labels?.en?.value || ''

  // P18 → photo
  let photo_url = ''
  const photoFile = claims.P18?.[0]?.mainsnak?.datavalue?.value
  if (photoFile) {
    photo_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
      photoFile
    )}?width=400`
  }

  // P102 → parti (le plus récent sans P582)
  const partyClaim = getActiveStatement(claims.P102)
  const partyQid: string | undefined = partyClaim?.mainsnak?.datavalue?.value?.id

  // P39 → fonction + dates
  const positionClaim = getActiveStatement(claims.P39)
  const positionQid: string | undefined = positionClaim?.mainsnak?.datavalue?.value?.id
  const mandate_start = parseWikidataDate(
    positionClaim?.qualifiers?.P580?.[0]?.datavalue?.value?.time
  )
  const mandate_end = parseWikidataDate(
    positionClaim?.qualifiers?.P582?.[0]?.datavalue?.value?.time
  )

  const labelQids = [partyQid, positionQid].filter(Boolean) as string[]
  const labels = await fetchLabels(labelQids)

  return {
    full_name,
    party: partyQid ? labels[partyQid] ?? '' : '',
    role: positionQid ? labels[positionQid] ?? '' : '',
    mandate_start,
    mandate_end,
    photo_url,
    wikidata_id: qid,
  }
}

export default function WikidataSearch({
  onSelect,
}: {
  onSelect: (data: WikidataPrefill) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      setError('')
      try {
        const r = await searchWikidata(query)
        setResults(r)
      } catch {
        setError('Erreur de connexion à Wikidata')
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handlePick = async (qid: string) => {
    setFetching(true)
    setError('')
    try {
      const data = await buildPrefill(qid)
      onSelect(data)
      setQuery('')
      setResults([])
    } catch {
      setError("Impossible de récupérer les données de l'entité")
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="relative">
      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
        Recherche Wikidata
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tape un nom (ex. Emmanuel Macron, Marine Le Pen…)"
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-gray-800 transition-colors"
        disabled={fetching}
      />
      <p className="text-xs text-gray-400 mt-1">
        Pré-remplit le formulaire à partir de Wikidata. Tu peux ensuite tout modifier.
      </p>

      {(searching || fetching) && (
        <div className="absolute right-3 top-9 text-xs text-gray-400">
          {fetching ? 'Récupération…' : 'Recherche…'}
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs font-bold text-red-600">{error}</div>
      )}

      {results.length > 0 && (
        <div className="absolute z-10 mt-1 left-0 right-0 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handlePick(r.id)}
              disabled={fetching}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50"
            >
              <div className="font-bold text-sm">{r.label}</div>
              {r.description && (
                <div className="text-xs text-gray-500 mt-0.5">{r.description}</div>
              )}
              <div className="text-[10px] text-gray-300 mt-0.5">{r.id}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
