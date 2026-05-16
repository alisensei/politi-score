'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addFact } from '@/app/admin/politicians/[slug]/actions'

type FactTable = 'affairs' | 'lies' | 'conflicts' | 'patrimoine' | 'financement'

interface ProposedSource {
  label: string
  url: string
  source_type: string
}

interface ProposedItem {
  category: FactTable
  title: string
  description: string
  severity: string
  sources: ProposedSource[]
}

const CATEGORY_LABELS: Record<FactTable, string> = {
  affairs: 'Affaire',
  lies: 'Mensonge',
  conflicts: "Conflit d'intérêts",
  patrimoine: 'Patrimoine',
  financement: 'Financement',
}

const CATEGORY_COLORS: Record<FactTable, string> = {
  affairs: 'bg-red-50 border-red-200 text-red-700',
  lies: 'bg-orange-50 border-orange-200 text-orange-700',
  conflicts: 'bg-purple-50 border-purple-200 text-purple-700',
  patrimoine: 'bg-blue-50 border-blue-200 text-blue-700',
  financement: 'bg-green-50 border-green-200 text-green-700',
}

function defaultSlug(name: string): string {
  return name.replace(/ /g, '_')
}

function buildPayload(item: ProposedItem, politicianId: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    politician_id: politicianId,
    title: item.title,
    severity: item.severity,
    review_status: 'approved',
  }
  if (item.category === 'lies') {
    base.statement_original = ''
    base.statement_correction = item.description
  } else {
    base.description = item.description
  }
  if (item.category === 'affairs') base.is_active = true
  if (item.category === 'conflicts') {
    base.conflict_type = 'financier'
    base.declared_hatvp = false
  }
  return base
}

export default function WikipediaImport({
  politicianId,
  slug,
  fullName,
}: {
  politicianId: string
  slug: string
  fullName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [wikipediaSlug, setWikipediaSlug] = useState(defaultSlug(fullName))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ProposedItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 })

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const updateItem = (idx: number, patch: Partial<ProposedItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const handleFetch = async () => {
    setLoading(true)
    setError('')
    setItems([])
    setSelected(new Set())
    try {
      const res = await fetch('/api/admin/import-wikipedia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wikipediaSlug }),
      })
      const text = await res.text()
      if (!text) {
        if (res.status === 504) throw new Error('Timeout serveur (Vercel a coupé). Essaie un slug plus court ou upgrade le plan.')
        throw new Error(`Réponse vide (HTTP ${res.status}). Vérifie les logs Vercel Functions.`)
      }
      let data: { items?: unknown[]; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Réponse non-JSON (HTTP ${res.status}) : ${text.slice(0, 200)}`)
      }
      if (!res.ok) throw new Error(data.error || `Erreur HTTP ${res.status}`)
      const proposed = (data.items ?? []) as ProposedItem[]
      setItems(proposed)
      setSelected(new Set(proposed.map((_, i) => i)))
      if (proposed.length === 0) {
        setError('Aucun fait documenté détecté dans l\'article.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    const toImport = Array.from(selected).sort((a, b) => a - b).map((i) => items[i])
    if (toImport.length === 0) return
    setImporting(true)
    setError('')
    setProgress({ done: 0, total: toImport.length, failed: 0 })

    let failed = 0
    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i]
      const { error: err } = await addFact({
        table: item.category,
        slug,
        payload: buildPayload(item, politicianId),
        source: {
          label: item.sources[0].label,
          url: item.sources[0].url,
          source_type: item.sources[0].source_type,
          is_legal_doc: item.sources[0].source_type === 'legal',
        },
      })
      if (err) failed++
      setProgress({ done: i + 1, total: toImport.length, failed })
    }

    if (failed > 0) {
      setError(`${failed} entrée(s) ont échoué à l'import (les autres sont passées).`)
    }
    setImporting(false)
    setItems([])
    setSelected(new Set())
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 text-blue-700 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
      >
        Importer depuis Wikipedia
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-xl" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          Import Wikipedia
        </h3>
        <button
          onClick={() => { setOpen(false); setItems([]); setError('') }}
          className="text-gray-400 hover:text-gray-800 text-sm font-bold"
        >
          Fermer ✕
        </button>
      </div>

      <div className="flex gap-3 items-end mb-4">
        <div className="flex-1">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
            Slug Wikipedia FR (ex: Emmanuel_Macron)
          </label>
          <input
            value={wikipediaSlug}
            onChange={(e) => setWikipediaSlug(e.target.value)}
            placeholder="Emmanuel_Macron"
            disabled={loading || importing}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-gray-800 transition-colors"
          />
        </div>
        <button
          onClick={handleFetch}
          disabled={loading || importing || !wikipediaSlug.trim()}
          className="bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl text-sm uppercase tracking-widest"
        >
          {loading ? 'Analyse…' : 'Analyser'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            <span>{selected.size} / {items.length} sélectionné(s)</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set(items.map((_, i) => i)))}
                className="hover:text-gray-800"
              >
                Tout
              </button>
              <span>·</span>
              <button
                onClick={() => setSelected(new Set())}
                className="hover:text-gray-800"
              >
                Aucun
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`border-2 rounded-xl p-4 ${
                  selected.has(idx) ? 'border-gray-800 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(idx)}
                    onChange={() => toggle(idx)}
                    disabled={importing}
                    className="mt-1 w-5 h-5"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <input
                        value={item.severity}
                        onChange={(e) => updateItem(idx, { severity: e.target.value })}
                        disabled={importing}
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 border border-gray-200 outline-none focus:border-gray-800"
                      />
                    </div>
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(idx, { title: e.target.value })}
                      disabled={importing}
                      className="w-full font-bold text-sm border-b border-gray-200 focus:border-gray-800 outline-none py-1"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      disabled={importing}
                      rows={2}
                      className="w-full text-xs text-gray-600 border border-gray-200 focus:border-gray-800 outline-none rounded p-2 resize-none"
                    />
                    <div className="flex flex-wrap gap-1">
                      {item.sources.map((s, si) => (
                        <a
                          key={si}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100"
                        >
                          {s.label} ({s.source_type})
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {importing && (
              <span className="text-xs text-gray-400 font-bold">
                Import : {progress.done} / {progress.total} {progress.failed > 0 && `· ${progress.failed} échec(s)`}
              </span>
            )}
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="ml-auto bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl text-sm uppercase tracking-widest"
            >
              {importing ? 'Import en cours…' : `Importer ${selected.size} entrée(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
