'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapPgError(err: { code?: string; message: string }, slug?: string): string {
  if (err.code === '23505') {
    return slug
      ? `Un élu avec ce slug existe déjà (${slug}). Va sur /admin/politicians/${slug} pour le gérer.`
      : 'Un élu avec ce slug existe déjà.'
  }
  if (err.code === '42501') return "Droits insuffisants (moderator/admin requis)."
  return err.message
}

export interface CreatePoliticianInput {
  full_name: string
  party: string
  role: string
  level: string
  mandate_start: string
  mandate_end?: string
  photo_url?: string
}

export async function createPolitician(
  input: CreatePoliticianInput
): Promise<{ error?: string; slug?: string }> {
  const slug = slugify(input.full_name)
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('politicians').insert({
    slug,
    full_name: input.full_name,
    party: input.party,
    role: input.role,
    level: input.level,
    mandate_start: input.mandate_start,
    mandate_end: input.mandate_end || null,
    photo_url: input.photo_url || null,
    status: 'active',
  })

  if (error) return { error: mapPgError(error, slug) }

  revalidatePath('/')
  revalidatePath('/admin/politicians')
  return { slug }
}

export async function deletePolitician(id: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('politicians').delete().eq('id', id)

  if (error) return { error: mapPgError(error) }

  revalidatePath('/')
  revalidatePath('/admin/politicians')
  return {}
}
