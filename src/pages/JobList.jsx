import { useState, useEffect } from 'react';
import { getJobs, addJob, deleteJob, updateJob, genId, addApplication, getApplications, updateApplication } from '../utils/storage';
import { getProfile } from '../utils/storage';
import { defaultProfile } from '../data/defaultProfile';
import { scoreJob } from '../utils/scorer';
import { analyzeJobFit, isConfigured, generateTailoredResume, generateCoverLetter } from '../utils/aiAnalyzer';
import { downloadAsWord } from '../utils/wordExport';
import AIBadge from '../components/AIBadge';
import { Plus, Trash2, ExternalLink, FileText, Mail, Copy, Check, Download, FileDown } from 'lucide-react';
import React from 'react';

const STATUSES = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];

const inputStyle = { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', background: '#fff', minWidth: 140 };

function StatusBadge({ status }) {
  const colors = { Saved: '#64748b', Applied: '#3b82f6', Interview: '#8b5cf6', Offer: '#22c55e', Rejected: '#ef4444' };
  const c = colors[status] || '#64748b';
  return <span style={{ background: c + '20', color: c, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>{status}</span>;
}

const emptyForm = { title: '', company: '', location: '', salary: '', url: '', description: '', tags: '' };

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [importedFrom, setImportedFrom] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [analyzingId, setAnalyzingId] = useState(null);
  const [resumeModal, setResumeModal] = useState(null);
  const [coverModal, setCoverModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState({ done: 0, total: 0 });

  useEffect(() => { setJobs(getJobs()); }, []);
  function refresh() { setJobs(getJobs()); }

  async function handleReanalyzeAll() {
    if (!isConfigured()) { alert('Azure OpenAI not configured. Check your .env.local file and restart the dev server.'); return; }
    const allJobs = getJobs().filter(j => j.description);
    if (!allJobs.length) return;
    refresh(); // ensure UI shows jobs immediately
    setReanalyzing(true);
    setReanalyzeProgress({ done: 0, total: allJobs.length });
    const profile = getProfile() || defaultProfile;
    for (let i = 0; i < allJobs.length; i++) {
      try {
        const result = await analyzeJobFit(allJobs[i], profile);
        updateJob(allJobs[i].id, { fitScore: result.overallScore, aiAnalysis: result });
        refresh(); // update card in real-time as each job finishes
      } catch (e) {
        console.warn('Re-analyze failed for', allJobs[i].title, e.message);
      }
      setReanalyzeProgress({ done: i + 1, total: allJobs.length });
    }
    setReanalyzing(false);
  }

  // Handle import from Chrome extension — real-time, no reload needed
  useEffect(() => {
    function handlePendingImport() {
      const pending = localStorage.getItem('pendingImport');
      if (!pending) return;
      localStorage.removeItem('pendingImport');
      try {
        const data = JSON.parse(pending);
        setForm({
          title: data.title || '',
          company: data.company || '',
          location: data.location || '',
          salary: data.salary || '',
          url: data.jobId ? `https://www.linkedin.com/jobs/view/${data.jobId}/` : (data.url || ''),
          description: data.description || '',
          tags: '',
        });
        setImportedFrom(true);
        setShowModal(true);
      } catch (e) {
        console.warn('Failed to parse pendingImport:', e);
      }
    }

    // Check on mount (handles page-load case)
    handlePendingImport();

    // Listen for real-time injection from extension (dispatchEvent in same tab)
    function onStorage(e) {
      if (e.key === 'pendingImport') handlePendingImport();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  async function handleAdd() {
    const profile = getProfile() || defaultProfile;
    const job = {
      ...form,
      id: genId(),
      salary: form.salary ? Number(form.salary) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      dateAdded: new Date().toISOString(),
      status: 'Saved',
      aiAnalysis: null,
      fitScore: scoreJob({ ...form }, profile), // keyword fallback while AI loads
    };
    addJob(job);
    addApplication({ id: genId(), jobId: job.id, status: 'Saved', dateApplied: null, notes: '', resumeId: '', coverLetterId: '', history: [{ status: 'Saved', date: new Date().toISOString() }], updatedAt: new Date().toISOString() });
    setForm(emptyForm);
    setShowModal(false);
    refresh();

    // Auto AI-score in background if description exists
    if (job.description && isConfigured()) {
      setAnalyzingId(job.id);
      try {
        const result = await analyzeJobFit(job, profile);
        updateJob(job.id, { fitScore: result.overallScore, aiAnalysis: result });
        refresh();
      } catch (e) {
        console.warn('AI auto-score failed:', e.message);
      } finally {
        setAnalyzingId(null);
      }
    }
  }

  function handleDelete(id) { deleteJob(id); refresh(); }
  function handleStatusChange(id, status) { updateJob(id, { status }); refresh(); }

  async function handleGenerateResume(job) {
    setResumeModal({ job, jobId: job.id, content: null, loading: true });
    try {
      const profile = getProfile() || defaultProfile;
      const content = await generateTailoredResume(job, profile);
      setResumeModal({ job, jobId: job.id, content, loading: false });
    } catch (e) {
      setResumeModal({ job, jobId: job.id, content: null, loading: false, error: e.message });
    }
  }

  async function handleGenerateCoverLetter(job) {
    setCoverModal({ job, content: null, loading: true });
    try {
      const profile = getProfile() || defaultProfile;
      const content = await generateCoverLetter(job, profile);
      setCoverModal({ job, content, loading: false });
    } catch (e) {
      setCoverModal({ job, content: null, loading: false, error: e.message });
    }
  }

  function handleCopy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadPDF(content, job) {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Resume - ${job?.title || 'Tailored Resume'}</title>
<style>
  body { font-family: 'Georgia', serif; max-width: 780px; margin: 40px auto; padding: 0 32px; color: #1a1a1a; font-size: 13.5px; line-height: 1.7; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; margin: 0; }
  @media print {
    body { margin: 0; padding: 24px 40px; }
    @page { margin: 1in; }
  }
</style>
</head>
<body><pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body>
</html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  function getApplyUrl(job) {
    if (!job.url) return null;
    if (job.url.includes('/jobs/view/')) return job.url;
    const id = job.url.match(/currentJobId=(\d+)/)?.[1] || job.url.match(/\/jobs\/view\/(\d+)/)?.[1];
    if (id) return `https://www.linkedin.com/jobs/view/${id}/`;
    return job.url;
  }

  let displayed = [...jobs];
  if (search) displayed = displayed.filter(j => `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(search.toLowerCase()));
  if (filterStatus) displayed = displayed.filter(j => j.status === filterStatus);
  if (sortBy === 'score') displayed.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
  else if (sortBy === 'company') displayed.sort((a, b) => a.company.localeCompare(b.company));
  else displayed.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>My Jobs</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{jobs.length} job{jobs.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleReanalyzeAll} disabled={reanalyzing} style={{ display: 'flex', alignItems: 'center', gap: 8, background: reanalyzing ? '#f1f5f9' : '#f0fdf4', color: reanalyzing ? '#94a3b8' : '#15803d', border: `1.5px solid ${reanalyzing ? '#e2e8f0' : '#bbf7d0'}`, borderRadius: 10, padding: '11px 16px', cursor: reanalyzing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
            {reanalyzing ? `✨ Analyzing ${reanalyzeProgress.done}/${reanalyzeProgress.total}…` : '✨ Re-analyze All'}
          </button>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
            <Plus size={16} /> Add Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search jobs..." style={inputStyle} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
          <option value="date">Sort: Newest</option>
          <option value="score">Sort: Best Fit</option>
          <option value="company">Sort: Company</option>
        </select>
      </div>

      {/* Job Cards */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>No jobs yet.</p>
          <p style={{ fontSize: 14, marginTop: 4 }}>Add jobs manually or use Job Search to find openings.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayed.map(job => {
            const ai = job.aiAnalysis;
            const scoreColor = ai
              ? ({ 'Excellent Fit': '#16a34a', 'Good Fit': '#2563eb', 'Partial Fit': '#d97706', 'Poor Fit': '#dc2626' }[ai.verdict] || '#64748b')
              : '#94a3b8';

            return (
              <div key={job.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden', borderLeft: `4px solid ${scoreColor}` }}>
                {/* Card Header */}
                <div style={{ padding: '16px 20px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    {/* Left: title, company, meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', margin: 0 }}>{job.title}</h3>
                        <StatusBadge status={job.status} />
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>🏢 {job.company}</span>
                        {job.location && <span>📍 {job.location}</span>}
                        {job.salary && <span>💰 ${Number(job.salary).toLocaleString()}</span>}
                        <span style={{ color: '#cbd5e1' }}>Added {new Date(job.dateAdded).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <select
                        value={job.status}
                        onChange={e => handleStatusChange(job.id, e.target.value)}
                        style={{ ...inputStyle, fontSize: 12, padding: '5px 10px', width: 'auto', cursor: 'pointer' }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {getApplyUrl(job) && (
                        <a href={getApplyUrl(job)} target="_blank" rel="noreferrer"
                          style={{ width: 32, height: 32, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => handleDelete(job.id)}
                        style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {job.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      {job.tags.map(t => <span key={t} style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>{t}</span>)}
                    </div>
                  )}
                </div>

                {/* AI Score Section */}
                <div style={{ padding: '0 20px 16px' }}>
                  {analyzingId === job.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: '#faf5ff', borderRadius: 10, border: '1px solid #ddd6fe' }}>
                      <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>✨ AI is scoring this job…</span>
                    </div>
                  ) : (
                    <AIBadge job={job} onUpdate={refresh} />
                  )}
                </div>

                {/* Action buttons — resume + cover letter for strong matches */}
                {job.aiAnalysis?.overallScore >= 70 && (
                  <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleGenerateResume(job)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(22,163,74,0.3)' }}
                    >
                      <FileText size={14} /> Tailored Resume
                    </button>
                    <button
                      onClick={() => handleGenerateCoverLetter(job)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(124,58,237,0.3)' }}
                    >
                      <Mail size={14} /> Cover Letter
                    </button>
                    {getApplyUrl(job) && (
                      <button
                        onClick={() => {
                          window.open(getApplyUrl(job), '_blank');
                          // Mark as Applied in job + application
                          updateJob(job.id, { status: 'Applied' });
                          const app = getApplications().find(a => a.jobId === job.id);
                          if (app) {
                            updateApplication(app.id, {
                              status: 'Applied',
                              dateApplied: new Date().toISOString(),
                              history: [...(app.history || []), { status: 'Applied', date: new Date().toISOString() }],
                              updatedAt: new Date().toISOString(),
                            });
                          }
                          refresh();
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg, #0a66c2, #004182)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(10,102,194,0.3)' }}
                      >
                        <ExternalLink size={14} /> Apply Now
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Job Modal */}
      {showModal && (
        <Modal title={importedFrom ? '📥 Imported from LinkedIn' : 'Add Job'} onClose={() => { setShowModal(false); setImportedFrom(false); setForm(emptyForm); }}>
          {importedFrom ? (
            <div style={{ background: 'linear-gradient(135deg, #0a66c2, #004182)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🚀</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Job imported from LinkedIn!</div>
                <div style={{ fontSize: 12, color: '#93c5fd' }}>Review the details below, then click Add Job to AI-score it</div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
              ✨ AI will automatically analyze the fit when you paste the job description
            </div>
          )}
          <FormField label="Job Title *"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Solutions Consultant" /></FormField>
          <FormField label="Company *"><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Salesforce" /></FormField>
          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Location"><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Remote, NYC..." /></FormField>
            <FormField label="Salary ($)"><input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="120000" /></FormField>
          </div>
          <FormField label="Job URL"><input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></FormField>
          <FormField label="📋 Job Description (paste the full JD — required for AI scoring)">
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Paste the full job description here. The AI will read this to score your fit and generate a tailored resume." rows={5} />
          </FormField>
          <FormField label="Tags (comma separated)"><input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="React, SaaS, B2B" /></FormField>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            <button onClick={handleAdd} disabled={!form.title?.trim() || !form.company?.trim()} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', cursor: (!form.title?.trim() || !form.company?.trim()) ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: (!form.title?.trim() || !form.company?.trim()) ? 0.5 : 1 }}>
              Add Job {form.description ? '+ AI Score ✨' : ''}
            </button>
            <button onClick={() => setShowModal(false)} style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Generate Resume Modal */}
      {resumeModal && (
        <Modal title={resumeModal.loading ? '✨ Generating tailored resume…' : '📄 Tailored Resume'} onClose={() => setResumeModal(null)}>
          {resumeModal.loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7c3aed' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>AI is writing your resume…</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Tailoring your experience to match this job description</div>
            </div>
          )}
          {resumeModal.error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, color: '#b91c1c', fontSize: 13 }}>
              {resumeModal.error}
            </div>
          )}
          {resumeModal.content && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button onClick={() => downloadAsWord(resumeModal.content, resumeModal.job?.title).catch(e => alert('Word export failed: ' + e.message))} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <FileDown size={14} /> Download Word
                </button>
                <button onClick={() => handleDownloadPDF(resumeModal.content, resumeModal.job)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => handleCopy(resumeModal.content)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: copied ? '#f0fdf4' : '#f1f5f9', color: copied ? '#15803d' : '#475569', border: `1.5px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy All</>}
                </button>
              </div>
              <pre style={{ background: '#f8fafc', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.7, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '60vh', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                {resumeModal.content}
              </pre>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, textAlign: 'center' }}>
                💚 Download Word = fills your Resume Template.docx automatically
              </p>
            </>
          )}
        </Modal>
      )}

      {/* Cover Letter Modal */}
      {coverModal && (
        <Modal title={coverModal.loading ? '✉️ Writing cover letter…' : '✉️ Cover Letter'} onClose={() => setCoverModal(null)}>
          {coverModal.loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#7c3aed' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Writing your cover letter…</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Tailoring to {coverModal.job?.company}</div>
            </div>
          )}
          {coverModal.error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, color: '#b91c1c', fontSize: 13 }}>
              {coverModal.error}
            </div>
          )}
          {coverModal.content && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
                <button onClick={() => handleDownloadPDF(coverModal.content, coverModal.job)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Download size={14} /> Download PDF
                </button>
                <button onClick={() => handleCopy(coverModal.content)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: copied ? '#f0fdf4' : '#f1f5f9', color: copied ? '#15803d' : '#475569', border: `1.5px solid ${copied ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy All</>}
                </button>
              </div>
              <pre style={{ background: '#f8fafc', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.9, color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '60vh', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                {coverModal.content}
              </pre>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, flex: 1 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{label}</span>
      {React.cloneElement(children, {
        style: { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' }
      })}
    </label>
  );
}
