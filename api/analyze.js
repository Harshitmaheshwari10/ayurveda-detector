export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, url } = req.body || {}
  if (!text && !url) return res.status(400).json({ error: 'Provide text or url' })

  const PROMPT_TEMPLATE = `You are an expert plagiarism detection engine specialized in Ayurvedic research content.

You understand:
- Ayurvedic terminology in Sanskrit and all transliterated forms (ashwagandha = ashvagandha = Withania somnifera)
- Classical Ayurvedic texts: Charaka Samhita, Sushruta Samhita, Ashtanga Hridayam, Ashtanga Sangraha
- Common paraphrasing patterns in academic writing
- The difference between citing classical knowledge (acceptable tradition) vs copying modern research (problematic)

Analyze the provided text and return ONLY a valid JSON object with NO markdown, NO backticks, NO preamble. Structure:
{
  "overall_risk": "High" | "Medium" | "Low",
  "risk_score": <integer 0-100>,
  "verdict_summary": "<2-3 sentence plain English summary of what was found>",
  "findings": [
    {
      "excerpt": "<the specific flagged phrase or sentence, max 25 words>",
      "confidence": "High" | "Medium" | "Low",
      "type": "Likely copied" | "Paraphrased without citation" | "Classical reference — verify citation" | "Common knowledge",
      "reason": "<plain English explanation of why this is flagged, 1-2 sentences>",
      "possible_source": "<best guess — journal, classical text, or Unknown>",
      "action": "<what the researcher should do>"
    }
  ],
  "clean_sections": "<note about parts that appear original>",
  "classical_refs_detected": ["<list of classical texts referenced>"]
}

Be precise. Do not over-flag properly cited classical references. Prioritize actionable, honest findings.

Analyze this Ayurvedic research text for plagiarism signals:`

  let inputText = ''

  if (url) {
    try {
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AyurvedaDetector/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await pageRes.text()
      inputText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000)
    } catch (_) {
      return res.status(400).json({ error: 'Could not fetch URL. Please paste the text directly instead.' })
    }
  } else {
    inputText = text.slice(0, 2000)
  }

  const fullPrompt = `${PROMPT_TEMPLATE}\n\n${inputText}`

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      }
    )

    const data = await apiRes.json()

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.error?.message || 'Gemini API error' })
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}