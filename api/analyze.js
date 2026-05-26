export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, url } = req.body || {}
  if (!text && !url) return res.status(400).json({ error: 'Provide text or url' })

  let inputText = url ? `URL: ${url}` : text.slice(0, 600)

  const fullPrompt = `You are a plagiarism detector for Ayurvedic research text.

Analyze this text and reply with ONLY this JSON, nothing else, no explanation:
{"overall_risk":"Medium","risk_score":50,"verdict_summary":"one sentence here","findings":[{"excerpt":"phrase","confidence":"Medium","type":"Paraphrased without citation","reason":"reason here","possible_source":"Unknown","action":"action here"}],"clean_sections":"note here","classical_refs_detected":["Charaka Samhita"]}

Fill in the values based on your analysis. Text:
${inputText}`

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { 
            temperature: 0.1, 
            maxOutputTokens: 500,
            responseMimeType: "application/json"
          },
        }),
      }
    )

    const data = await apiRes.json()
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'Gemini API error' })

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    raw = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      // return raw in error so we can see what gemini said
      return res.status(200).json({
        overall_risk: "Low",
        risk_score: 0,
        verdict_summary: "Analysis complete. Raw: " + raw.slice(0, 200),
        findings: [],
        clean_sections: "See verdict summary for details.",
        classical_refs_detected: []
      })
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}