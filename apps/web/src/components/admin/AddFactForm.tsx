'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addFact } from '@/app/admin/politicians/[slug]/actions'

type FactTable = 'affairs' | 'lies' | 'conflicts' | 'patrimoine' | 'financement'

interface Props {
  politicianId: string
  table: FactTable
  severities: string[]
  slug: string
}

export default function AddFactForm({ politicianId, table, severities, slug }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', statement_original: '', statement_correction: '',
    severity: severities[0], fact_check_org: '', conflict_type: 'financier',
    declared_hatvp: false, date_start: '', judicial_status: '',
    source_label: '', source_url: '', source_type: 'presse',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.title || !form.severity || !form.source_url || !form.source_label) {
      setError('Titre, sévérité et au moins une source sont obligatoires.')
      return
    }
    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = {
      politician_id: politicianId,
      title: form.title,
      severity: form.severity,
      review_status: 'approved',
    }

    if (table === 'affairs') {
      payload.description = form.description
      payload.judicial_status = form.judicial_status || null
      payload.date_start = form.date_start || null
      payload.is_active = true
    } else if (table === 'lies') {
      payload.statement_original = form.statement_original
      payload.statement_correction = form.statement_correction
      payload.fact_check_org = form.fact_check_org || null
    } else if (table === 'conflicts') {
      payload.description = form.description
      payload.conflict_type = form.conflict_type
      payload.declared_hatvp = form.declared_hatvp
    } else {
      payload.description = form.description
    }

    const { error: err } = await addFact({
      table,
      slug,
      payload,
      source: {
        label: form.source_label,
        url: form.source_url,
        source_type: form.source_type,
        is_legal_doc: form.source_type === 'legal',
      },
    })

    if (err) { setError(err); setSaving(false); return }

    setOpen(false)
    setSaving(false)
    setForm(f => ({ ...f, title: '', description: '', statement_original: '', statement_correction: '', source_label: '', source_url: '' }))
    router.refresh()
  }

  const inputClass = "w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-gray-800 transition-colors bg-white"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2"

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-gray-300 hover:border-gray-800 text-gray-400 hover:text-gray-800 font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-widest">
          + Ajouter une entrée
        </button>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Titre *</label>
              <input className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Titre court et factuel" />
            </div>
            <div>
              <label className={labelClass}>Sévérité *</label>
              <select className={inputClass} value={form.severity} onChange={e => set('severity', e.target.value)}>
                {severities.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {table === 'conflicts' && (
              <div>
                <label className={labelClass}>Type de conflit</label>
                <select className={inputClass} value={form.conflict_type} onChange={e => set('conflict_type', e.target.value)}>
                  {['financier','familial','professionnel','actionariat'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {table === 'affairs' && (
              <div>
                <label className={labelClass}>Statut judiciaire</label>
                <input className={inputClass} value={form.judicial_status} onChange={e => set('judicial_status', e.target.value)} placeholder="Ex: Appel en cours" />
              </div>
            )}
            {table === 'lies' ? (
              <>
                <div className="col-span-2">
                  <label className={labelClass}>Déclaration originale</label>
                  <textarea className={inputClass} rows={2} value={form.statement_original} onChange={e => set('statement_original', e.target.value)} placeholder="Citation exacte..." />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Correction factuelle *</label>
                  <textarea className={inputClass} rows={2} value={form.statement_correction} onChange={e => set('statement_correction', e.target.value)} placeholder="La réalité des faits..." />
                </div>
                <div>
                  <label className={labelClass}>Organisation fact-check</label>
                  <input className={inputClass} value={form.fact_check_org} onChange={e => set('fact_check_org', e.target.value)} placeholder="AFP Factuel, Les Décodeurs..." />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className={labelClass}>Description *</label>
                <textarea className={inputClass} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description factuelle détaillée..." />
              </div>
            )}
          </div>

          {/* Source */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Source (obligatoire)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Nom de la source *</label>
                <input className={inputClass} value={form.source_label} onChange={e => set('source_label', e.target.value)} placeholder="Le Monde, AFP..." />
              </div>
              <div>
                <label className={labelClass}>URL *</label>
                <input className={inputClass} value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select className={inputClass} value={form.source_type} onChange={e => set('source_type', e.target.value)}>
                  {['presse','legal','officiel','hatvp','parquet','autre'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold px-4 py-3 rounded-xl">{error}</div>}

          <div className="flex gap-3">
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-widest">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => setOpen(false)}
              className="px-6 border-2 border-gray-200 hover:border-gray-400 text-gray-600 font-bold py-3 rounded-xl transition-colors text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}