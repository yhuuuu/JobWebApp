/**
 * AI-powered job fit analysis + resume generation using Azure OpenAI.
 * Config is loaded from .env.local — never committed to git.
 */

const ENDPOINT = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const API_KEY = import.meta.env.VITE_AZURE_OPENAI_KEY;
const DEPLOYMENT = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
const API_VERSION = import.meta.env.VITE_AZURE_OPENAI_API_VERSION;

export function isConfigured() {
  return !!(ENDPOINT && API_KEY && DEPLOYMENT);
}

async function callAI(prompt, jsonMode = true) {
  const url = `${ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': API_KEY },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Azure OpenAI error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function analyzeJobFit(job, profile) {
  if (!isConfigured()) throw new Error('NO_CONFIG');
  if (!job.description) throw new Error('NO_DESCRIPTION');

  const prompt = `
You are an expert career coach and recruiter. Analyze how well this candidate fits the job.

## Candidate Profile
- Name: ${profile.name}
- Location: ${profile.location}${profile.preferRemote ? ' (open to remote)' : ''}
- Target Roles: ${(profile.targetTitles || []).join(', ')}
- Years of Experience: ${profile.yearsExperience} (3 years full-time at EY + bootcamp + internship)
- Salary Range: $${profile.minSalary?.toLocaleString()} – $${profile.maxSalary?.toLocaleString()}
- Languages: English, Mandarin, Cantonese (all native/fluent)

## Candidate Background Summary
Client-facing technologist bridging enterprise consulting (EY, Fortune 500) and hands-on full-stack engineering (bootcamp + 2 shipped production apps).
Unique profile: combines pre-sales/technical discovery/POC skills from consulting with real coding ability (React, Node.js, TypeScript, AI integrations).
Expert in "art of the possible" demos, turning ambiguous business requirements into concrete technical scope and executable implementation plans.
Trilingual (English/Mandarin/Cantonese) — valuable for global enterprise clients.

Work Experience:
- Ernst & Young (EY) | Associate Technology Consultant | Aug 2019 – Jun 2022
  6-month Fortune 500 engagement (UPS): analyzed 35+ source-to-pay systems across a $19B procurement ecosystem.
  Led 1:1 stakeholder discovery; cleaned messy exported data using SQL and Excel; scored systems on Data Fidelity + Data Hygiene (1-3 scale);
  mapped fields into industry-standard spend taxonomy to L3 level (e.g., "Purchased Transportation → Air → Common Carriage");
  drafted system-specific recommendations (short-term: migrate to Coupa; long-term: ERP re-integration);
  built 3-wave prioritized remediation roadmap (Wave 1 = 95% of annual spend); delivered one-page system summaries.
  Reduced manual effort ~30% via SQL/Excel automation. Presented to Senior Manager stakeholders.
  Contributed to RFP and security questionnaire responses. Managed requirements as liaison between business clients and engineering teams.

- WellMed Medical Management / Optum | IT Project Analyst Intern | Aug–Dec 2018
  Coordinated IT projects across full lifecycle; supported PMs with project plans, resource estimation, milestone tracking;
  monthly reporting; conflict resolution; maintained project records in ServiceNow; HIPAA-compliant documentation in SharePoint.

Technical Projects (both live in production):
- Recipe Organizer (MERN, TypeScript, Azure OpenAI, JWT Auth, Vitest): Full-stack app with user auth, AI recipe extraction from URLs via web scraping + OpenAI, full REST API, deployed Netlify + Render
- PlantSeeker (React, Node.js, MongoDB, Pl@ntNet ML API, Perenual API): Multi-API plant identification tool with image upload, CRUD favorites, session storage

Education:
- Software Engineering Bootcamp, Per Scholas, Seattle WA (Nov 2023 – Mar 2024): HTML/CSS, JavaScript, API Integration, React
- BBA in Information Systems, UT San Antonio (2017–2019)

Certifications: Google Data Analytics Professional, Data Analysis with Pandas/Python (Udemy), SAP Extension Suite Expert

Skills: ${(profile.skills || []).join(', ')}

## Job Posting
Title: ${job.title} at ${job.company}
Location: ${job.location}
${job.salary ? `Salary: $${Number(job.salary).toLocaleString()}` : ''}
Description: ${job.description}

## Task
Evaluate holistically — consider semantics, not just keyword matching. 
Consider: consulting/client-facing experience, communication skills, technical breadth, AI/data skills, trilingual ability.
Be honest about gaps (e.g., years of experience, specific domain knowledge).

Respond ONLY with valid JSON:
{
  "overallScore": <0-100>,
  "verdict": "<Excellent Fit | Good Fit | Partial Fit | Poor Fit>",
  "summary": "<2-3 sentence honest summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "skillsFound": ["<matching skill>"],
  "skillsMissing": ["<missing skill>"],
  "recommendation": "<1 sentence — should they apply?>"
}`;

  const content = await callAI(prompt);
  return JSON.parse(content);
}


export async function generateTailoredResume(job, profile) {
  if (!isConfigured()) throw new Error('NO_CONFIG');
  if (!job.description) throw new Error('NO_DESCRIPTION');

  const prompt = `
You are an expert resume writer AND a senior recruiter who screens 200+ resumes daily. Rewrite this candidate's resume to be perfectly tailored for the job below.

## STEP 1 — Keyword Extraction (do this FIRST, before writing anything)
Read the job description below and extract the 8–10 highest-intent keywords/phrases that an ATS and recruiter would scan for. These MUST appear naturally in the resume — not stuffed, but woven into bullets and skills where the candidate's real experience supports them.

## Candidate Background
Name: ${profile.name}
Phone: ${profile.phone || '(210)-294-6504'}
Email: ${profile.email || ''}
LinkedIn: ${profile.linkedin || ''}
GitHub: ${profile.github || ''}
Location: ${profile.location}

## Career Positioning
This candidate is transitioning from enterprise technology consulting into client-facing B2B SaaS roles (Solutions Consultant, Customer Solutions Engineer, Implementation Consultant). Frame the resume as a consulting-to-SaaS-transition story. Do NOT pretend the candidate already has SaaS experience — instead, show how consulting skills directly transfer.

## Work Experience

Ernst & Young (EY) | Associate Technology Consultant | San Antonio, TX | Aug 2019 – Jun 2022 (Full-time)

Context: 6-month engagement for Fortune 500 client (UPS) — enterprise source-to-pay transformation. 35+ procurement systems feeding invoice data into a central master database. Key problems: missing fields, transactions not classified to lowest taxonomy levels, unreliable downstream reporting. Goal: analyze each system, score data quality, map taxonomy depth, and build a prioritized remediation roadmap across a $19B procurement ecosystem.

• Conducted 1:1 stakeholder discovery sessions with system owners and commodity owners across 35+ systems, walking through each system's invoicing workflow — how invoices were generated, what fields were captured (amounts, vendors, transportation details), and what typically got lost or misclassified during transmission to the master database
• Scored each system using a structured Data Hygiene and Fidelity scorecard (scale 1–3) at both invoice source and downstream ERP levels — e.g., System A (chartered planes, $100M spend): Invoice Source Fidelity=3/Hygiene=1, Downstream ERP Fidelity=1/Hygiene=1 — flagged as high risk due to fully manual invoicing process
• Exported messy raw transactional data from each system; performed hands-on data cleaning using SQL and Excel (standardizing formats, resolving nulls/duplicates); then cross-referenced cleaned data against master database to assess taxonomy mapping depth
• Mapped each system's fields into a new industry-standard spend taxonomy to verify L3-level categorization — e.g., System A mapped to "Purchased Transportation → Air → Common Carriage" (L1→L2→L3) — but only achievable after fixing upstream data capture gaps
• Produced one-page system summary deliverables for each of the 35+ systems including: scorecard results, item-based taxonomy mapping, and tailored Data/Process Recommendations
• Drafted system-specific recommendations prioritized by impact: short-term (migrate manual invoicing to Coupa to capture standardized fields + validation), long-term (pipe missing fields like Origin/Destination from Coupa back into downstream ERP)
• Sequenced all 35+ systems into a three-wave remediation roadmap using 6 criteria: ongoing work effort, quick wins, data fidelity/hygiene score, pending business decisions, high-spend priority, and resource availability — Wave 1 covered systems representing 95% of 2020 third-party spend
• Delivered four key business outcomes: (1) improved data fidelity/hygiene at source and downstream, (2) enabled item-based taxonomy to lowest level for accurate spend categorization, (3) brought missing analytics data elements into reporting environment, (4) reduced manual work by migrating invoice processes to Coupa
• Reduced manual data processing effort by ~30% by engineering SQL validation queries and advanced Excel automation during pre-implementation analysis
• Presented findings and roadmap to non-technical senior stakeholders (Senior Managers), translating complex data architecture decisions into clear business value narratives

WellMed Medical Management / Optum | IT Project Analyst Intern | San Antonio, TX | Aug 2018 – Dec 2018
• Collaborated with functional leads to document and analyze IT projects across the full project lifecycle (initiation, planning, execution, monitoring, closure)
• Supported project managers in developing project plans, estimating time and resources, and tracking milestones and deliverables
• Responsible for monthly reporting activities, project coordination actions, and resolving team conflicts
• Updated and maintained project records in ServiceNow, ensuring data accuracy and timely status reporting
• Coordinated interaction and communication between cross-functional project team members
• Maintained HIPAA-compliant technical documentation in SharePoint, ensuring regulatory and audit readiness

## Professional Development (Career Transition / Technical Upskilling, 2022–2024)
• Google Data Analytics Professional Certificate — Coursera (Feb 2022)
• Data Analysis with Pandas and Python — Udemy (Jun 2022)
• SAP Extension Suite Expert — SAP (Oct 2021)
• Software Engineering Bootcamp — Per Scholas, Seattle, WA (Nov 2023 – Mar 2024)
  Coursework: Advanced HTML/CSS, JavaScript DOM Manipulation, API Integration, React

## Technical Projects

Recipe Organizer – AI-Powered Recipe Management App | MERN Stack, TypeScript, Azure OpenAI, JWT Auth
Live Demo: https://haohaochifan.netlify.app (Demo: demo@demo.com / Demo123!)
GitHub: https://github.com/yhuuuu/recipe-organizer-frontend + recipe-organizer-backend
• Built a full-stack MERN application with TypeScript frontend (React 18, Vite, TailwindCSS) and Node.js/Express backend
• Designed and implemented JWT authentication system end-to-end: user registration/login, bcryptjs password hashing, JWT token generation/verification middleware, user-isolated data access at the database level
• Integrated Azure OpenAI + Cheerio web scraping to extract structured recipe data (title, ingredients, steps, cuisine) from any URL or pasted text — demonstrating practical AI + web scraping pipeline
• Built full RESTful API with GET/POST/PUT/PATCH/DELETE endpoints, input validation (express-validator), security headers (Helmet), CORS configuration, and request logging (Morgan)
• Implemented search and filter functionality (by title, ingredients, cuisine) across user-owned recipe collections in MongoDB Atlas
• Wrote tests with Vitest; deployed frontend to Netlify and backend to Render with environment variable management
• Tech: TypeScript, React 18, TailwindCSS, Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcryptjs, Azure OpenAI, Cheerio, Helmet, Vitest, Vite

PlantSeeker – Multi-API Plant Identification Tool | React, Node.js, Express, MongoDB
Live Demo: https://plantseeker.netlify.app
GitHub: https://github.com/yhuuuu/PlantSeeker_FrontEnd + PlantSeeker_BackEnd
• Architected an API orchestration layer combining Pl@ntNet (ML-based plant image recognition) and Perenual (botanical data) APIs behind custom Express REST endpoints
• Built image upload feature using FormData and multipart/form-data handling for secure file transmission to backend
• Implemented CRUD favorites system with MongoDB/Mongoose; used session storage to persist search results across page navigation
• Configured CORS, API key authentication, and error handling for reliable cross-origin requests and third-party API failure recovery
• Managed React state with useState/useEffect for async API calls, conditional rendering, and real-time UI updates
• Tech: React, Node.js, Express, MongoDB, Mongoose, Axios, CSS, Bootstrap, FormData, Session Storage

## Education
B.B.A. in Information Systems • The University of Texas at San Antonio | San Antonio, TX | May 2017 – May 2019

## Skills
Frontend & Web: JavaScript (ES6+), React 18, HTML5, CSS3, TailwindCSS, Responsive Web Design
Backend & APIs: Node.js, Express, REST APIs, MongoDB Atlas, Mongoose, API Authentication, CORS Configuration
Data & Analytics: SQL, Advanced Excel (Data Mapping, Reconciliation, Scorecards), Data Taxonomy Design
Solutions Consulting & Presales: Technical Discovery, Architecture Walkthroughs, Implementation Scoping, Technical Demos, POC Development, RFP & Security Questionnaire Support, Stakeholder Management
AI: OpenAI API, Generative AI Integration, Azure OpenAI
Tools: Postman, Git/GitHub, VS Code, Netlify, Render, SharePoint, ServiceNow, SAP, Coupa

Languages: English (Native), Mandarin (Native), Cantonese (Native)

## Target Job
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}

## Instructions
1. Write EXACTLY 3 sentences for the professional summary. No sentence over 25 words. Frame it as a consulting-to-SaaS transition. Pair the JD's role title with proof from real experience. Do NOT just drop the title in cosmetically.
2. COMPANY NAME RULE: If the JD says "recruiting on behalf of", "our client", "a fast-growing company", or doesn't clearly name the hiring company, do NOT guess the company name. Use "a growing B2B SaaS company" or similar generic phrasing instead. Only name the company if the JD explicitly identifies who is hiring.
3. Select and rewrite the MOST RELEVANT EY bullet points (pick 5-7 that best match the JD — not all 10). Every bullet MUST have at least one number or measurable outcome.
4. Select 3 RELEVANT WellMed bullets from the source material. Pick the 3 that best match the JD. NEVER output fewer than 3 WellMed bullets.
5. Include the Professional Development section with certifications and bootcamp, dated to show continuous learning during 2022-2024.
6. Select the most relevant project(s) and rewrite their bullets to highlight what this job cares about. Focus on outcomes and achievements, not duties.
7. Reorder skills section to put the most JD-relevant skills first
8. SKILLS HONESTY: Only list consulting skills that were done professionally at EY or WellMed. Do NOT list "Pre-Sales Demos" — use "Technical Walkthroughs" instead. Do NOT list "Onboarding Planning" — use "Implementation Planning" instead. Bootcamp project experience does not count as professional consulting skill.
9. Keep all facts strictly true — do NOT invent, exaggerate, or add experience that isn't listed above
10. Every bullet must be achievement-focused (what was the outcome?) not duty-focused (what were you responsible for?)

## CRITICAL — Writing Style Rules (follow every single one):
- Write like a real person wrote this, NOT like an AI. Short, punchy sentences. No corporate fluff.
- NEVER use first-person pronouns (I, I'm, my, me, we). Resumes use implied first person. Example: "Former EY consultant with 3 years..." NOT "I'm a former EY consultant who spent 3 years..."
- BANNED words and phrases (never use): "spearheaded", "leveraged", "utilized", "orchestrated", "robust", "seamlessly", "cutting-edge", "synergy", "transformative", "innovative", "dynamic", "passionate", "results-driven", "detail-oriented", "cross-functional collaboration", "stakeholder alignment", "drove impactful outcomes", "deep dive", "pain points", "actionable insights", "holistic", "in a fast-paced environment", "wear many hats", "go-to person"
- Do NOT start every bullet with a different fancy verb just to sound impressive. Use simple verbs: ran, built, wrote, reviewed, mapped, cleaned, created, sent, fixed, found.
- Bullets should read like something you'd say out loud in an interview, not like a press release
- Summary: conversational, specific, not generic. EXACTLY 3 sentences, no more. No sentence over 25 words.
- ZERO em-dashes (—), en-dashes (–), or Unicode dashes (‑) anywhere in the resume. Replace ALL dashes with commas or periods. No exceptions.
- No semicolons stacked. No triple adjectives.
- If a bullet has a number (35 systems, $19B, 30%), keep it. Numbers are good. Vague superlatives are not.
- NEVER end a bullet point with a period. Bullets do not get periods. Example: "Ran discovery sessions across 35 systems" NOT "Ran discovery sessions across 35 systems."
- Skills categories: just write "Core Tech:" not "**Core Tech:**". No markdown. The Word template handles bold formatting.
- Summary MUST be a single continuous paragraph. Do NOT put line breaks between sentences. All 3 sentences on one line.

## Section Order (output in EXACTLY this order, matching the Word template):
1. JOB_TITLE
2. SUMMARY_SECTION
3. SKILLS_CONTENT
4. EY_EXPERIENCE (5-7 bullets)
5. WELLMED_EXPERIENCE (exactly 3 bullets)
6. RECIPE_PROJECT_BULLETS (3 bullets)
7. PLANT_PROJECT_BULLETS (3 bullets)
8. PROFESSIONAL_DEVELOPMENT (certs + bootcamp, dated)
9. EDUCATION_SECTION
10. COACHING NOTE

Output EXACTLY this format (replace each placeholder, keep all headers/labels as-is):

JOB_TITLE
<targeted job title for this role>

SUMMARY_SECTION
<EXACTLY 3 sentences on ONE line with no line breaks. No sentence over 25 words. Consulting-to-SaaS transition framing. Write all 3 sentences as a single continuous paragraph.>

SKILLS_CONTENT
• Core Tech: <most relevant tech skills first>
• Solutions Consulting: <most relevant consulting skills first>
• Tools: <relevant tools>
• Languages: Native/Fluent in English, Mandarin, and Cantonese

EY_EXPERIENCE
• <bullet with number/outcome, NO period at end — pick 5-7 most relevant>
• <bullet, no period>
• <bullet, no period>
• <bullet, no period>
• <bullet, no period>

WELLMED_EXPERIENCE
• <relevant bullet with outcome, no period>
• <relevant bullet with outcome, no period>
• <relevant bullet with outcome, no period>

RECIPE_PROJECT_BULLETS
• <tailored bullet, no period>
• <bullet, no period>
• <bullet, no period>

PLANT_PROJECT_BULLETS
• <tailored bullet, no period>
• <bullet, no period>
• <bullet, no period>

PROFESSIONAL_DEVELOPMENT
• Google Data Analytics Professional Certificate, Coursera (Feb 2022)
• Data Analysis with Pandas and Python, Udemy (Jun 2022)
• SAP Extension Suite Expert, SAP (Oct 2021)
• Software Engineering Bootcamp, Per Scholas, Seattle, WA (Nov 2023 to Mar 2024)

EDUCATION_SECTION
B.B.A. in Information Systems — The University of Texas at San Antonio (May 2019)

---
COACHING NOTE (REQUIRED — you MUST output all 4 fields below, this is not optional):
JD Keywords Found: <list which of the 8-10 extracted keywords appear in the resume>
JD Keywords Missing: <list any that could not be naturally included, suggest where to add them>
Self-Score: <rate this resume's fit 1-100 against the JD, be brutally honest>
Weak Spots: <1-2 sentences on what to emphasize in cover letter/interview to compensate>`;

  return await callAI(prompt, false);
}

export async function generateCoverLetter(job, profile) {
  if (!isConfigured()) throw new Error('NO_CONFIG');
  if (!job.description) throw new Error('NO_DESCRIPTION');

  const prompt = `
You are helping Yuting Hu write a cover letter for a job application. Write it in Yuting's voice — direct, confident, not stiff.

## About Yuting
Name: ${profile.name}
Email: ${profile.email}
LinkedIn: ${profile.linkedin}
Location: ${profile.location}
Languages: English, Mandarin, Cantonese (all native)

Background: 3 years as Associate Technology Consultant at EY (Fortune 500 work — UPS $19B procurement project). Now a full-stack developer (React, Node.js, TypeScript, MongoDB, Azure OpenAI). Trilingual. Bootcamp grad (Per Scholas, 2024). Strong at client-facing work, technical discovery, translating complex things into plain language.

## Job
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}

## Instructions
- 3 short paragraphs, max 250 words total
- Paragraph 1: Why this specific role at this specific company (not generic)
- Paragraph 2: 1-2 concrete things from Yuting's background that directly match what they need — use real details (EY/UPS, projects, skills), not vague claims
- Paragraph 3: Short closer, confident not desperate. One sentence max.
- Sound like a real person wrote this. Conversational. No buzzwords.
- BANNED: "I am writing to express my interest", "I am a passionate", "I would be a great fit", "leveraged", "spearheaded", "synergy", "transformative", "I believe my skills align"
- Start with something that isn't "I" — vary the opener
- Sign off: "Best,\\nYuting Hu"

Output just the letter text, nothing else.`;

  return await callAI(prompt, false);
}
