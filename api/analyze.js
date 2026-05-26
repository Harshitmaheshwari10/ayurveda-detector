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

  const fullPrompt = `You are a plagiarism detector for Ayurvedic research. Analyze the text below and return ONLY a JSON object. No markdown, no explanation, just JSON.

Use this exact structure:
{"overall_risk":"Medium","risk_score":50,"verdict_summary":"One sentence summary.","findings":[{"excerpt":"short phrase","confidence":"Medium","type":"Paraphrased without citation","reason":"short reason","possible_source":"Unknown","action":"Add citation"}],"clean_sections":"What looks original","classical_refs_detected":["Charaka Samhita"]}

Rules:
- overall_risk must be High, Medium, or Low
- risk_score is integer 0-100  
- findings can be empty array if nothing flagged
- keep every string value under 80 characters
- classical_refs_detected can be empty array

Text to analyze:
${inputText}`

  try {
    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://vaidya-detector.vercel.app',
        'X-Title': 'Vaidya Plagiarism Detector',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 600,
        temperature: 0.1,
      }),
    })

    const data = await apiRes.json()
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error?.message || 'OpenRouter API error' })

    let raw = data.choices?.[0]?.message?.content || ''
    raw = raw.replace(/```json|```/g, '').trim()

    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')
    raw = raw.slice(start, end + 1)

    const parsed = JSON.parse(raw)
    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}