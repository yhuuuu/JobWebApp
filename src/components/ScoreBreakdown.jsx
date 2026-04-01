import { useState, useRef, useEffect } from 'react';
import { scoreJobDetailed, getScoreColor, getScoreLabel } from '../utils/scorer';
import { getProfile } from '../utils/storage';
import { defaultProfile } from '../data/defaultProfile';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = { pass: '#22c55e', partial: '#f59e0b', fail: '#ef4444' };

export default function ScoreBreakdown({ job }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const profile = getProfile() || defaultProfile;
  const { total, breakdown } = scoreJobDetailed(job, profile);
  const color = getScoreColor(total);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Clickable badge */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Click to see score breakdown"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: color + '20', color, borderRadius: 20,
          padding: '4px 12px', fontSize: 12, fontWeight: 600,
          border: `1.5px solid ${color}60`, cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {total}% {getScoreLabel(total)}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Breakdown popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
          background: '#fff', borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)', minWidth: 320, maxWidth: 400,
          border: '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
              Why {total}%?
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color }}>
              {total}<span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>/100</span>
            </span>
          </div>

          {breakdown.map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[item.status] }}>
                  {item.pts}/{item.max} pts
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{
                  height: '100%',
                  width: `${(item.pts / item.max) * 100}%`,
                  background: STATUS_COLORS[item.status],
                  borderRadius: 99,
                }} />
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{item.detail}</div>
              {item.missed?.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                  Your skills not in job description: {item.missed.join(', ')}
                </div>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            💡 Paste the full job description when adding a job for better accuracy
          </div>
        </div>
      )}
    </div>
  );
}
