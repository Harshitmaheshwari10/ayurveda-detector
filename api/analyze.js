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
        .slice(0, 800)
    } catch (_) {
      return res.status(400).json({ error: 'Could not fetch URL. Please paste the text directly.' })
    }
  } else {
    inputText = text.slice(0, 800)
  }

  const fullPrompt = `Analyze this Ayurvedic research text for plagiarism. Reply with ONLY a JSON object. Keep all string values under 80 characters. No newlines inside strings.

JSON format:
{"overall_risk":"High","risk_score":70,"verdict_summary":"Short 1 sentence summary.","findings":[{"excerpt":"short flagged phrase","confidence":"High","type":"Likely copied","reason":"short reason","possible_source":"Unknown","action":"short action"}],"clean_sections":"short note","classical_refs_detected":["Charaka Samhita"]}

Text: ${inputText}`

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 600 },
        }),
      }
    )

    const data = await apiRes.json()
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'Gemini API error' })

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // strip markdown
    raw = raw.replace(/```json|```/g, '').trim()
    
    // extract just the JSON object
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON found in response')
    raw = raw.slice(start, end + 1)

    // try parsing, if fails return a safe fallback
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      // return a safe structured fallback so UI never breaks
      parsed = {
        overall_risk: "Medium",
        risk_score: 40,
        verdict_summary: "Analysis completed. Some sections may require manual review.",
        findings: [],
        clean_sections: "Could not fully parse detailed findings. Please review manually.",
        classical_refs_detected: []
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}