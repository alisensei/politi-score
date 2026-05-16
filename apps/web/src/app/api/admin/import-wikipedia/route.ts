import { NextResponse } from 'next/server'
import { GoogleGenAI, Type, FunctionCallingConfigMode } from '@google/genai'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'
export const maxDuration = 30

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
9. Si aucun fait documenté n'est trouvé, retourne items: [].

Appelle toujours la fonction submit_extraction pour fournir le résultat.`

const EXTRACTION_FUNCTION = {
  name: 'submit_extraction',
  description: 'Soumet la liste des faits extraits depuis le wikitext.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ['affairs', 'lies', 'conflicts', 'patrimoine', 'financement'],
            },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            severity: { type: Type.STRING },
            sources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  url: { type: Type.STRING },
                  source_type: {
                    type: Type.STRING,
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
  const res = await fetch(url, {
    headers: { 'User-Agent': 'politi-score/1.0 (contact: admin@politi-score.fr)' },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.parse?.wikitext?.['*'] ?? null
}

function trimToInterestingSections(wikitext: string): string {
  // Cap total input to ~80k chars (~20k tokens) — Edge runtime gives us 30s.
  const PER_SECTION = 16000
  const MAX_TOTAL = 80000

  const sectionRegex = /==+\s*(Affaires?|Controverses?|Pol[ée]miques?|Proc[ée]dures? judiciaires?|Mises? en cause|Critiques?|Mensonges?|Scandales?|Affaires? judiciaires?)[^=]*==+/gi
  const matches: { start: number }[] = []
  let m
  while ((m = sectionRegex.exec(wikitext)) !== null) matches.push({ start: m.index })

  if (matches.length === 0) {
    return wikitext.slice(0, MAX_TOTAL)
  }

  const chunks: string[] = []
  let total = 0
  for (const { start } of matches) {
    const remaining = MAX_TOTAL - total
    if (remaining <= 0) break
    const chunk = wikitext.slice(start, start + Math.min(PER_SECTION, remaining))
    chunks.push(chunk)
    total += chunk.length
  }
  return chunks.join('\n\n---\n\n')
}

export async function POST(request: Request) {
  try {
    const auth = await assertModerator()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY manquante côté serveur.' },
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

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    let response
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Voici le wikitext (sections pertinentes uniquement). Extrais les faits documentés via la fonction submit_extraction.\n\n${trimmed}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: [EXTRACTION_FUNCTION] }],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: ['submit_extraction'],
            },
          },
        },
      })
    } catch (err) {
      const e = err as { status?: number; message?: string }
      return NextResponse.json(
        { error: `Gemini API: ${e.message || 'erreur inconnue'}`, status: e.status },
        { status: 502 }
      )
    }

    const calls = response.functionCalls
    if (!calls || calls.length === 0) {
      return NextResponse.json(
        { error: 'Réponse LLM sans function call', raw: response.text ?? null },
        { status: 500 }
      )
    }

    const args = calls[0].args as { items: unknown[] }
    return NextResponse.json({
      items: args.items,
      usage: response.usageMetadata,
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
