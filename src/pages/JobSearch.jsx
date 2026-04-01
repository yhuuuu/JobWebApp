import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, addJob, addApplication, genId, getJobs } from '../utils/storage';
import { defaultProfile } from '../data/defaultProfile';
import { scoreJob } from '../utils/scorer';
import { ExternalLink, Plus, X, Copy, Check } from 'lucide-react';
import React from 'react';

// Build Boolean search string
function buildBoolean(titles, skills, excludes) {
  const parts = [];
  if (titles.length > 0) {
    parts.push(titles.length === 1 ? `"${titles[0]}"` : `(${titles.map(t => `"${t}"`).join(' OR ')})`);
  }
  if (skills.length > 0) {
    parts.push(skills.length === 1 ? `"${skills[0]}"` : `(${skills.map(s => `"${s}"`).join(' OR ')})`);
  }
  if (excludes.length > 0) {
    parts.push(`NOT (${excludes.map(e => `"${e}"`).join(' OR ')})`);
  }
  return parts.join(' AND ');
}

function buildLinkedInUrl(query, location, filters) {
  const params = new URLSearchParams({ keywords: query });
  if (location) params.set('location', location);
  if (filters.easyApply) params.set('f_EA', 'true');
  if (filters.datePosted === '24h') params.set('f_TPR', 'r86400');
  if (filters.datePosted === '3d') params.set('f_TPR', 'r259200');
  if (filters.datePosted === '7d') params.set('f_TPR', 'r604800');
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

function buildIndeedUrl(query, location, filters) {
  const params = new URLSearchParams({ q: query, l: location || '' });
  if (filters.datePosted === '24h') params.set('fromage', '1');
  if (filters.datePosted === '3d') params.set('fromage', '3');
  if (filters.datePosted === '7d') params.set('fromage', '7');
  return `https://www.indeed.com/jobs?${params.toString()}`;
}

// Chip input component
function ChipInput({ id, label, hint, chips, setChips, placeholder, color = '#2563eb', bg = '#eff6ff' }) {
  const [input, setInput] = useState('');

  function add(val) {
    const t = val.trim();
    if (t && !chips.includes(t)) setChips(prev => [...prev, t]);
    setInput('');
  }

  function handleKey(e) {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && chips.length > 0) {
      setChips(prev => prev.slice(0, -1));
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
      {hint && <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{hint}</p>}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: `1.5px solid ${chips.length > 0 ? color + '60' : '#e2e8f0'}`, borderRadius: 10, background: '#fff', minHeight: 46, alignItems: 'center', cursor: 'text' }}
        onClick={() => document.getElementById(id).focus()}
      >
        {chips.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, borderRadius: 20, padding: '4px 11px', fontSize: 13, fontWeight: 600, border: `1px solid ${color}30` }}>
            {t}
            <button onClick={() => setChips(p => p.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: color + '80', display: 'flex', padding: 0 }}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => input.trim() && add(input)}
          placeholder={chips.length === 0 ? placeholder : 'Add more…'}
          style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 180, padding: '2px 4px', background: 'transparent', color: '#1e293b' }}
        />
      </div>
    </div>
  );
}

const emptyForm = { title: '', company: '', location: '', salary: '', url: '', description: '', tags: '' };

export default function JobSearch() {
  const navigate = useNavigate();
  const profile = getProfile() || defaultProfile;

  const [titles, setTitles] = useState(profile.targetTitles?.slice(0, 2) || []);
  const [skills, setSkills] = useState([]);
  const [excludes, setExcludes] = useState(['Senior', 'Sr', 'Lead', 'Principal', 'Director']);
  const [location, setLocation] = useState(profile.preferRemote ? 'Remote' : (profile.location || ''));
  const [filters, setFilters] = useState({ easyApply: false, datePosted: '' });
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({ ...emptyForm, location: profile.location || '' });
  const [added, setAdded] = useState(false);
  const recentJobs = getJobs().slice(0, 5);

  const booleanQuery = buildBoolean(titles, skills, excludes);
  const linkedInUrl = booleanQuery ? buildLinkedInUrl(booleanQuery, location, filters) : '';
  const indeedUrl = booleanQuery ? buildIndeedUrl(booleanQuery, location, filters) : '';

  function copyQuery() {
    navigator.clipboard.writeText(booleanQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAdd() {
    const job = {
      ...form,
      id: genId(),
      salary: form.salary ? Number(form.salary) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      dateAdded: new Date().toISOString(),
      status: 'Saved',
      source: 'manual',
    };
    job.fitScore = scoreJob(job, profile);
    addJob(job);
    addApplication({ id: genId(), jobId: job.id, status: 'Saved', dateApplied: null, notes: '', resumeId: '', coverLetterId: '', history: [{ status: 'Saved', date: new Date().toISOString() }], updatedAt: new Date().toISOString() });
    setForm({ ...emptyForm, location: profile.location || '' });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div style={{ padding: 32, maxWidth: 840 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>Job Search</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>Build a Boolean search query, then open LinkedIn / Indeed with one click.</p>

      {/* LinkedIn Premium Collections */}
      <div style={{ background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(10,102,194,0.3)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 16 }}>⭐</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>LinkedIn Premium Collections</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', color: '#bfdbfe', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>直接点开，最精准</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="https://www.linkedin.com/jobs/collections/top-applicant/" target="_blank" rel="noreferrer"
            style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 11, padding: '14px 16px', textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>🏆</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Top Applicant Jobs</div>
            <div style={{ fontSize: 12, color: '#bfdbfe', lineHeight: 1.5 }}>你的技能排在申请者前列的职位 — 竞争优势最大</div>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#0a66c2', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
              <ExternalLink size={11} /> 打开
            </div>
          </a>
          <a href="https://www.linkedin.com/jobs/collections/top-choice/" target="_blank" rel="noreferrer"
            style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 11, padding: '14px 16px', textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>✨</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Top Choice Jobs</div>
            <div style={{ fontSize: 12, color: '#bfdbfe', lineHeight: 1.5 }}>LinkedIn 根据你的 profile 推荐的最匹配职位</div>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#0a66c2', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
              <ExternalLink size={11} /> 打开
            </div>
          </a>
          <a href="https://www.linkedin.com/jobs/collections/recommended/" target="_blank" rel="noreferrer"
            style={{ flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: 11, padding: '14px 16px', textDecoration: 'none', display: 'block' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>💼</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Recommended for You</div>
            <div style={{ fontSize: 12, color: '#bfdbfe', lineHeight: 1.5 }}>基于你的活动和偏好的 AI 推荐职位</div>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#0a66c2', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
              <ExternalLink size={11} /> 打开
            </div>
          </a>
        </div>
        <p style={{ fontSize: 11, color: '#93c5fd', marginTop: 12 }}>
          💡 在这些集合里找到感兴趣的职位 → 复制 JD → 回到下方 "Add Job" → AI 自动打分
        </p>
      </div>

      {/* Boolean Builder */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🔧 Boolean Search Builder</h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef9c3', border: '1px solid #fde047', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#854d0e', marginBottom: 20 }}>
          ⭐ LinkedIn Premium 已启用 — Under 10 Applicants + Top Applicant 可用
        </div>

        <ChipInput
          id="titles"
          label="🎯 Job Titles (OR)"
          hint="Enter each title and press Enter — result: (Title A OR Title B OR Title C)"
          chips={titles} setChips={setTitles}
          placeholder='e.g. Solutions Consultant, Implementation Specialist…'
          color="#2563eb" bg="#eff6ff"
        />

        <ChipInput
          id="skills"
          label="🛠 Must-Have Skills / Keywords (AND)"
          hint="Result adds: AND (SQL OR API OR Data Mapping)"
          chips={skills} setChips={setSkills}
          placeholder='e.g. SQL, API, Salesforce, Python…'
          color="#16a34a" bg="#f0fdf4"
        />

        <ChipInput
          id="excludes"
          label="🚫 Exclude Words (NOT)"
          hint="Result adds: NOT (Senior OR Lead OR Director)"
          chips={excludes} setChips={setExcludes}
          placeholder='e.g. Senior, Lead, Director, Manager…'
          color="#dc2626" bg="#fef2f2"
        />

        {/* Location + filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>📍 Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Remote, New York…"
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>📅 Date Posted</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['', 'Any'], ['24h', '24h'], ['3d', '3 days'], ['7d', '1 week']].map(([val, label]) => (
                <button key={val} onClick={() => setFilters(f => ({ ...f, datePosted: val }))}
                  style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${filters.datePosted === val ? '#2563eb' : '#e2e8f0'}`, background: filters.datePosted === val ? '#eff6ff' : '#fff', color: filters.datePosted === val ? '#2563eb' : '#64748b', cursor: 'pointer', fontWeight: filters.datePosted === val ? 700 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#1e293b', userSelect: 'none' }}>
            <input type="checkbox" checked={filters.easyApply} onChange={e => setFilters(f => ({ ...f, easyApply: e.target.checked }))} style={{ accentColor: '#2563eb', width: 15, height: 15 }} />
            ⚡ Easy Apply (LinkedIn only)
          </label>
        </div>

        {/* Query preview */}
        {booleanQuery ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Generated Query</span>
              <button onClick={copyQuery} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: copied ? '#f0fdf4' : '#f8fafc', color: copied ? '#16a34a' : '#475569', cursor: 'pointer', fontWeight: 600 }}>
                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, wordBreak: 'break-word', marginBottom: 16 }}>
              <span style={{ color: '#93c5fd' }}>{
                booleanQuery
                  .replace(/OR/g, '<OR>')
                  .replace(/AND/g, '<AND>')
                  .replace(/NOT/g, '<NOT>')
                  .split(/(<OR>|<AND>|<NOT>)/)
                  .map((part, i) => {
                    if (part === '<OR>') return <span key={i} style={{ color: '#fbbf24', fontWeight: 700 }}> OR </span>;
                    if (part === '<AND>') return <span key={i} style={{ color: '#86efac', fontWeight: 700 }}> AND </span>;
                    if (part === '<NOT>') return <span key={i} style={{ color: '#fca5a5', fontWeight: 700 }}> NOT </span>;
                    return <span key={i}>{part}</span>;
                  })
              }</span>
            </div>

            {/* Open buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <a href={linkedInUrl} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#0a66c2', color: '#fff', borderRadius: 9, padding: '11px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                <ExternalLink size={14} /> Open LinkedIn
              </a>
              <a href={indeedUrl} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#003a9b', color: '#fff', borderRadius: 9, padding: '11px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                <ExternalLink size={14} /> Open Indeed
              </a>
              <a href={`https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(booleanQuery)}`} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#0caa41', color: '#fff', borderRadius: 9, padding: '11px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                <ExternalLink size={14} /> Glassdoor
              </a>
            </div>

            {/* LinkedIn Premium step guide */}
            <div style={{ background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)', borderRadius: 10, padding: '14px 16px', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>⭐</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>LinkedIn Premium — 打开后按这个顺序操作</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { step: '1', text: 'Boolean 已填入搜索框', sub: '关键词自动匹配' },
                  { step: '2', text: '点 All Filters', sub: '右上角过滤按钮' },
                  { step: '3', text: 'Applicant options', sub: '往下滚找这一栏' },
                  { step: '4', text: '✅ Under 10 applicants', sub: 'Premium 专属' },
                  { step: '5', text: "✅ You'd be a top applicant", sub: 'Premium 专属' },
                  { step: '6', text: '点 Show results', sub: '精准结果出来了' },
                ].map(({ step, text, sub }) => (
                  <div key={step} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', flex: '1', minWidth: 120 }}>
                    <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700, marginBottom: 3 }}>STEP {step}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{text}</div>
                    <div style={{ fontSize: 11, color: '#bfdbfe', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>
            Add at least one job title above to generate your search query
          </div>
        )}
      </div>

      {/* Add Job Form */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>➕ Add Job to My List</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Job Title *"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Solutions Consultant" /></Field>
          <Field label="Company *"><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Salesforce" /></Field>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Location"><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Remote" /></Field>
          <Field label="Salary ($)"><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="110000" /></Field>
        </div>
        <Field label="Job URL"><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></Field>
        <Field label="📋 Job Description (paste from listing — required for AI scoring)">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Paste the full job description here. AI will read this to score your fit." rows={5} />
        </Field>
        <Field label="Tags (comma separated)"><input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="React, SaaS, Pre-sales" /></Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
          <button onClick={handleAdd} disabled={!form.title || !form.company}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: (!form.title || !form.company) ? 0.5 : 1 }}>
            <Plus size={16} /> Add & Score Job
          </button>
          <button onClick={() => navigate('/jobs')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: 14, fontWeight: 500 }}>
            View My Jobs →
          </button>
          {added && <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>✅ Added! AI scoring in background…</span>}
        </div>
      </div>

      {recentJobs.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>🕐 Recently Added</h2>
          {recentJobs.map(job => (
            <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
              <div>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{job.title}</span>
                <span style={{ color: '#64748b', marginLeft: 8 }}>{job.company}</span>
              </div>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(job.dateAdded).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, flex: 1, minWidth: 200 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{label}</span>
      {React.cloneElement(children, {
        style: { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' }
      })}
    </label>
  );
}
