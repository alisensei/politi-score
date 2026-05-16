import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: politiciansCount },
    { count: pendingCount },
    { count: affairsCount },
  ] = await Promise.all([
    supabase.from('politicians').select('*', { count: 'exact', head: true }),
    supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('affairs').select('*', { count: 'exact', head: true }).eq('review_status', 'approved'),
  ])

  const stats = [
    { label: 'Élus référencés', value: politiciansCount ?? 0, color: '#1a1a2e' },
    { label: 'Contributions en attente', value: pendingCount ?? 0, color: '#EE8100' },
    { label: 'Affaires approuvées', value: affairsCount ?? 0, color: '#E63312' },
  ]

  return (
    <div>
      <h1 className="font-black text-4xl mb-8" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
        Dashboard
      </h1>
      <div className="grid grid-cols-3 gap-6 mb-10">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-6 border border-black/10">
            <div className="text-4xl font-black mb-1" style={{ color: s.color, fontFamily: 'var(--font-barlow-condensed)' }}>
              {s.value}
            </div>
            <div className="text-sm text-gray-400 font-bold">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        <a href="/admin/politicians/new"
          className="bg-gray-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors">
          + Ajouter un élu
        </a>
        <a href="/admin/politicians"
          className="border-2 border-gray-900 text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors">
          Gérer les élus
        </a>
      </div>
    </div>
  )
}
