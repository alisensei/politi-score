import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import AddFactForm from '@/components/admin/AddFactForm'
import DeletePoliticianButton from '@/components/admin/DeletePoliticianButton'
import WikipediaImport from '@/components/admin/WikipediaImport'
import { AXIS_LABELS, GRADE_COLORS, SEVERITIES_BY_TABLE, type FactTable } from '@politi-score/types'

const AXES: { table: FactTable; gradeKey: string; scoreKey: string }[] = [
  { table: 'probity',         gradeKey: 'grade_probity',         scoreKey: 'score_probity' },
  { table: 'conflicts',       gradeKey: 'grade_conflicts',       scoreKey: 'score_conflicts' },
  { table: 'opacity',         gradeKey: 'grade_opacity',         scoreKey: 'score_opacity' },
  { table: 'sincerity',       gradeKey: 'grade_sincerity',       scoreKey: 'score_sincerity' },
  { table: 'harm',            gradeKey: 'grade_harm',            scoreKey: 'score_harm' },
  { table: 'speech_offenses', gradeKey: 'grade_speech_offenses', scoreKey: 'score_speech_offenses' },
]

export default async function AdminPoliticianPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data: politician } = await supabase
    .from('scores_computed')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!politician) notFound()

  const factsData = await Promise.all(
    AXES.map((a) =>
      supabase.from(a.table).select('*, sources(*)').eq('politician_id', politician.politician_id).order('created_at', { ascending: false })
    )
  )

  const sections = AXES.map((a, i) => ({
    table: a.table,
    label: AXIS_LABELS[a.table],
    grade: (politician as Record<string, unknown>)[a.gradeKey] as string,
    score: (politician as Record<string, unknown>)[a.scoreKey] as number,
    items: factsData[i].data ?? [],
    severities: SEVERITIES_BY_TABLE[a.table],
  }))

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin/politicians" className="text-gray-400 hover:text-gray-800 font-bold">←</a>
        <div>
          <h1 className="font-black text-4xl" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
            {politician.full_name}
          </h1>
          <p className="text-gray-400 text-sm">{politician.role} · {politician.party} · {politician.level}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {AXES.map((a) => {
            const g = (politician as Record<string, unknown>)[a.gradeKey] as string
            return (
              <div key={a.table} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    background: GRADE_COLORS[g as 'A' | 'B' | 'C' | 'D' | 'E'],
                    color: g === 'C' ? '#5a4800' : 'white',
                  }}>
                  {g}
                </div>
                <span className="text-[9px] font-bold uppercase text-gray-400">
                  {AXIS_LABELS[a.table].slice(0, 8)}
                </span>
              </div>
            )
          })}
          <div className="flex flex-col items-center gap-1 ml-2 pl-2 border-l border-gray-200">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                background: GRADE_COLORS[politician.grade_general as 'A' | 'B' | 'C' | 'D' | 'E'],
                color: politician.grade_general === 'C' ? '#5a4800' : 'white',
              }}>
              {politician.grade_general}
            </div>
            <span className="text-[9px] font-bold uppercase text-gray-400">Général</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-8">
        <WikipediaImport
          politicianId={politician.politician_id}
          slug={slug}
          fullName={politician.full_name}
        />
        <DeletePoliticianButton politicianId={politician.politician_id} fullName={politician.full_name} />
      </div>

      {sections.map((section) => (
        <div key={section.table} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-black text-2xl flex-1" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
              {section.label}
            </h2>
            <span className="text-sm font-bold text-gray-400">{section.score}/100</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                background: GRADE_COLORS[section.grade as 'A' | 'B' | 'C' | 'D' | 'E'],
                color: section.grade === 'C' ? '#5a4800' : 'white',
              }}>
              {section.grade}
            </div>
          </div>

          {section.items.length > 0 && (
            <div className="space-y-2 mb-4">
              {section.items.map((item) => {
                const it = item as Record<string, unknown>
                return (
                  <div key={it.id as string} className="bg-white rounded-xl border border-black/10 px-5 py-4 flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">{it.title as string}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          it.review_status === 'approved' ? 'bg-green-100 text-green-700' :
                          it.review_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {it.review_status as string}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {it.severity as string}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {(it.description as string) || (it.statement_correction as string)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <AddFactForm
            politicianId={politician.politician_id}
            table={section.table}
            severities={section.severities}
            slug={slug}
          />
        </div>
      ))}
    </div>
  )
}
