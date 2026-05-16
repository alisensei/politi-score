import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `Tu es un analyste politique qui extrait des faits documentés depuis un article Wikipedia FR sur un politicien français.

OBJECTIF : produire une liste de faits classés en 5 catégories, chacun avec au moins une source extraite du wikitext fourni.

CATÉGORIES :
- "affairs" : affaires judiciaires (condamnations, mises en examen, inculpations, soupçons documentés, affaires classées)
- "lies" : mensonges ou inexactitudes factuels établis par fact-check
- "conflicts" : conflits d'intérêts (déclarés ou non à la HATVP)
- "patrimoine" : problèmes de déclaration patrimoniale HATVP
- "financement" : irrégularités de financement politique CNCCFP

SÉVÉRITÉS AUTORISÉES (impératif) :
- affairs : condamne | mis_en_examen | inculpe | soupcon | classe
- lies : avere | etabli | probable | nuance
- conflicts : avere | soupcon | potentiel
- patrimoine : omission_volontaire | declaration_incomplete | retard
- financement : condamnation_cnccfp | irregularite_constatee | anomalie_signalee

source_type AUTORISÉS : presse | legal | officiel | hatvp | parquet | autre

RÈGLES STRICTES :
1. N'invente JAMAIS un fait ou une URL. Si tu n'es pas sûr, n'inclus pas l'item.
2. Chaque fait doit s'appuyer sur au moins une référence <ref>...</ref> trouvée dans le wikitext. Extrais l'URL et le nom de la source depuis le <ref>.
3. Paraphrase factuellement. Ne copie pas verbatim (Wikipedia est CC-BY-SA).
4. Le titre est court (max 80 caractères), neutre, factuel ("Affaire Benalla", "Mensonge sur le pouvoir d'achat 2022").
5. La description fait 1 à 3 phrases neutres.
6. En cas de doute sur la sévérité, choisis la moins grave (présomption d'innocence).
7. Une affaire sans condamnation définitive ne peut PAS être tagguée "condamne" — utilise "mis_en_examen" ou "soupcon".
8. Concentre-toi sur les sections "Affaires", "Controverses", "Polémiques", "Procédures judiciaires", "Polémiques judiciaires", "Critiques", "Mises en cause", "Mensonges". Ignore biographie/carrière/déclarations politiques générales.
9. Si aucun fait documenté n'est trouvé, retourne items: [].`

const EXTRACTION_TOOL = {
  name: 'submit_extraction',
  description: 'Soumet la liste des faits extraits depuis le wikitext.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['affairs', 'lies', 'conflicts', 'patrimoine', 'financement'],
            },
            title: { type: 'string', maxLength: 80 },
            description: { type: 'string' },
            severity: { type: 'string' },
            sources: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  url: { type: 'string' },
                  source_type: {
                    type: 'string',
                    enum: ['presse', 'legal', 'officiel', 'hatvp', 'parquet', 'autre'],
                  },
                },
                required: ['label', 'url', 'source_type'],
              },
            },
          },
          required: ['category', 'title', 'description', 'severity', 'sources'],
        },
      },
    },
    required: ['items'],
  },
}

async function assertModerator() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: 'Non authentifié' }

  const { data: contributor } = await supabase
    .from('contributors')
    .select('role')
    .eq('github_username', user.user_metadata?.user_name)
    .single()

  if (!contributor || !['moderator', 'admin'].includes(contributor.role)) {
    return { ok: false as const, status: 403, error: 'Droits insuffisants (moderator/admin requis)' }
  }
  return { ok: true as const }
}

async function fetchWikipediaArticle(slug: string): Promise<string | null> {
  const url = `https://fr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    slug
  )}&format=json&prop=wikitext&redirects=1`
  const res = await fetch(url, { headers: { 'User-Agent': 'politi-score/1.0 (contact: admin@politi-score.fr)' } })
  if (!res.ok) return null
  const data = await res.json()
  return data.parse?.wikitext?.['*'] ?? null
}

function trimToInterestingSections(wikitext: string): string {
  const sectionRegex = /==+\s*(Affaires?|Controverses?|Pol[ée]miques?|Proc[ée]dures? judiciaires?|Mises? en cause|Critiques?|Mensonges?|Scandales?|Affaires? judiciaires?)[^=]*==+/gi
  const matches: { start: number }[] = []
  let m
  while ((m = sectionRegex.exec(wikitext)) !== null) matches.push({ start: m.index })

  if (matches.length === 0) {
    return wikitext.slice(0, 120000)
  }

  const chunks: string[] = []
  for (const { start } of matches) {
    chunks.push(wikitext.slice(start, start + 30000))
  }
  const combined = chunks.join('\n\n---\n\n')
  return combined.slice(0, 150000)
}

export async function POST(request: Request) {
  try {
    const auth = await assertModerator()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY manquante côté serveur.' },
        { status: 500 }
      )
    }

    let body: { wikipediaSlug?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    const wikipediaSlug = body.wikipediaSlug?.trim()
    if (!wikipediaSlug) {
      return NextResponse.json({ error: 'wikipediaSlug requis' }, { status: 400 })
    }

    const wikitext = await fetchWikipediaArticle(wikipediaSlug)
    if (!wikitext) {
      return NextResponse.json(
        { error: `Article Wikipedia introuvable : « ${wikipediaSlug} »` },
        { status: 404 }
      )
    }

    const trimmed = trimToInterestingSections(wikitext)

    const anthropic = new Anthropic()
    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: 'submit_extraction' },
        messages: [
          {
            role: 'user',
            content: `Voici le wikitext (sections potentiellement pertinentes uniquement). Extrais les faits documentés via la fonction submit_extraction.\n\n${trimmed}`,
          },
        ],
      })
    } catch (err) {
      const e = err as { status?: number; message?: string; error?: { message?: string } }
      return NextResponse.json(
        {
          error: `Anthropic API: ${e.error?.message || e.message || 'erreur inconnue'}`,
          status: e.status,
        },
        { status: 502 }
      )
    }

    const toolUse = message.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'Réponse LLM sans tool_use', raw: message.content },
        { status: 500 }
      )
    }

    return NextResponse.json({
      items: (toolUse.input as { items: unknown[] }).items,
      usage: message.usage,
      wikipediaSlug,
    })
  } catch (err) {
    const e = err as Error
    return NextResponse.json(
      { error: `Erreur serveur : ${e.message}`, stack: e.stack?.split('\n').slice(0, 5) },
      { status: 500 }
    )
  }
}
