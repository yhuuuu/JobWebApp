import { useEffect, useState, useRef } from 'react';
import { getProfile, saveProfile, getJobs, getApplications, getResumes, saveJobs, saveApplications, saveResumes } from '../utils/storage';
import { defaultProfile } from '../data/defaultProfile';
import { Save, X, Plus, Download, Upload } from 'lucide-react';

export default function Profile() {
  const [form, setForm] = useState(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const p = getProfile();
    if (p) setForm(p);
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function addTag(field, value, setter) {
    const trimmed = value.trim();
    if (!trimmed || form[field].includes(trimmed)) return;
    setForm(f => ({ ...f, [field]: [...f[field], trimmed] }));
    setter('');
  }

  function removeTag(field, tag) {
    setForm(f => ({ ...f, [field]: f[field].filter(t => t !== tag) }));
  }

  function handleSave() {
    saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      profile: getProfile() || form,
      jobs: getJobs(),
      applications: getApplications(),
      resumes: getResumes(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobhunt-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.profile) { saveProfile(data.profile); setForm(data.profile); }
        if (data.jobs) saveJobs(data.jobs);
        if (data.applications) saveApplications(data.applications);
        if (data.resumes) saveResumes(data.resumes);
        setImportMsg({ ok: true, text: `✅ Imported ${data.jobs?.length || 0} jobs, ${data.applications?.length || 0} applications` });
      } catch {
        setImportMsg({ ok: false, text: "❌ Invalid file — make sure it's a JobHunt backup JSON" });
      }
      e.target.value = '';
      setTimeout(() => setImportMsg(null), 4000);
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>My Profile</h1>
      <p style={{ color: '#64748b', marginBottom: 28 }}>Your preferences power the best-fit scoring engine.</p>

      <Section title="Personal Info">
        <Row>
          <Field label="Full Name"><input name="name" value={form.name} onChange={handleChange} /></Field>
          <Field label="Email"><input name="email" value={form.email} onChange={handleChange} /></Field>
        </Row>
        <Row>
          <Field label="LinkedIn URL"><input name="linkedin" value={form.linkedin} onChange={handleChange} /></Field>
          <Field label="GitHub URL"><input name="github" value={form.github} onChange={handleChange} /></Field>
        </Row>
        <Row>
          <Field label="Location"><input name="location" value={form.location} onChange={handleChange} /></Field>
          <Field label="Years of Experience"><input type="number" name="yearsExperience" value={form.yearsExperience} onChange={handleChange} /></Field>
        </Row>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" name="preferRemote" checked={form.preferRemote} onChange={handleChange} />
          Prefer Remote Work
        </label>
      </Section>

      <Section title="Target Job Titles">
        <TagInput
          tags={form.targetTitles}
          input={titleInput}
          setInput={setTitleInput}
          placeholder="e.g. Solutions Consultant"
          onAdd={() => addTag('targetTitles', titleInput, setTitleInput)}
          onRemove={tag => removeTag('targetTitles', tag)}
        />
      </Section>

      <Section title="Skills">
        <TagInput
          tags={form.skills}
          input={skillInput}
          setInput={setSkillInput}
          placeholder="e.g. React"
          onAdd={() => addTag('skills', skillInput, setSkillInput)}
          onRemove={tag => removeTag('skills', tag)}
        />
      </Section>

      <Section title="Salary Preferences">
        <Row>
          <Field label="Minimum Salary ($)">
            <input type="number" name="minSalary" value={form.minSalary} onChange={handleChange} />
          </Field>
          <Field label="Maximum Salary ($)">
            <input type="number" name="maxSalary" value={form.maxSalary} onChange={handleChange} />
          </Field>
        </Row>
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Save size={16} /> Save Profile
        </button>
        {saved && <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>✅ Profile Saved!</span>}
      </div>

      {/* Backup & Restore */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginTop: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>💾 Backup & Restore</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
          Export all your jobs, applications, and profile to a JSON file. Import it back anytime — on this computer or a new one.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleExport}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <Download size={15} /> Export Backup (.json)
          </button>
          <button onClick={() => fileRef.current.click()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f1f5f9', color: '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '11px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <Upload size={15} /> Import Backup
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          {importMsg && (
            <span style={{ fontSize: 13, fontWeight: 600, color: importMsg.ok ? '#16a34a' : '#dc2626' }}>
              {importMsg.text}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>
          💡 Tip: Export weekly as a backup. To use on another computer — export here, copy the file, import on the new machine.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200, marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{label}</span>
      {React.cloneElement(children, {
        style: { border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
      })}
    </label>
  );
}

function TagInput({ tags, input, setInput, placeholder, onAdd, onRemove }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {tags.map(tag => (
          <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#3b82f6', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 500 }}>
            {tag}
            <X size={12} style={{ cursor: 'pointer' }} onClick={() => onRemove(tag)} />
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          placeholder={placeholder}
          style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }}
        />
        <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

import React from 'react';
