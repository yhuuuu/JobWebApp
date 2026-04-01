import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Briefcase, KanbanSquare, FileText, User } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/search', label: 'Job Search', icon: Search },
  { to: '/jobs', label: 'My Jobs', icon: Briefcase },
  { to: '/tracker', label: 'Tracker', icon: KanbanSquare },
  { to: '/resumes', label: 'Resumes', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{
        width: 220, background: '#1e293b', color: '#fff', display: 'flex',
        flexDirection: 'column', padding: '24px 0', flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '0 20px 28px', fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>
          JobHunt 🎯
        </div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px',
            color: isActive ? '#fff' : '#94a3b8', textDecoration: 'none', fontWeight: isActive ? 600 : 400,
            background: isActive ? '#3b82f6' : 'transparent', borderRadius: 8, margin: '2px 10px',
            fontSize: 14, transition: 'all 0.15s',
          })}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, background: '#f8fafc', minHeight: '100vh', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
