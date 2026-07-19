

const SAMPLE_TEXT = `Ashwagandha (Withania somnifera) is a well-known adaptogenic herb used in Ayurvedic medicine for centuries. According to Charaka Samhita, Ashwagandha is classified under Balya (strength promoting) and Brimhaniya (nourishing) groups of herbs. Recent studies have demonstrated that Withania somnifera root extract significantly reduces serum cortisol levels and improves stress resilience in human subjects. The root contains withanolides, alkaloids and saponins which are responsible for its pharmacological activity. Daily supplementation of 300mg of root extract over 60 days attenuated cortisol levels in stressed adults by approximately 27.9% compared to placebo. Triphala, a combination of Amalaki, Bibhitaki and Haritaki, is another classical formulation that has shown antioxidant properties in multiple in vitro studies.`

function Badge({ confidence, type }) {
  const isClassical = type === 'Classical reference — verify citation'
  const map = {
    High:   { bg: '#FEECEC', color: '#8B1C1C', label: 'High confidence' },
    Medium: { bg: '#FEF3E2', color: '#7A4510', label: 'Medium confidence' },
    Low:    { bg: '#EBF5EB', color: '#1E5C1E', label: 'Low confidence'  },
  }
  const s = isClassical ? { bg: '#E8F0FB', color: '#1A3C8B', label: 'Classical ref' } : (map[confidence] || map['Medium'])
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 10px',
      borderRadius: 999, background: s.bg, color: s.color, letterSpacing: '0.02em',
    }}>{s.label}</span>
  )
}

function FindingCard({ f }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <Badge confidence={f.confidence} type={f.type} />
        <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{f.type}</span>
      </div>
      <div style={{
        fontSize: 13, fontStyle: 'italic', color: 'var(--ink-secondary)',
        borderLeft: '2px solid var(--border-strong)', paddingLeft: 10,
        marginBottom: 10, lineHeight: 1.65,
      }}>"{f.excerpt}"</div>
      <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.65, marginBottom: 8 }}>{f.reason}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
          📄 Possible source: <strong style={{ color: 'var(--ink-secondary)' }}>{f.possible_source}</strong>
        </span>
        {f.action && (
          <span style={{ fontSize: 12, color: 'var(--saffron-dark)' }}>→ {f.action}</span>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, riskClass }) {
  const color = riskClass === 'high' ? '#8B1C1C' : riskClass === 'medium' ? '#7A4510' : riskClass === 'low' ? '#1E5C1E' : 'var(--ink)'
  return (
    <div style={{ background: 'var(--parchment)', borderRadius: 'var(--radius)', padding: '1rem', flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color }}>{value}</div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('text')
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function analyze() {
    const input = tab === 'text' ? textInput.trim() : urlInput.trim()
    if (!input) return

    setLoading(true)
    setResult(null)
    setError(null)

    const inputText = input.slice(0, 600)

    const prompt = `<s>[INST] You are a plagiarism detector for Ayurvedic research. Analyze the text and return ONLY a JSON object, nothing else.

JSON structure (fill in based on analysis):
{"overall_risk":"Medium","risk_score":50,"verdict_summary":"One sentence summary.","findings":[{"excerpt":"short flagged phrase","confidence":"Medium","type":"Paraphrased without citation","reason":"why flagged","possible_source":"Unknown","action":"Add citation"}],"clean_sections":"what looks original","classical_refs_detected":["Charaka Samhita"]}

Rules:
- overall_risk: High, Medium, or Low
- risk_score: integer 0-100
- findings: array, can be empty []
- all strings under 80 chars
- return ONLY the JSON

Text to analyze: ${inputText} [/INST]`

    try {
      const apiRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tab === 'text' ? { text: input } : { url: input }),
      })

      const data = await apiRes.json()
      if (!apiRes.ok) throw new Error(data.error || 'API error')
      setResult(data)
    } catch (e) {
      setError(e.message || 'Analysis failed. Please try again.')
    }

    setLoading(false)
  }

  const riskClass = result
    ? result.overall_risk === 'High' ? 'high' : result.overall_risk === 'Medium' ? 'medium' : 'low'
    : ''

  const canSubmit = tab === 'text' ? !!textInput.trim() : !!urlInput.trim()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <div style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--parchment)', padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 22, fontFamily: 'DM Serif Display, serif', color: 'var(--saffron)' }}>Vaidya</span>
            <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Plagiarism Detector for Ayurvedic Research
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 540 }}>
            Semantic analysis that understands Ayurvedic terminology, transliteration variants, and classical text references.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
            {['text', 'url'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null) }} style={{
                fontSize: 13, padding: '5px 14px', borderRadius: 'var(--radius)',
                border: '0.5px solid', borderColor: tab === t ? 'var(--border-strong)' : 'var(--border)',
                background: tab === t ? 'var(--parchment)' : 'transparent',
                color: tab === t ? 'var(--ink)' : 'var(--ink-secondary)',
                fontWeight: tab === t ? 500 : 400,
              }}>
                {t === 'text' ? 'Paste text' : 'Enter URL'}
              </button>
            ))}
          </div>

          {tab === 'text' ? (
            <>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Paste your Ayurvedic research article or abstract here..."
                style={{
                  width: '100%', minHeight: 180, resize: 'vertical', fontSize: 14, lineHeight: 1.65,
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px',
                  background: 'var(--cream)', color: 'var(--ink)', outline: 'none',
                }}
              />
              <button onClick={() => setTextInput(SAMPLE_TEXT)} style={{
                fontSize: 12, color: 'var(--ink-tertiary)', background: 'none',
                border: 'none', cursor: 'pointer', marginTop: 6, textDecoration: 'underline', padding: 0,
              }}>Load sample article</button>
            </>
          ) : (
            <>
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://pmc.ncbi.nlm.nih.gov/articles/..."
                style={{
                  width: '100%', fontSize: 14, border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '9px 12px',
                  background: 'var(--cream)', color: 'var(--ink)', outline: 'none',
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 6 }}>
                Note: URL fetching may be blocked by some journals. Paste text directly for best results.
              </p>
            </>
          )}

          <button onClick={analyze} disabled={loading || !canSubmit} style={{
            width: '100%', marginTop: '1rem', padding: '10px 0', fontSize: 14, fontWeight: 500,
            borderRadius: 'var(--radius)', border: '0.5px solid var(--border-strong)',
            background: loading || !canSubmit ? 'var(--parchment)' : 'var(--saffron)',
            color: loading || !canSubmit ? 'var(--ink-secondary)' : '#fff',
            cursor: loading || !canSubmit ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
          }}>
            {loading ? 'Analyzing…' : '→ Analyze for plagiarism'}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-secondary)', fontSize: 14 }}>
            <div style={{
              width: 28, height: 28, border: '2px solid var(--border-strong)',
              borderTopColor: 'var(--saffron)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
            }} />
            Analyzing for semantic similarity and plagiarism signals…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEECEC', border: '0.5px solid #F5BBBB', borderRadius: 'var(--radius)', padding: '1rem', fontSize: 14, color: '#8B1C1C', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {result && !loading && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <MetricCard label="Overall risk"  value={result.overall_risk}                    riskClass={riskClass} />
              <MetricCard label="Risk score"    value={`${Math.round(result.risk_score)}/100`} riskClass={riskClass} />
              <MetricCard label="Findings"      value={result.findings?.length ?? 0} />
            </div>

            <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Summary</div>
              <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>{result.verdict_summary}</p>
              {result.clean_sections && <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 8, lineHeight: 1.6 }}>✓ {result.clean_sections}</p>}
            </div>

            {result.findings?.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Flagged findings</div>
                {result.findings.map((f, i) => <FindingCard key={i} f={f} />)}
              </>
            )}

            {result.classical_refs_detected?.length > 0 && (
              <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Classical texts referenced</div>
                <p style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{result.classical_refs_detected.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.5px solid var(--border)', fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center' }}>
          Vaidya uses semantic analysis to detect plagiarism signals — not a replacement for full editorial review.
        </div>
      </div>
    </div>
  )
}
