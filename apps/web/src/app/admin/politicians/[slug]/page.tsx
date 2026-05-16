import { createSupabaseServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import AddFactForm from '@/components/admin/AddFactForm'
import DeletePoliticianButton from '@/components/admin/DeletePoliticianButton'

const GRADE_COLORS: Record<string, string> = {
  A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63312'
}

export default async function AdminPoliticianPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data: politician } = await supabase
    .from('scores_computed')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!politician) notFound()

  const [affairs, lies, conflicts, patrimoine, financement] = await Promise.all([
    supabase.from('affairs').select('*, sources(*)').eq('politician_id', politician.politician_id).order('created_at', { ascending: false }),
    supabase.from('lies').select('*, sources(*)').eq('politician_id', politician.politician_id).order('created_at', { ascending: false }),
    supabase.from('conflicts').select('*, sources(*)').eq('politician_id', politician.politician_id).order('created_at', { ascending: false }),
    supabase.from('patrimoine').select('*, sources(*)').eq('politician_id', politician.politician_id).order('created_at', { ascending: false }),
    supabase.from('financement').select('*, sources(*)').eq('politician_id', politician.politician_id).order('created_at', { ascending: false }),
  ])

  const sections = [
    { key: 'affairs' as const, label: 'Affaires & Corruption', grade: politician.grade_corruption, score: politician.score_corruption, items: affairs.data ?? [], severities: ['condamne','mis_en_examen','inculpe','soupcon','classe'] },
    { key: 'lies' as const, label: 'Mensonges', grade: politician.grade_lies, score: politician.score_lies, items: lies.data ?? [], severities: ['avere','etabli','probable','nuance'] },
    { key: 'conflicts' as const, label: "Conflits d'intérêts", grade: politician.grade_conflicts, score: politician.score_conflicts, items: conflicts.data ?? [], severities: ['avere','soupcon','potentiel'] },
    { key: 'patrimoine' as const, label: 'Transparence patrimoniale', grade: politician.grade_patrimoine, score: politician.score_patrimoine, items: patrimoine.data ?? [], severities: ['omission_volontaire','declaration_incomplete','retard'] },
    { key: 'financement' as const, label: 'Financement politique', grade: politician.grade_financement, score: politician.score_financement, items: financement.data ?? [], severities: ['condamnation_cnccfp','irregularite_constatee','anomalie_signalee'] },
  ]

  return (
    <div>
      {/* Header élu */}
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin/politicians" className="text-gray-400 hover:text-gray-800 font-bold">←</a>
        <div>
          <h1 className="font-black text-4xl" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
            {politician.full_name}
          </h1>
          <p className="text-gray-400 text-sm">{politician.role} · {politician.party} · {politician.level}</p>
        </div>
        <div className="ml-auto flex gap-3">
          {['grade_corruption','grade_lies','grade_conflicts','grade_patrimoine','grade_financement','grade_general'].map(k => (
            <div key={k} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  background: GRADE_COLORS[(politician as any)[k]],
                  color: (politician as any)[k] === 'C' ? '#5a4800' : 'white'
                }}>
                {(politician as any)[k]}
              </div>
              <span className="text-[9px] font-bold uppercase text-gray-400">
                {k.replace('grade_','').slice(0,4)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end mb-8">
        <DeletePoliticianButton politicianId={politician.politician_id} fullName={politician.full_name} />
      </div>

      {/* Sections */}
      {sections.map(section => (
        <div key={section.key} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-black text-2xl flex-1" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
              {section.label}
            </h2>
            <span className="text-sm font-bold text-gray-400">{section.score}/100</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                background: GRADE_COLORS[section.grade],
                color: section.grade === 'C' ? '#5a4800' : 'white'
              }}>
              {section.grade}
            </div>
          </div>

          {/* Liste des entrées existantes */}
          {section.items.length > 0 && (
            <div className="space-y-2 mb-4">
              {section.items.map((item: any) => (
                <div key={item.id} className="bg-white rounded-xl border border-black/10 px-5 py-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{item.title}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${item.review_status === 'approved' ? 'bg-green-100 text-green-700' : item.review_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {item.review_status}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{item.description || item.statement_correction}</p>
                    {item.sources?.length > 0 && (
                      <p className="text-xs text-blue-500 mt-1">{item.sources.length} source(s)</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire d'ajout */}
          <AddFactForm
            politicianId={politician.politician_id}
            table={section.key}
            severities={section.severities}
            slug={slug}
          />
        </div>
      ))}
    </div>
  )
}