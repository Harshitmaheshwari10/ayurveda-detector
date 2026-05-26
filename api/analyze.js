export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, url } = req.body || {}
  if (!text && !url) return res.status(400).json({ error: 'Provide text or url' })

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
        .slice(0, 1500)
    } catch (_) {
      return res.status(400).json({ error: 'Could not fetch URL. Please paste the text directly instead.' })
    }
  } else {
    inputText = text.slice(0, 1500)
  }

  const fullPrompt = `You are a plagiarism detector for Ayurvedic research. Analyze the text and return ONLY valid compact JSON, no markdown, no extra spaces, no newlines inside strings.

Return exactly this structure:
{"overall_risk":"High or Medium or Low","risk_score":50,"verdict_summary":"2 sentence summary here.","findings":[{"excerpt":"flagged text here","confidence":"High or Medium or Low","type":"Likely copied or Paraphrased without citation or Classical reference or Common knowledge","reason":"why flagged","possible_source":"source name or Unknown","action":"what to do"}],"clean_sections":"what looks original","classical_refs_detected":["Charaka Samhita"]}

Rules:
- overall_risk: High, Medium, or Low only
- risk_score: integer 0-100
- findings: array of flagged sections, can be empty array []
- All string values must be short, under 100 characters
- No line breaks inside any string value
- Return ONLY the JSON object, nothing else

Text to analyze:
${inputText}`

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
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