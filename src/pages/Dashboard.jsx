import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobs, getApplications } from '../utils/storage';
import { Briefcase, Send, CalendarCheck, Star, Plus, Search, ChevronRight } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ background: color + '18', borderRadius: 8, padding: 8 }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#1e293b' }}>{value}</div>
    </div>
  );
}

function ScorePill({ job }) {
  const ai = job.aiAnalysis;
  const COLORS = { 'Excellent Fit': '#16a34a', 'Good Fit': '#2563eb', 'Partial Fit': '#d97706', 'Poor Fit': '#dc2626' };
  const BG = { 'Excellent Fit': '#f0fdf4', 'Good Fit': '#eff6ff', 'Partial Fit': '#fffbeb', 'Poor Fit': '#fef2f2' };

  if (!ai) {
    const score = job.fitScore || 0;
    const color = score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
    const bg = score >= 70 ? '#f0fdf4' : score >= 50 ? '#fffbeb' : '#fef2f2';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: bg, border: `2.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color }}>{score}</span>
        </div>
      </div>
    );
  }

  const color = COLORS[ai.verdict] || '#64748b';
  const bg = BG[ai.verdict] || '#f8fafc';
  const shortVerdict = ai.verdict.replace(' Fit', '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: bg, border: `2.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${color}15` }}>
        <span style={{ fontSize: 15, fontWeight: 900, color }}>{ai.overallScore}</span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, textAlign: 'center', lineHeight: 1 }}>{shortVerdict}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);

  useEffect(() => { setJobs(getJobs()); setApps(getApplications()); }, []);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const appliedThisWeek = apps.filter(a => a.status !== 'Saved' && a.dateApplied > weekAgo).length;
  const interviews = apps.filter(a => a.status === 'Interview').length;
  const topJobs = [...jobs].sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0)).slice(0, 5);
  // Filter out orphaned applications (job was deleted)
  const validApps = apps.filter(a => jobs.some(j => j.id === a.jobId));
  const recentApps = [...validApps].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0, 3);
  const bestScore = topJobs[0]?.aiAnalysis?.overallScore || topJobs[0]?.fitScore || 0;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>Welcome back, Yuting! 👋</h1>
      <p style={{ color: '#64748b', marginBottom: 28, fontSize: 14 }}>Here's your job hunt at a glance.</p>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard icon={Briefcase} label="Jobs Saved" value={jobs.length} color="#3b82f6" />
        <StatCard icon={Send} label="Applied This Week" value={appliedThisWeek} color="#8b5cf6" />
        <StatCard icon={CalendarCheck} label="Interviews" value={interviews} color="#22c55e" />
        <StatCard icon={Star} label="Best AI Match" value={bestScore ? bestScore + '%' : '—'} color="#f59e0b" />
      </div>

      {/* Top Fit Jobs */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>⭐ Top Best Fit Jobs</h2>
          <button onClick={() => navigate('/jobs')} style={{ fontSize: 13, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        {topJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <p style={{ fontWeight: 600, color: '#64748b' }}>No jobs saved yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Add jobs and paste JDs to get AI fit scores</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topJobs.map((job, i) => (
              <div key={job.id} onClick={() => navigate('/jobs')} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < topJobs.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{job.company} · {job.location}</div>
                </div>
                <ScorePill job={job} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Applications */}
      {recentApps.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>📋 Recent Applications</h2>
          {recentApps.map(app => {
            const job = jobs.find(j => j.id === app.jobId);
            const colors = { Saved: '#64748b', Applied: '#3b82f6', Interview: '#8b5cf6', Offer: '#22c55e', Rejected: '#ef4444' };
            const c = colors[app.status] || '#64748b';
            return (
              <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{job?.title || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{job?.company}</div>
                </div>
                <span style={{ background: c + '18', color: c, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{app.status}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => navigate('/search')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          <Search size={16} /> Search Jobs
        </button>
        <button onClick={() => navigate('/jobs')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
          <Plus size={16} /> Add Job
        </button>
      </div>
    </div>
  );
}

