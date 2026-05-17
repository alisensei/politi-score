import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM_PROMPT = `Tu es un analyste politique RIGOUREUX qui extrait UNIQUEMENT des faits judiciaires ou officiellement établis depuis un article Wikipedia FR sur un politicien français.

OBJECTIF : produire une liste de faits éthiquement répréhensibles, chacun avec au moins une source extraite du wikitext fourni.

============================================================
CRITÈRE D'INCLUSION (STRICT) — un fait n'est importé QUE SI :
============================================================
✓ Il y a une condamnation, mise en examen, inculpation, enquête judiciaire formelle, OU
✓ Il y a une décision officielle d'une autorité indépendante (HATVP, CNCCFP, Cour des comptes, parquet, etc.), OU
✓ Il y a un fact-check explicite d'une rédaction reconnue (AFP Factuel, CheckNews, Décodeurs, Conspiracy Watch…) qui établit une inexactitude factuelle précise.

À NE PAS IMPORTER (SOUS AUCUN PRÉTEXTE) :
✗ Une "accusation", "controverse", "polémique" sans support judiciaire ni fact-check officiel.
✗ Une critique d'adversaire politique, association militante, éditorialiste.
✗ Une opinion exprimée ("X a tenu des propos jugés racistes par Y").
✗ Un positionnement politique ou un désaccord idéologique.
✗ Un soupçon non documenté ("certains observateurs estiment que…").
✗ Une déclaration polémique mais légale.

EN CAS DE DOUTE → N'IMPORTE PAS. Mieux vaut un import vide qu'un import diffamatoire.

============================================================
CATÉGORIES (slug technique entre parenthèses)
============================================================
- "probity" — Probité : enrichissement personnel illégal (corruption, abus de biens sociaux, blanchiment, fraude fiscale aggravée, détournement)
- "conflicts" — Conflits d'intérêts : liens d'affaires non déclarés, doubles casquettes, prise illégale d'intérêts
- "opacity" — Opacité financière : manquements aux obligations déclaratives (HATVP, CNCCFP, lobbying)
- "sincerity" — Sincérité : mensonges factuels documentés par un fact-check officiel
- "harm" — Atteintes aux personnes : violences (sexuelles, physiques), harcèlement, discriminations établies judiciairement
- "speech_offenses" — Délits d'expression : condamnations pour injure, diffamation, provocation à la haine, négationnisme

============================================================
SÉVÉRITÉS — règles de classification
============================================================
Lis attentivement le texte. Choisis la sévérité qui correspond à l'étape judiciaire LA PLUS AVANCÉE mentionnée :
- Le texte dit "condamné(e) définitivement" / "condamnation définitive" / "pourvoi rejeté" / "appel rejeté" → "condamnation_definitive" (ou équivalent dans l'axe)
- Le texte dit "condamné(e)" / "déclaré(e) coupable" sans préciser → "condamnation_premiere_instance" / "condamnation_violences" / "condamnation_injure_diffamation" selon l'axe
- Le texte dit "mis(e) en examen" / "inculpé(e)" → "mise_en_examen"
- Le texte dit "fait l'objet d'une enquête" / "une enquête préliminaire est ouverte" → "enquete_judiciaire"
- Le texte dit "soupçonné(e)" avec source officielle / fact-check → "soupcons_documentes" (probity) ou rien
- "Polémique", "controverse", "accusation" sans suite judiciaire → NE PAS IMPORTER

Valeurs autorisées par axe :
- probity : condamnation_definitive | condamnation_premiere_instance | mise_en_examen | enquete_judiciaire | soupcons_documentes
- conflicts : non_declare_etabli | partiellement_declare | declare_problematique | potentiel
- opacity : omission_volontaire | declaration_incomplete | irregularite_constatee | retard_anomalie
- sincerity : mensonge_repete | mensonge_etabli | inexactitude_etablie | approximation
- harm : condamnation_violences_sexuelles | condamnation_violences | mise_en_examen_violences | accusations_documentees | signalements_publics
- speech_offenses : condamnation_provocation_haine | condamnation_injure_diffamation | condamnation_outrage | polemique_documentee

NE choisis "polemique_documentee" ou "approximation" QUE pour des cas où il y a bien un fait MAIS pas de procédure judiciaire ET un fact-check officiel. JAMAIS pour une simple accusation.

============================================================
CHOIX D'AXE — règles
============================================================
- Condamnation pour fraude fiscale, blanchiment, corruption, abus de biens → "probity"
- Condamnation pour injure, diffamation, provocation à la haine, négationnisme → "speech_offenses"
- Condamnation pour viol, agression, harcèlement → "harm"
- Patrimoine non déclaré à la HATVP → "opacity"
- Conflit d'intérêts non déclaré établi → "conflicts"
- Mensonge sur un chiffre factuel établi par fact-check → "sincerity"

============================================================
FORMAT DE SORTIE
============================================================
source_type : presse | legal | officiel | hatvp | parquet | autre
- "legal" / "parquet" / "officiel" : source juridique ou institutionnelle (jugement, décision HATVP, communiqué parquet)
- "hatvp" : déclaration HATVP elle-même
- "presse" : article de presse classique (Le Monde, AFP, Reuters…)
- "autre" : tout le reste

Titre : court (max 80 caractères), neutre, factuel. Format conseillé : "Condamnation pour X (année)" ou "Mise en examen dans l'affaire Y".
Description : 1 à 3 phrases neutres. Paraphrase, pas de citation verbatim (Wikipedia est CC-BY-SA).
Chaque fait DOIT avoir au moins une source extraite des <ref>...</ref> du wikitext (URL réelle, pas inventée).

Si aucun fait répondant aux critères stricts n'est trouvé, retourne items: []. Appelle toujours submit_extraction.`

const EXTRACTION_FUNCTION = {
  name: 'submit_extraction',
  description: 'Soumet la liste des faits extraits depuis le wikitext.',
  parameters: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['probity', 'conflicts', 'opacity', 'sincerity', 'harm', 'speech_offenses'],
            },
            title: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string' },
            sources: {
              type: 'array',
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

interface GeminiFunctionCall {
  name: string
  args: Record<string, unknown>
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        functionCall?: GeminiFunctionCall
        text?: string
      }>
    }
  }>
  usageMetadata?: Record<string, unknown>
  error?: { code: number; message: string; status: string }
}

async function callGeminiFlash(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  signal: AbortSignal
): Promise<GeminiResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    tools: [{ functionDeclarations: [EXTRACTION_FUNCTION] }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'ANY',
        allowedFunctionNames: ['submit_extraction'],
      },
    },
    generationConfig: {
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const json = (await res.json()) as GeminiResponse
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `HTTP ${res.status}`)
  }
  return json
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
  const PER_SECTION = 8000
  const MAX_TOTAL = 30000

  const sectionRegex = /==+\s*(Affaires?|Controverses?|Pol[ée]miques?|Proc[ée]dures? judiciaires?|Mises? en cause|Critiques?|Mensonges?|Scandales?|Affaires? judiciaires?|Harc[èe]lement|Violences?|Accusations?)[^=]*==+/gi
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
  const t0 = Date.now()
  const stamp = (label: string) => console.log(`[import-wikipedia] +${Date.now() - t0}ms ${label}`)
  try {
    stamp('start')
    const auth = await assertModerator()
    stamp(`auth (ok=${auth.ok})`)
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
    stamp(`wiki fetch (chars=${wikitext?.length ?? 0})`)
    if (!wikitext) {
      return NextResponse.json(
        { error: `Article Wikipedia introuvable : « ${wikipediaSlug} »` },
        { status: 404 }
      )
    }

    const trimmed = trimToInterestingSections(wikitext)
    stamp(`trim (chars=${trimmed.length})`)

    const userPrompt = `Voici le wikitext (sections pertinentes uniquement). Extrais les faits documentés via la fonction submit_extraction.\n\n${trimmed}`

    let response: GeminiResponse
    try {
      stamp('gemini call start')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 50000)
      try {
        response = await callGeminiFlash(
          process.env.GEMINI_API_KEY,
          SYSTEM_PROMPT,
          userPrompt,
          controller.signal
        )
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (err) {
      const e = err as { message?: string }
      stamp(`gemini error: ${e.message}`)
      return NextResponse.json(
        { error: `Gemini API: ${e.message || 'erreur inconnue'}` },
        { status: 502 }
      )
    }
    stamp('gemini call done')

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const fnCall = parts.find((p) => p.functionCall)?.functionCall
    if (!fnCall) {
      const text = parts.map((p) => p.text).filter(Boolean).join('\n')
      return NextResponse.json(
        { error: 'Réponse LLM sans function call', raw: text || null },
        { status: 500 }
      )
    }

    const args = fnCall.args as { items: unknown[] }
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
