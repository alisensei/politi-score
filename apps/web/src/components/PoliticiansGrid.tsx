'use client'

import { useState } from 'react'
import type { PoliticianWithScores, Grade, PoliticianLevel } from '@politi-score/types'
import { GRADE_COLORS, GRADE_LABELS } from '@politi-score/types'
import PoliticianCard from './PoliticianCard'
import PoliticianModal from './PoliticianModal'

const LEVELS: PoliticianLevel[] = ['Gouvernement', 'Parlement', 'Régional', 'Local', 'Européen']
const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E']

export default function PoliticiansGrid({ politicians }: { politicians: PoliticianWithScores[] }) {
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<Grade | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<PoliticianLevel | 'all'>('all')
  const [sort, setSort] = useState<'name' | 'score-asc' | 'score-desc'>('name')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const filtered = politicians
    .filter(p => {
      const q = search.toLowerCase()
      if (q && !p.full_name.toLowerCase().includes(q) && !p.party.toLowerCase().includes(q)) return false
      if (gradeFilter !== 'all' && p.grade_general !== gradeFilter) return false
      if (levelFilter !== 'all' && p.level !== levelFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'name') return a.full_name.localeCompare(b.full_name)
      if (sort === 'score-asc') return a.score_general - b.score_general
      return b.score_general - a.score_general
    })

  return (
    <>
      {/* Header */}
      <header style={{ background: 'var(--header-bg)' }} className="sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {GRADES.map((g) => (
                <span key={g} className="block w-2.5 h-7 rounded-sm" style={{ background: GRADE_COLORS[g] }} />
              ))}
            </div>
            <div>
              <span className="text-white font-black text-2xl tracking-wider uppercase" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
                Politi-Score
              </span>
              <span className="block text-white/40 text-[10px] uppercase tracking-widest -mt-1">
                La transparence en toute lettre
              </span>
            </div>
          </div>
          <div className="flex-1 max-w-sm flex items-center bg-white/10 border border-white/15 rounded-lg px-3 h-10 gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={0.5}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher un élu…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder-white/40 text-sm w-full"
            />
          </div>
          <nav className="hidden md:flex gap-1">
            <button
              onClick={() => setLevelFilter('all')}
              className={`text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md transition-colors ${levelFilter === 'all' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              Tous
            </button>
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-md transition-colors ${levelFilter === l ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-black/10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Note :</span>
          <button
            onClick={() => setGradeFilter('all')}
            className={`text-xs font-bold px-4 py-1.5 rounded-full border-2 transition-all ${gradeFilter === 'all' ? 'border-gray-800 text-gray-800 bg-gray-100' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
          >
            Toutes
          </button>
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className="text-xs font-bold px-4 py-1.5 rounded-full border-2 transition-all"
              style={{
                borderColor: gradeFilter === g ? GRADE_COLORS[g] : '#e5e7eb',
                color: gradeFilter === g ? GRADE_COLORS[g] : '#9ca3af',
                background: gradeFilter === g ? `${GRADE_COLORS[g]}15` : 'transparent',
              }}
            >
              {g} — {GRADE_LABELS[g]}
            </button>
          ))}
          <div className="ml-auto">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as typeof sort)}
              className="text-xs font-bold border-2 border-gray-200 rounded-full px-4 py-1.5 text-gray-400 outline-none bg-transparent"
            >
              <option value="name">Nom A→Z</option>
              <option value="score-desc">Meilleure note</option>
              <option value="score-asc">Pire note</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
          {filtered.length} élu{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </p>

        {/* Score legend */}
        <div className="flex rounded-lg overflow-hidden h-8 mb-2 max-w-sm">
          {GRADES.map(g => (
            <div key={g} className="flex-1 flex items-center justify-center font-black text-lg text-white"
              style={{ background: GRADE_COLORS[g], color: g === 'C' ? 'var(--score-c-text)' : 'white', fontFamily: 'var(--font-barlow-condensed)' }}>
              {g}
            </div>
          ))}
        </div>
        <div className="flex max-w-sm mb-8">
          {GRADES.map(g => (
            <div key={g} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {GRADE_LABELS[g]}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-bold">Aucun élu trouvé</p>
            <p className="text-sm mt-2">Modifie les filtres ou la recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filtered.map(p => (
              <PoliticianCard
                key={p.id}
                politician={p}
                onClick={() => setSelectedSlug(p.slug)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedSlug && (
        <PoliticianModal
          slug={selectedSlug}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </>
  )
}
