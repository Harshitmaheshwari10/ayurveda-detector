const CLASSICAL_TEXTS = [
  'charaka samhita', 'sushruta samhita', 'ashtanga hridayam', 'ashtanga sangraha',
  'charaka', 'sushruta', 'vagbhata', 'ashtanga'
]

const KNOWN_PHRASES = [
  { phrase: 'reduces serum cortisol levels', source: 'Chandrasekhar et al. 2012, Indian J Psychol Med', type: 'Likely copied' },
  { phrase: 'attenuated cortisol levels in stressed adults', source: 'Chandrasekhar et al. 2012, Indian J Psychol Med', type: 'Likely copied' },
  { phrase: '27.9%', source: 'Chandrasekhar et al. 2012 (specific trial statistic)', type: 'Likely copied' },
  { phrase: 'withanolides, alkaloids and saponins', source: 'Multiple Ashwagandha pharmacology reviews', type: 'Paraphrased without citation' },
  { phrase: 'free radical scavenging', source: 'Common antioxidant research terminology', type: 'Paraphrased without citation' },
  { phrase: 'synergistic effect', source: 'Common pharmacology terminology', type: 'Common knowledge' },
  { phrase: 'antioxidant properties', source: 'Common knowledge in herbal research', type: 'Common knowledge' },
  { phrase: 'adaptogenic herb', source: 'Common Ayurvedic classification', type: 'Common knowledge' },
  { phrase: 'randomized controlled trial', source: 'Standard research methodology term', type: 'Common knowledge' },
  { phrase: 'in vitro studies', source: 'Standard research terminology', type: 'Common knowledge' },
  { phrase: 'pharmacological activity', source: 'Common pharmacology term', type: 'Common knowledge' },
  { phrase: 'medhya rasayana', source: 'Charaka Samhita classical classification', type: 'Classical reference — verify citation' },
  { phrase: 'balya', source: 'Charaka Samhita herbal classification', type: 'Classical reference — verify citation' },
  { phrase: 'brimhaniya', source: 'Charaka Samhita herbal classification', type: 'Classical reference — verify citation' },
  { phrase: 'rasayana', source: 'Classical Ayurvedic text classification', type: 'Classical reference — verify citation' },
  { phrase: 'tridosha', source: 'Classical Ayurvedic fundamental theory', type: 'Classical reference — verify citation' },
  { phrase: 'vata dosha', source: 'Classical Ayurvedic theory', type: 'Classical reference — verify citation' },
  { phrase: 'pitta dosha', source: 'Classical Ayurvedic theory', type: 'Classical reference — verify citation' },
  { phrase: 'kapha dosha', source: 'Classical Ayurvedic theory', type: 'Classical reference — verify citation' },
  { phrase: 'withania somnifera root extract significantly', source: 'Multiple published clinical trials', type: 'Paraphrased without citation' },
  { phrase: 'significantly reduces', source: 'Common research finding phrase', type: 'Paraphrased without citation' },
  { phrase: 'double-blind, placebo-controlled', source: 'Standard clinical trial design term', type: 'Common knowledge' },
  { phrase: 'emblica officinalis', source: 'Botanical name for Amalaki — common knowledge', type: 'Common knowledge' },
  { phrase: 'terminalia chebula', source: 'Botanical name for Haritaki — common knowledge', type: 'Common knowledge' },
  { phrase: 'terminalia bellirica', source: 'Botanical name for Bibhitaki — common knowledge', type: 'Common knowledge' },
  { phrase: 'nf-kb', source: 'Common anti-inflammatory pathway reference', type: 'Paraphrased without citation' },
  { phrase: 'bacosides', source: 'Pharmacological compound in Bacopa monnieri studies', type: 'Paraphrased without citation' },
  { phrase: 'withanolides', source: 'Active compounds in Withania somnifera — well documented', type: 'Paraphrased without citation' },
]

const AYURVEDIC_TERMS = [
  'ashwagandha', 'ashvagandha', 'withania somnifera',
  'triphala', 'amalaki', 'bibhitaki', 'haritaki',
  'brahmi', 'bacopa monnieri',
  'turmeric', 'curcuma longa', 'curcumin',
  'neem', 'azadirachta indica',
  'guggulu', 'commiphora mukul',
  'shatavari', 'asparagus racemosus',
  'giloy', 'tinospora cordifolia',
  'amla', 'phyllanthus emblica',
  'tulsi', 'ocimum sanctum',
  'triphala', 'trikatu', 'dashamoola',
]

function detectClassicalRefs(text) {
  const lower = text.toLowerCase()
  return CLASSICAL_TEXTS.filter(t => lower.includes(t)).map(t =>
    t.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  )
}

function analyzeText(text) {
  const lower = text.toLowerCase()
  const findings = []
  const seen = new Set()

  for (const { phrase, source, type } of KNOWN_PHRASES) {
    if (lower.includes(phrase.toLowerCase()) && !seen.has(phrase)) {
      seen.add(phrase)

      const idx = lower.indexOf(phrase.toLowerCase())
      const start = Math.max(0, idx - 20)
      const end = Math.min(text.length, idx + phrase.length + 40)
      const excerpt = text.slice(start, end).trim()

      const confidence = type === 'Likely copied' ? 'High' : type === 'Paraphrased without citation' ? 'Medium' : 'Low'

      const actionMap = {
        'Likely copied': 'Paraphrase this section and add a proper citation.',
        'Paraphrased without citation': 'Add a citation to the original source.',
        'Classical reference — verify citation': 'Verify that the classical text is cited properly.',
        'Common knowledge': 'No action needed — this is standard terminology.',
      }

      if (type !== 'Common knowledge') {
        findings.push({
          excerpt: excerpt.slice(0, 120),
          confidence,
          type,
          reason: type === 'Likely copied'
            ? `This phrase closely matches language found in published research. Specific statistics or exact phrasing require citation.`
            : type === 'Classical reference — verify citation'
            ? `This appears to reference classical Ayurvedic text. Ensure the source is cited.`
            : `This phrasing appears in multiple published papers without clear attribution.`,
          possible_source: source,
          action: actionMap[type],
        })
      }
    }
  }

  const classicalRefs = detectClassicalRefs(text)
  const hasAyurvedicTerms = AYURVEDIC_TERMS.some(t => lower.includes(t))
  const highFindings = findings.filter(f => f.confidence === 'High').length
  const medFindings = findings.filter(f => f.confidence === 'Medium').length

  let risk_score = Math.min(95, highFindings * 25 + medFindings * 10 + findings.length * 5)
  let overall_risk = risk_score >= 50 ? 'High' : risk_score >= 25 ? 'Medium' : 'Low'

  let verdict_summary = ''
  if (highFindings > 0) {
    verdict_summary = `${highFindings} high-confidence finding(s) detected that closely match published research. Immediate citation or paraphrasing required.`
  } else if (medFindings > 0) {
    verdict_summary = `${medFindings} section(s) contain phrasing commonly found in Ayurvedic literature without clear attribution. Citations should be verified.`
  } else if (findings.length > 0) {
    verdict_summary = `Text contains standard Ayurvedic terminology and classical references. Verify all classical text citations are present.`
  } else {
    verdict_summary = `No significant plagiarism signals detected. Text appears largely original with appropriate use of terminology.`
  }

  const clean_sections = hasAyurvedicTerms && findings.length < 3
    ? 'Most of the text appears to be original writing with proper domain terminology.'
    : findings.length === 0
    ? 'The entire text appears original.'
    : 'Sections not flagged above appear original.'

  return {
    overall_risk,
    risk_score,
    verdict_summary,
    findings,
    clean_sections,
    classical_refs_detected: classicalRefs,
  }
}

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
        .slice(0, 3000)
    } catch (_) {
      return res.status(400).json({ error: 'Could not fetch URL. Please paste the text directly.' })
    }
  } else {
    inputText = text.slice(0, 3000)
  }

  const result = analyzeText(inputText)
  return res.status(200).json(result)
}
