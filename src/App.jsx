import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/JobSearch';
import JobList from './pages/JobList';
import Tracker from './pages/Tracker';
import ResumeManager from './pages/ResumeManager';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<JobSearch />} />
          <Route path="/jobs" element={<JobList />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/resumes" element={<ResumeManager />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
