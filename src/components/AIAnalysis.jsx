import { useState } from 'react';
import { analyzeJobFit, isConfigured } from '../utils/aiAnalyzer';
import { getProfile } from '../utils/storage';
import { defaultProfile } from '../data/defaultProfile';
import { Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const VERDICT_COLORS = {
  'Excellent Fit': '#22c55e',
  'Good Fit': '#3b82f6',
  'Partial Fit': '#f59e0b',
  'Poor Fit': '#ef4444',
};

export default function AIAnalysis({ job, cachedResult }) {
  const [open, setOpen] = useState(!!cachedResult);
  const [result, setResult] = useState(cachedResult || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runAnalysis() {
    if (!job.description) {
      setError('Paste the full job description when adding the job — that\'s what the AI reads.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = getProfile() || defaultProfile;
      const res = await analyzeJobFit(job, profile);
      setResult(res);
      setOpen(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const verdictColor = result ? (VERDICT_COLORS[result.verdict] || '#64748b') : '#8b5cf6';

  return (
    <div style={{ marginTop: 10 }}>
      {!result ? (
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: loading ? '#f3e8ff' : '#f5f3ff',
            color: '#7c3aed', border: '1.5px solid #ddd6fe',
            borderRadius: 20, padding: '4px 14px', fontSize: 12,
            fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <Sparkles size={12} />
          {loading ? 'AI is analyzing…' : '✨ AI Analysis'}
        </button>
      ) : (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: verdictColor + '15', color: verdictColor,
            border: `1.5px solid ${verdictColor}40`,
            borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Sparkles size={12} />
          {result.verdict} — {result.overallScore}%
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
          <AlertCircle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#b91c1c' }}>{error}</span>
        </div>
      )}

      {result && open && (
        <div style={{ marginTop: 10, background: '#faf5ff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15, color: verdictColor }}>{result.verdict}</span>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>AI-powered analysis</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: verdictColor, lineHeight: 1 }}>{result.overallScore}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>/ 100</div>
            </div>
          </div>

          <div style={{ height: 8, background: '#ede9fe', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${result.overallScore}%`, background: verdictColor, borderRadius: 99 }} />
          </div>

          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 14, fontStyle: 'italic' }}>
            "{result.summary}"
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {result.strengths?.length > 0 && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>✅ Your Strengths</div>
                {result.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#166534', marginBottom: 4, lineHeight: 1.4 }}>• {s}</div>
                ))}
              </div>
            )}
            {result.gaps?.length > 0 && (
              <div style={{ background: '#fff7ed', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', marginBottom: 8 }}>⚠️ Gaps</div>
                {result.gaps.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#9a3412', marginBottom: 4, lineHeight: 1.4 }}>• {g}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {result.skillsFound?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#15803d', marginBottom: 6 }}>Skills that match</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {result.skillsFound.map(s => (
                    <span key={s} style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {result.skillsMissing?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', marginBottom: 6 }}>Skills to develop</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {result.skillsMissing.map(s => (
                    <span key={s} style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.recommendation && (
            <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #ddd6fe' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>💡 Recommendation: </span>
              <span style={{ fontSize: 12, color: '#374151' }}>{result.recommendation}</span>
            </div>
          )}

          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <button onClick={runAnalysis} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
              🔄 Re-analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
