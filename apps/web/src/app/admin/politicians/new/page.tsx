'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

const LEVELS = ['Gouvernement', 'Parlement', 'Régional', 'Local', 'Européen']

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NewPoliticianPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', party: '', role: '', level: 'Parlement',
    mandate_start: '', mandate_end: '', photo_url: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.full_name || !form.party || !form.role || !form.mandate_start) {
      setError('Nom, parti, rôle et date de début sont obligatoires.')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('politicians').insert({
      slug: slugify(form.full_name),
      full_name: form.full_name,
      party: form.party,
      role: form.role,
      level: form.level,
      mandate_start: form.mandate_start,
      mandate_end: form.mandate_end || null,
      photo_url: form.photo_url || null,
      status: 'active',
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/admin/politicians')
  }

  const inputClass = "w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-gray-800 transition-colors"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2"

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin/politicians" className="text-gray-400 hover:text-gray-800 font-bold transition-colors">←</a>
        <h1 className="font-black text-4xl" style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          Ajouter un élu
        </h1>
      </div>
      <div className="bg-white rounded-2xl border border-black/10 p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className={labelClass}>Nom complet *</label>
            <input className={inputClass} value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Emmanuel Macron" />
            {form.full_name && (
              <p className="text-xs text-gray-400 mt-1">Slug : {slugify(form.full_name)}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Parti *</label>
            <input className={inputClass} value={form.party}
              onChange={e => set('party', e.target.value)}
              placeholder="Renaissance" />
          </div>
          <div>
            <label className={labelClass}>Niveau *</label>
            <select className={inputClass} value={form.level}
              onChange={e => set('level', e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Rôle / Fonction *</label>
            <input className={inputClass} value={form.role}
              onChange={e => set('role', e.target.value)}
              placeholder="Président de la République" />
          </div>
          <div>
            <label className={labelClass}>Début de mandat *</label>
            <input type="date" className={inputClass} value={form.mandate_start}
              onChange={e => set('mandate_start', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Fin de mandat</label>
            <input type="date" className={inputClass} value={form.mandate_end}
              onChange={e => set('mandate_end', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>URL photo officielle</label>
            <input className={inputClass} value={form.photo_url}
              onChange={e => set('photo_url', e.target.value)}
              placeholder="https://..." />
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-sm uppercase tracking-widest">
          {saving ? 'Enregistrement…' : "Ajouter l'élu"}
        </button>
      </div>
    </div>
  )
}