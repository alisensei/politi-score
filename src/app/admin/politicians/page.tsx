import { createSupabaseServerClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function AdminPoliticiansPage() {
  const supabase = await createSupabaseServerClient()
  const { data: politicians } = await supabase
    .from('scores_computed')
    .select('*')
    .order('full_name')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-black text-4xl" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          Élus ({politicians?.length ?? 0})
        </h1>
        <Link href="/admin/politicians/new"
          className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors">
          + Ajouter un élu
        </Link>
      </div>
      <div className="bg-white rounded-2xl border border-black/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--header-bg)' }}>
              <th className="text-left text-white text-xs font-bold uppercase tracking-widest px-6 py-4">Nom</th>
              <th className="text-left text-white text-xs font-bold uppercase tracking-widest px-4 py-4">Parti</th>
              <th className="text-left text-white text-xs font-bold uppercase tracking-widest px-4 py-4">Niveau</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-widest px-4 py-4">Note</th>
              <th className="text-center text-white text-xs font-bold uppercase tracking-widest px-4 py-4">Score</th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {politicians?.map((p, i) => (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4">
                  <div className="font-bold text-sm">{p.full_name}</div>
                  <div className="text-xs text-gray-400">{p.role}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">{p.party}</td>
                <td className="px-4 py-4 text-sm text-gray-600">{p.level}</td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-white text-lg"
                    style={{
                      fontFamily: 'var(--font-barlow-condensed)',
                      background: {A:'#038141',B:'#85BB2F',C:'#FECB02',D:'#EE8100',E:'#E63312'}[p.grade_general as string],
                      color: p.grade_general === 'C' ? '#5a4800' : 'white'
                    }}>
                    {p.grade_general}
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-sm font-bold text-gray-600">{p.score_general}/100</td>
                <td className="px-4 py-4 text-right">
                  <Link href={`/admin/politicians/${p.slug}`}
                    className="text-xs font-bold text-blue-600 hover:underline">
                    Gérer →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
