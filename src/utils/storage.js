const KEYS = {
  PROFILE: 'jh_profile',
  JOBS: 'jh_jobs',
  APPLICATIONS: 'jh_applications',
  RESUMES: 'jh_resumes',
};

function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Profile
export function getProfile() {
  return load(KEYS.PROFILE, null);
}
export function saveProfile(profile) {
  save(KEYS.PROFILE, profile);
}

// Jobs
export function getJobs() {
  return load(KEYS.JOBS, []);
}
export function saveJobs(jobs) {
  save(KEYS.JOBS, jobs);
}
export function addJob(job) {
  const jobs = getJobs();
  jobs.unshift(job);
  saveJobs(jobs);
}
export function updateJob(id, updates) {
  const jobs = getJobs().map(j => j.id === id ? { ...j, ...updates } : j);
  saveJobs(jobs);
}
export function deleteJob(id) {
  saveJobs(getJobs().filter(j => j.id !== id));
  // Cascade: remove linked application so Dashboard/Tracker don't show orphans
  saveApplications(getApplications().filter(a => a.jobId !== id));
}

// Applications
export function getApplications() {
  return load(KEYS.APPLICATIONS, []);
}
export function saveApplications(apps) {
  save(KEYS.APPLICATIONS, apps);
}
export function addApplication(app) {
  const apps = getApplications();
  apps.unshift(app);
  saveApplications(apps);
}
export function updateApplication(id, updates) {
  const apps = getApplications().map(a => a.id === id ? { ...a, ...updates } : a);
  saveApplications(apps);
}
export function deleteApplication(id) {
  saveApplications(getApplications().filter(a => a.id !== id));
}

// Resumes
export function getResumes() {
  return load(KEYS.RESUMES, null);
}
export function saveResumes(resumes) {
  save(KEYS.RESUMES, resumes);
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
