'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePolitician } from '@/app/admin/politicians/actions'

export default function DeletePoliticianButton({
  politicianId,
  fullName,
}: {
  politicianId: string
  fullName: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${fullName} » et toutes ses entrées (affaires, mensonges, conflits, patrimoine, financement) ? Cette action est irréversible.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError('')
    const { error: err } = await deletePolitician(politicianId)

    if (err) {
      setError(err)
      setDeleting(false)
      return
    }

    router.push('/admin/politicians')
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-50 hover:bg-red-100 disabled:opacity-50 border-2 border-red-200 hover:border-red-400 text-red-700 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
      >
        {deleting ? 'Suppression…' : 'Supprimer cet élu'}
      </button>
      {error && (
        <p className="text-xs font-bold text-red-700">{error}</p>
      )}
    </div>
  )
}
