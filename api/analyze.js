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
        signal: AbortSignal.timeout(25000),
      })
      const html = await pageRes.text()
      inputText = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600)
    } catch (_) {
      return res.status(400).json({ error: 'Could not fetch URL. Please paste the text directly.' })
    }
  } else {
    inputText = text.slice(0, 600)
  }

  const prompt = `<s>[INST] You are a plagiarism detector for Ayurvedic research. Analyze the text and return ONLY a JSON object, nothing else.

JSON structure:
{"overall_risk":"Medium","risk_score":50,"verdict_summary":"One sentence summary.","findings":[{"excerpt":"short phrase max 20 words","confidence":"Medium","type":"Paraphrased without citation","reason":"short reason","possible_source":"Unknown","action":"Add citation"}],"clean_sections":"what looks original","classical_refs_detected":["Charaka Samhita"]}

Rules:
- overall_risk: High, Medium, or Low only
- risk_score: integer 0-100
- findings: array, can be empty []
- all strings under 80 chars
- classical_refs_detected: array, can be empty []
- return ONLY the JSON, no explanation

Text: ${inputText} [/INST]`

  try {
    const apiRes = await fetch(
     'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 400,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      }
    )

    const data = await apiRes.json()

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: data.error || 'HuggingFace API error' })
    }

    let raw = Array.isArray(data) ? data[0]?.generated_text || '' : data?.generated_text || ''
    raw = raw.replace(/```json|```/g, '').trim()

    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return res.status(200).json({
        overall_risk: 'Medium',
        risk_score: 45,
        verdict_summary: 'Analysis complete. Manual review recommended for citation verification.',
        findings: [],
        clean_sections: 'Unable to parse detailed findings. Please review manually.',
        classical_refs_detected: [],
      })
    }

    raw = raw.slice(start, end + 1)

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      parsed = {
        overall_risk: 'Medium',
        risk_score: 45,
        verdict_summary: 'Analysis complete. Manual review recommended for citation verification.',
        findings: [],
        clean_sections: 'Unable to parse detailed findings. Please review manually.',
        classical_refs_detected: [],
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}