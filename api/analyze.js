export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, url } = req.body || {}
  if (!text && !url) return res.status(400).json({ error: 'Provide text or url' })

  const SYSTEM_PROMPT = `You are an expert plagiarism detection engine specialized in Ayurvedic research content.

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

Be precise. Do not over-flag properly cited classical references. Prioritize actionable, honest findings.`

  let userContent
  if (url) {
    let fetchedText = null
    try {
      const pageRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AyurvedaDetector/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await pageRes.text()
      // strip tags, collapse whitespace, take first 3000 chars
      fetchedText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    } catch (_) {}

    userContent = fetchedText
      ? `Analyze this Ayurvedic research content fetched from ${url}:\n\n${fetchedText}`
      : `The URL ${url} could not be fetched directly. Based on the URL structure, provide a general plagiarism analysis framework and note that live fetching failed — instruct the user to paste the text instead.`
  } else {
    userContent = `Analyze this Ayurvedic research text for plagiarism signals:\n\n${text.slice(0, 4000)}`
  }

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    const data = await apiRes.json()

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.error?.message || 'Anthropic API error' })
    }

    const raw = data.content
      .map(b => b.text || '')
      .join('')
      .trim()
      .replace(/```json|```/g, '')
      .trim()

    const parsed = JSON.parse(raw)
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}
