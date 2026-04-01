import { useState, useEffect } from 'react';
import { analyzeJobFit } from '../utils/aiAnalyzer';
import { getProfile, updateJob } from '../utils/storage';
import { defaultProfile } from '../data/defaultProfile';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const VERDICT_COLORS = {
  'Excellent Fit': '#16a34a',
  'Good Fit': '#2563eb',
  'Partial Fit': '#d97706',
  'Poor Fit': '#dc2626',
};

const VERDICT_BG = {
  'Excellent Fit': '#f0fdf4',
  'Good Fit': '#eff6ff',
  'Partial Fit': '#fffbeb',
  'Poor Fit': '#fef2f2',
};

export default function AIBadge({ job, onUpdate }) {
  const [result, setResult] = useState(job.aiAnalysis || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (job.aiAnalysis) setResult(job.aiAnalysis);
  }, [job.aiAnalysis]);

  async function runAnalysis() {
    if (!job.description) { setError('Paste the job description first.'); return; }
    setLoading(true); setError(null);
    try {
      const profile = getProfile() || defaultProfile;
      const res = await analyzeJobFit(job, profile);
      setResult(res);
      updateJob(job.id, { fitScore: res.overallScore, aiAnalysis: res });
      if (onUpdate) onUpdate();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const color = result ? (VERDICT_COLORS[result.verdict] || '#64748b') : null;
  const bg = result ? (VERDICT_BG[result.verdict] || '#f8fafc') : null;

  if (!job.description) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>📋 Paste job description to get AI fit score</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#faf5ff', borderRadius: 10, border: '1px solid #ddd6fe' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', animation: 'pulse 1s infinite' }} />
        <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>✨ AI is analyzing this job for you…</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div>
        <button onClick={runAnalysis} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #c4b5fd', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Sparkles size={14} /> Analyze with AI
        </button>
        {error && <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${color}30` }}>
      {/* Always-visible summary row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, background: bg, padding: '12px 14px', cursor: 'pointer' }}
      >
        {/* Big score */}
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', border: `3px solid ${color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 0 4px ${color}18` }}>
          <span style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>{result.overallScore}</span>
          <span style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.2 }}>/ 100</span>
        </div>

        {/* Verdict + summary */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color }}>✨ {result.verdict}</span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${result.overallScore}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
          </div>
          {/* Summary — visible, 2 lines */}
          <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {result.summary}
          </p>
        </div>

        <div style={{ color: '#94a3b8', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div style={{ background: '#fff', padding: '16px 16px 12px', borderTop: `1px solid ${color}20` }}>

          {/* Strengths + Gaps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {result.strengths?.length > 0 && (
              <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 7 }}>✅ Strengths</div>
                {result.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#166534', marginBottom: 4, lineHeight: 1.45, display: 'flex', gap: 5 }}>
                    <span style={{ color: '#86efac', fontWeight: 700 }}>·</span> {s}
                  </div>
                ))}
              </div>
            )}
            {result.gaps?.length > 0 && (
              <div style={{ background: '#fff7ed', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#c2410c', marginBottom: 7 }}>⚠️ Gaps</div>
                {result.gaps.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#9a3412', marginBottom: 4, lineHeight: 1.45, display: 'flex', gap: 5 }}>
                    <span style={{ color: '#fdba74', fontWeight: 700 }}>·</span> {g}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills chips */}
          {(result.skillsFound?.length > 0 || result.skillsMissing?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {result.skillsFound?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Skills Match</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {result.skillsFound.map(s => (
                      <span key={s} style={{ background: '#dcfce7', color: '#15803d', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.skillsMissing?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills to Develop</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {result.skillsMissing.map(s => (
                      <span key={s} style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendation */}
          {result.recommendation && (
            <div style={{ background: '#faf5ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #ede9fe', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>{result.recommendation}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={(e) => { e.stopPropagation(); runAnalysis(); }} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              <RefreshCw size={12} /> Re-analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

