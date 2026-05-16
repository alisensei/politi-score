'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type FactTable = 'affairs' | 'lies' | 'conflicts' | 'patrimoine' | 'financement'

const LINKED_TYPE_MAP: Record<FactTable, string> = {
  affairs: 'affair',
  lies: 'lie',
  conflicts: 'conflict',
  patrimoine: 'patrimoine',
  financement: 'financement',
}

function mapPgError(err: { code?: string; message: string }): string {
  if (err.code === '42501') return "Droits insuffisants (moderator/admin requis)."
  if (err.code === '23514') return "Donnée invalide (vérifie sévérité / type de conflit)."
  return err.message
}

export interface AddFactInput {
  table: FactTable
  slug: string
  payload: Record<string, unknown>
  source: {
    label: string
    url: string
    source_type: string
    is_legal_doc: boolean
  }
}

export async function addFact(input: AddFactInput): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  const { data: inserted, error: insertError } = await supabase
    .from(input.table)
    .insert(input.payload)
    .select()
    .single()

  if (insertError) return { error: mapPgError(insertError) }

  const { error: sourceError } = await supabase.from('sources').insert({
    linked_id: inserted.id,
    linked_type: LINKED_TYPE_MAP[input.table],
    label: input.source.label,
    url: input.source.url,
    source_type: input.source.source_type,
    is_legal_doc: input.source.is_legal_doc,
    is_verified: true,
  })

  if (sourceError) {
    await supabase.from(input.table).delete().eq('id', inserted.id)
    return { error: mapPgError(sourceError) }
  }

  revalidatePath('/')
  revalidatePath(`/admin/politicians/${input.slug}`)
  return {}
}
