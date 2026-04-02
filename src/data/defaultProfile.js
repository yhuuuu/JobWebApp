export const defaultProfile = {
  name: 'Yuting Hu',
  email: 'yutinghu3@gmail.com',
  phone: '(210)-294-6504',
  linkedin: 'https://www.linkedin.com/in/yutinghu3',
  github: 'https://github.com/yhuuuu',
  location: 'Bellevue, WA',
  preferRemote: true,
  targetTitles: [
    'Solutions Consultant',
    'Associate Solutions Consultant',
    'Technical Consultant',
    'Pre-Sales Solutions Engineer',
    'Solutions Engineer',
    'Implementation Consultant',
    'Full-Stack Developer',
  ],
  skills: [
    // Frontend & Web
    'JavaScript (ES6+)', 'TypeScript', 'React 18', 'HTML5', 'CSS3',
    'TailwindCSS', 'Bootstrap', 'Responsive Web Design', 'DOM Manipulation',
    // Backend & APIs
    'Node.js', 'Express', 'REST APIs', 'MongoDB Atlas', 'Mongoose',
    'JWT Authentication', 'bcryptjs', 'API Authentication', 'CORS Configuration',
    // AI & Data
    'OpenAI API', 'Azure OpenAI', 'Generative AI Integration', 'AI-Powered POC Development',
    'SQL', 'Advanced Excel (Data Mapping, Reconciliation, Scorecards)',
    'Data Taxonomy Design', 'Data Fidelity & Hygiene Analysis',
    // Solutions Consulting & Presales
    'Technical Discovery', 'Pre-sales Scoping', 'Client Demos', 'Proof-of-Concept (POC) Development',
    'Architecture Walkthroughs', 'Implementation Scoping', 'Requirements Gathering',
    'Stakeholder Management', 'Cross-Functional Collaboration', 'Technical Documentation',
    // Tools & Platforms
    'Postman', 'Browser DevTools', 'Git', 'GitHub', 'VS Code',
    'Netlify', 'Render', 'SharePoint', 'ServiceNow', 'SAP Ariba',
    
  ],
  languages: ['English (Native)', 'Mandarin (Native)', 'Cantonese (Native)'],
  minSalary: 60000,
  maxSalary: 150000,
  yearsExperience: 5,
};

export const defaultResumes = [
  { id: 'r1', type: 'resume', label: 'Master Resume', url: '', notes: 'General purpose resume', dateAdded: new Date().toISOString() },
  { id: 'r2', type: 'resume', label: 'Solutions Consultant — Didomi', url: '', notes: 'Tailored for Solutions Consultant roles', dateAdded: new Date().toISOString() },
  { id: 'r3', type: 'cover_letter', label: 'Cover Letter Template', url: '', notes: 'Base template to customize', dateAdded: new Date().toISOString() },
];
