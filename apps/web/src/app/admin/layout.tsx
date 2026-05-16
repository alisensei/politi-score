import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: contributor } = await supabase
    .from('contributors')
    .select('role')
    .eq('github_username', user.user_metadata.user_name)
    .single()

  if (!contributor || !['moderator', 'admin'].includes(contributor.role)) {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav style={{ background: 'var(--header-bg)' }} className="px-6 h-14 flex items-center gap-6">
        <span className="text-white font-black text-xl tracking-wider uppercase" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          Politi-Score Admin
        </span>
        <a href="/admin" className="text-white/60 hover:text-white text-sm font-bold transition-colors">Dashboard</a>
        <a href="/admin/politicians" className="text-white/60 hover:text-white text-sm font-bold transition-colors">Élus</a>
        <a href="/admin/contributions" className="text-white/60 hover:text-white text-sm font-bold transition-colors">Contributions</a>
        <a href="/" className="text-white/60 hover:text-white text-sm font-bold transition-colors ml-auto">← Site public</a>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
