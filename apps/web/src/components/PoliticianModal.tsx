'use client'

import { useEffect, useState } from 'react'
import type { PoliticianFull, Grade, FactTable } from '@politi-score/types'
import { GRADE_COLORS, AXIS_LABELS, AXIS_ICONS, SEVERITY_LABELS } from '@politi-score/types'
import { getPoliticianBySlug } from '@/lib/politicians'
import PoliticianPhoto from './PoliticianPhoto'

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <div
      className="flex items-center justify-center font-black rounded-lg"
      style={{
        width: 40, height: 40, fontSize: 22,
        background: GRADE_COLORS[grade],
        color: grade === 'C' ? '#5a4800' : 'white',
        fontFamily: 'var(--font-barlow-condensed)',
      }}
    >
      {grade}
    </div>
  )
}

function ScoreBar({ grade }: { grade: Grade }) {
  return (
    <div className="flex rounded overflow-hidden h-5">
      {(['A', 'B', 'C', 'D', 'E'] as Grade[]).map((g) => (
        <div
          key={g}
          className="flex-1 flex items-center justify-center text-xs font-black transition-all"
          style={{
            background: GRADE_COLORS[g],
            color: g === 'C' ? '#5a4800' : 'white',
            fontFamily: 'var(--font-barlow-condensed)',
            flex: g === grade ? 2.5 : 1,
            fontSize: g === grade ? 13 : 11,
          }}
        >
          {g}
        </div>
      ))}
    </div>
  )
}

const SECTIONS: { key: FactTable; gradeKey: string; scoreKey: string }[] = [
  { key: 'probity',         gradeKey: 'grade_probity',         scoreKey: 'score_probity' },
  { key: 'harm',            gradeKey: 'grade_harm',            scoreKey: 'score_harm' },
  { key: 'conflicts',       gradeKey: 'grade_conflicts',       scoreKey: 'score_conflicts' },
  { key: 'opacity',         gradeKey: 'grade_opacity',         scoreKey: 'score_opacity' },
  { key: 'sincerity',       gradeKey: 'grade_sincerity',       scoreKey: 'score_sincerity' },
  { key: 'speech_offenses', gradeKey: 'grade_speech_offenses', scoreKey: 'score_speech_offenses' },
]

export default function PoliticianModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [politician, setPolitician] = useState<PoliticianFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPoliticianBySlug(slug).then((data) => {
      setPolitician(data)
      setLoading(false)
    })
  }, [slug])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl my-auto overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-lg z-10 transition-colors"
        >
          ✕
        </button>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mx-auto mb-3" />
              Chargement…
            </div>
          </div>
        ) : politician ? (
          <>
            <div className="flex">
              <div className="w-44 shrink-0 bg-gray-100 min-h-52">
                <PoliticianPhoto
                  src={politician.photo_url}
                  name={politician.full_name}
                  className="w-full h-full min-h-52"
                  initialsFontSize="3rem"
                />
              </div>
              <div className="flex-1 p-6 flex flex-col justify-end bg-gradient-to-r from-gray-50 to-white">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {politician.party} · {politician.level}
                </div>
                <div className="font-black text-3xl leading-tight mb-1" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
                  {politician.full_name}
                </div>
                <div className="text-sm text-gray-400 mb-4">{politician.role}</div>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex flex-col items-center gap-1 mr-2 pr-2 border-r border-gray-200">
                    <GradeBadge grade={politician.grade_general} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Général</span>
                  </div>
                  {SECTIONS.map((s) => {
                    const grade = (politician as unknown as Record<string, unknown>)[s.gradeKey] as Grade
                    return (
                      <div key={s.key} className="flex flex-col items-center gap-1">
                        <GradeBadge grade={grade} />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          {AXIS_LABELS[s.key].split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-6">
              {SECTIONS.map((section) => {
                const items = (politician as unknown as Record<string, unknown[]>)[section.key] ?? []
                const grade = (politician as unknown as Record<string, unknown>)[section.gradeKey] as Grade

                return (
                  <div key={section.key} className="mb-8">
                    <div className="flex items-center gap-3 mb-2 pb-2 border-b border-black/10">
                      <span className="text-lg">{AXIS_ICONS[section.key]}</span>
                      <span className="font-black text-base uppercase tracking-wide flex-1" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
                        {AXIS_LABELS[section.key]}
                      </span>
                      <GradeBadge grade={grade} />
                    </div>
                    <ScoreBar grade={grade} />
                    <div className="mt-3 space-y-2">
                      {items.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucun élément répertorié</p>
                      ) : (
                        items.map((item) => {
                          const it = item as Record<string, unknown>
                          const sev = SEVERITY_LABELS[it.severity as string]
                          const sources = (it.sources as Array<Record<string, unknown>>) ?? []
                          return (
                            <div key={it.id as string} className="bg-gray-50 rounded-lg p-3 border border-black/5">
                              <div className="flex items-start gap-2 mb-1">
                                <span className="font-bold text-sm flex-1">{it.title as string}</span>
                                {sev && (
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shrink-0"
                                    style={{ background: sev.color, color: '#333' }}
                                  >
                                    {sev.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed mb-2">
                                {(it.description as string) || (it.statement_correction as string)}
                              </p>
                              {sources.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {sources.map((s) => (
                                    <a
                                      key={s.id as string}
                                      href={s.url as string}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                      </svg>
                                      {s.label as string}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">Élu introuvable</div>
        )}
      </div>
    </div>
  )
}
