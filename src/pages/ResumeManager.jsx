import { useState, useEffect } from 'react';
import { getResumes, saveResumes, genId, getJobs } from '../utils/storage';
import { defaultResumes } from '../data/defaultProfile';
import { Plus, Trash2, ExternalLink, Link } from 'lucide-react';

const emptyForm = { label: '', url: '', notes: '', type: 'resume' };

export default function ResumeManager() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('resume');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, type: 'resume' });
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const stored = getResumes();
    setItems(stored && stored.length > 0 ? stored : defaultResumes);
    setJobs(getJobs());
  }, []);

  function refresh(updated) { setItems(updated); saveResumes(updated); }

  function handleAdd() {
    const item = { ...form, id: genId(), type: tab, dateAdded: new Date().toISOString() };
    const updated = [item, ...items];
    refresh(updated);
    setForm({ ...emptyForm, type: tab });
    setShowModal(false);
  }

  function handleDelete(id) {
    refresh(items.filter(i => i.id !== id));
  }

  const displayed = items.filter(i => i.type === tab);

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>Resumes & Cover Letters</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>Manage your versions and link them to job applications.</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm, type: tab }); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Plus size={16} /> Add {tab === 'resume' ? 'Resume' : 'Cover Letter'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {['resume', 'cover_letter'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#1e293b' : '#64748b', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, fontSize: 14, boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t === 'resume' ? '📄 Resumes' : '✉️ Cover Letters'}
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <p>No {tab === 'resume' ? 'resumes' : 'cover letters'} yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{item.label}</div>
                {item.notes && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{item.notes}</div>}
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Added {new Date(item.dateAdded).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#3b82f6', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>
                    <ExternalLink size={14} /> Open
                  </a>
                )}
                {!item.url && (
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Link size={12} /> No link yet
                  </span>
                )}
                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Add {tab === 'resume' ? 'Resume' : 'Cover Letter'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <Field label="Label *"><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder={tab === 'resume' ? 'e.g. Software Engineer v2' : 'e.g. Didomi Cover Letter'} /></Field>
            <Field label="File URL or Google Drive Link"><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://docs.google.com/..." /></Field>
            <Field label="Notes">
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="What's this version tailored for?" rows={3} />
            </Field>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button onClick={handleAdd} disabled={!form.label} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 600, opacity: !form.label ? 0.5 : 1 }}>Add</button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, flex: 1 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{label}</span>
      {React.cloneElement(children, {
        style: { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' }
      })}
    </label>
  );
}

import React from 'react';
