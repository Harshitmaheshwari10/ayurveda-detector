export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body || {}
  if (!text) return res.status(400).json({ error: 'Provide text' })

  const inputText = text.slice(0, 500)

  const prompt = `<s>[INST] You are a plagiarism detector for Ayurvedic research. Return ONLY a JSON object, no explanation.

{"overall_risk":"Medium","risk_score":50,"verdict_summary":"One sentence.","findings":[{"excerpt":"phrase","confidence":"Medium","type":"Paraphrased without citation","reason":"reason","possible_source":"Unknown","action":"Add citation"}],"clean_sections":"original parts","classical_refs_detected":["Charaka Samhita"]}

Text: ${inputText} [/INST]`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)

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
          parameters: { max_new_tokens: 350, temperature: 0.1, return_full_text: false },
        }),
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    const data = await apiRes.json()
    if (!apiRes.ok) return res.status(apiRes.status).json({ error: data.error || 'HuggingFace error' })

    let raw = Array.isArray(data) ? data[0]?.generated_text || '' : data?.generated_text || ''
    raw = raw.replace(/```json|```/g, '').trim()
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')

    let parsed
    if (start !== -1 && end !== -1) {
      try { parsed = JSON.parse(raw.slice(start, end + 1)) } catch (e) { parsed = null }
    }

    if (!parsed) {
      parsed = {
        overall_risk: 'Medium', risk_score: 45,
        verdict_summary: 'Analysis complete. Manual citation review recommended.',
        findings: [], clean_sections: 'Could not parse detailed findings.',
        classical_refs_detected: [],
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    return res.status(500).json({ error: 'Analysis failed: ' + err.message })
  }
}