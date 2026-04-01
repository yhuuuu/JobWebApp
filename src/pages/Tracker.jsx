import { useState, useEffect, useRef } from 'react';
import { getApplications, getJobs, updateApplication, getResumes } from '../utils/storage';
import { getScoreColor, getScoreLabel } from '../utils/scorer';

const COLUMNS = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
const COL_COLORS = {
  Saved: '#64748b', Applied: '#3b82f6', Interview: '#8b5cf6', Offer: '#22c55e', Rejected: '#ef4444',
};
const COL_BG = {
  Saved: '#f8fafc', Applied: '#eff6ff', Interview: '#faf5ff', Offer: '#f0fdf4', Rejected: '#fef2f2',
};

export default function Tracker() {
  const [apps, setApps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState(null);       // app id being dragged
  const [dragOver, setDragOver] = useState(null);   // column being hovered

  useEffect(() => {
    setApps(getApplications());
    setJobs(getJobs());
    setResumes(getResumes() || []);
  }, []);

  function refresh() { setApps(getApplications()); }

  function moveTo(appId, newStatus) {
    const app = apps.find(a => a.id === appId);
    if (!app || app.status === newStatus) return;
    const history = [...(app.history || []), { status: newStatus, date: new Date().toISOString() }];
    updateApplication(appId, {
      status: newStatus,
      dateApplied: newStatus === 'Applied' ? new Date().toISOString() : app.dateApplied,
      history,
      updatedAt: new Date().toISOString(),
    });
    refresh();
  }

  function saveNotes(appId, notes) {
    updateApplication(appId, { notes, updatedAt: new Date().toISOString() });
    refresh();
  }

  function filtered(status) {
    return apps.filter(a => {
      if (a.status !== status) return false;
      const job = jobs.find(j => j.id === a.jobId);
      if (!job) return false;
      if (search) return `${job.title} ${job.company}`.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }

  // Drag handlers
  function onDragStart(e, appId) {
    setDragId(appId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appId);
  }

  function onDragEnd() {
    setDragId(null);
    setDragOver(null);
  }

  function onDragOver(e, col) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(col);
  }

  function onDrop(e, col) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    if (id) moveTo(id, col);
    setDragId(null);
    setDragOver(null);
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Application Tracker</h1>
      <p style={{ color: '#64748b', marginBottom: 20 }}>Drag cards between columns to update status.</p>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Filter by company or title..."
        style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', fontSize: 14, outline: 'none', width: 300, marginBottom: 24 }}
      />

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {COLUMNS.map(col => {
          const colApps = filtered(col);
          const isOver = dragOver === col;
          return (
            <div
              key={col}
              onDragOver={e => onDragOver(e, col)}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, col)}
              style={{
                minWidth: 230, flex: '0 0 230px',
                background: isOver ? COL_COLORS[col] + '12' : '#f1f5f9',
                borderRadius: 12,
                padding: '12px 10px',
                border: `2px solid ${isOver ? COL_COLORS[col] : 'transparent'}`,
                transition: 'border-color 0.15s, background 0.15s',
                minHeight: 200,
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COL_COLORS[col], flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{col}</span>
                <span style={{ background: COL_COLORS[col] + '25', color: COL_COLORS[col], borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>{colApps.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {colApps.length === 0 && (
                  <div style={{
                    borderRadius: 8, padding: '24px 12px', textAlign: 'center',
                    color: isOver ? COL_COLORS[col] : '#cbd5e1',
                    fontSize: 12, border: `2px dashed ${isOver ? COL_COLORS[col] : '#e2e8f0'}`,
                    background: isOver ? COL_COLORS[col] + '08' : 'transparent',
                    transition: 'all 0.15s',
                    fontWeight: isOver ? 600 : 400,
                  }}>
                    {isOver ? `Drop here →` : 'Drop here'}
                  </div>
                )}

                {colApps.map(app => {
                  const job = jobs.find(j => j.id === app.jobId);
                  const isExpanded = expanded === app.id;
                  const isDragging = dragId === app.id;
                  const aiScore = job?.aiAnalysis?.overallScore || job?.fitScore;
                  const scoreColor = aiScore != null ? getScoreColor(aiScore) : null;

                  return (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={e => onDragStart(e, app.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => setExpanded(isExpanded ? null : app.id)}
                      style={{
                        background: isDragging ? '#f1f5f9' : '#fff',
                        borderRadius: 10,
                        padding: '12px 12px 10px',
                        boxShadow: isDragging ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                        cursor: 'grab',
                        opacity: isDragging ? 0.4 : 1,
                        border: isExpanded ? `1.5px solid ${COL_COLORS[col]}` : '1.5px solid transparent',
                        borderLeft: `3px solid ${COL_COLORS[col]}`,
                        transition: 'opacity 0.15s, box-shadow 0.15s',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2, lineHeight: 1.3 }}>{job?.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{job?.company}</div>

                      {aiScore != null && (
                        <span style={{ fontSize: 11, background: scoreColor + '20', color: scoreColor, borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                          {aiScore}% {getScoreLabel(aiScore)}
                        </span>
                      )}

                      {isExpanded && (
                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Notes</label>
                          <textarea
                            defaultValue={app.notes || ''}
                            onBlur={e => saveNotes(app.id, e.target.value)}
                            placeholder="Interview prep, contacts..."
                            rows={3}
                            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '7px 9px', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                          {resumes.length > 0 && (
                            <>
                              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4, marginTop: 8 }}>Resume Used</label>
                              <select defaultValue={app.resumeId || ''} onChange={e => { updateApplication(app.id, { resumeId: e.target.value }); refresh(); }}
                                style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                                <option value="">— Select resume —</option>
                                {resumes.filter(r => r.type === 'resume').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                              </select>
                            </>
                          )}
                          {app.history?.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>History</div>
                              {app.history.map((h, i) => (
                                <div key={i} style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                                  <span style={{ color: COL_COLORS[h.status] || '#64748b', fontWeight: 600 }}>{h.status}</span>
                                  {' — '}{new Date(h.date).toLocaleDateString()}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick move buttons */}
                          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                            {COLUMNS.filter(c => c !== col).map(c => (
                              <button key={c} onClick={() => moveTo(app.id, c)}
                                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, border: `1px solid ${COL_COLORS[c]}40`, background: COL_COLORS[c] + '10', color: COL_COLORS[c], cursor: 'pointer', fontWeight: 600 }}>
                                → {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>💡 Drag cards between columns, or click a card to expand and use quick-move buttons</p>
    </div>
  );
}
