const APP_ORIGIN = 'http://localhost:5173';
const APP_JOBS   = 'http://localhost:5173/jobs';

let extracted = null;

// ─── Detect what kind of page we're on ───
function detectPlatform(url) {
  if (!url) return 'unknown';
  const h = url.toLowerCase();
  if (h.includes('linkedin.com/jobs'))                       return 'linkedin';
  if (h.includes('indeed.com'))                              return 'indeed';
  if (h.includes('myworkday') || h.includes('wd5.'))         return 'workday';
  if (h.includes('greenhouse.io'))                           return 'greenhouse';
  if (h.includes('lever.co'))                                return 'lever';
  if (h.includes('icims.com'))                               return 'icims';
  if (h.includes('smartrecruiters.com'))                     return 'smartrecruiters';
  if (h.includes('ashbyhq.com'))                             return 'ashby';
  if (h.includes('bamboohr.com'))                            return 'bamboohr';
  if (h.includes('jobvite.com'))                             return 'jobvite';
  if (h.includes('ultipro.com') || h.includes('ukg'))        return 'ukg';
  if (h.includes('paycom'))                                  return 'paycom';
  if (h.includes('successfactors'))                          return 'successfactors';
  return 'generic';
}

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn Easy Apply',
  indeed: 'Indeed Apply',
  workday: 'Workday',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  icims: 'iCIMS',
  smartrecruiters: 'SmartRecruiters',
  ashby: 'Ashby',
  bamboohr: 'BambooHR',
  jobvite: 'Jobvite',
  ukg: 'UKG / UltiPro',
  paycom: 'Paycom',
  successfactors: 'SuccessFactors',
  generic: 'this form',
  unknown: 'this page',
};

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) { renderNoPage(); return; }

  const platform = detectPlatform(tab.url);

  if (platform === 'linkedin' || platform === 'indeed') {
    // LinkedIn & Indeed: extract job details + offer import + autofill
    const scriptFile = platform === 'indeed' ? 'indeed-content.js' : 'content.js';
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [scriptFile] });
      const result = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
      if (!result?.title) { renderAutofillOnly(platform); return; }
      extracted = result;
      renderPreview(result, platform);
    } catch (e) {
      renderAutofillOnly(platform);
    }
  } else {
    // Any other site: just offer autofill
    renderAutofillOnly(platform);
  }
}

// ─── UI Renderers ───

function renderNoPage() {
  document.getElementById('body').innerHTML = `
    <div class="state-nopage"><div class="icon">💼</div>
    <p>Open a <strong>job application page</strong> to auto-fill it, or a <strong>LinkedIn job posting</strong> to import.</p></div>`;
}

function renderAutofillOnly(platform) {
  const label = PLATFORM_LABELS[platform] || 'this page';
  document.getElementById('body').innerHTML = `
    <div class="site-badge">${label}</div>
    <p class="autofill-hint">Click below to auto-fill the application form on this page.</p>
    <button class="btn-autofill" id="autofill-btn">✨ Auto-Fill Application</button>
    <button class="btn-primary" id="import-btn" style="margin-top:8px">🚀 Import Page to JobHunt App</button>
    <button class="btn-secondary" id="open-app-btn">Open JobHunt App</button>`;

  document.getElementById('autofill-btn').addEventListener('click', () => doAutofill(platform));
  document.getElementById('import-btn').addEventListener('click', () => doGenericImport());
  document.getElementById('open-app-btn').addEventListener('click', () => focusOrOpenApp());
}

function renderPreview(job, platform) {
  const urlDisplay = job.jobId
    ? `<span style="color:#16a34a;font-weight:700">✅ Job ID: ${job.jobId}</span>`
    : `<span style="color:#dc2626">⚠️ No Job ID found</span>`;

  document.getElementById('body').innerHTML = `
    <div class="field"><label>Job Title</label>
      <div class="value">${job.title || '<span class="muted">Not found</span>'}</div></div>
    <div class="field"><label>Company</label>
      <div class="value">${job.company || '<span class="muted">Not found</span>'}</div></div>
    <div class="field"><label>Location</label>
      <div class="value ${!job.location ? 'muted':''}">${job.location || 'Not found'}</div></div>
    <div class="field"><label>Job URL</label>
      <div class="value" style="font-size:11px;word-break:break-all;color:#475569">${urlDisplay}<br/><span style="color:#94a3b8">${job.url}</span></div></div>
    ${job.salary ? `<div class="field"><label>Salary</label><div class="value">$${Number(job.salary).toLocaleString()}</div></div>` : ''}
    <div class="field"><label>Job Description</label>
      <textarea id="jd-text" rows="4">${job.description || ''}</textarea></div>
    <div class="divider"></div>
    <button class="btn-primary" id="import-btn">🚀 Import to JobHunt App</button>
    <button class="btn-autofill" id="autofill-btn">✨ Auto-Fill Easy Apply</button>
    <button class="btn-secondary" id="open-app-btn">Open App Only</button>`;

  document.getElementById('import-btn').addEventListener('click', doImport);
  document.getElementById('autofill-btn').addEventListener('click', () => doAutofill(platform));
  document.getElementById('open-app-btn').addEventListener('click', () => focusOrOpenApp());
}

function renderSuccess() {
  document.getElementById('body').innerHTML = `
    <div class="success">
      <div class="icon">✅</div>
      <p>Job imported!</p>
      <p class="sub">Your app updated instantly — no reload needed.</p>
    </div>`;
}

// ─── Import logic (LinkedIn only) ───

async function injectIntoTab(tabId, payload) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (data) => {
      localStorage.setItem('pendingImport', data);
      window.dispatchEvent(new StorageEvent('storage', { key: 'pendingImport', newValue: data }));
    },
    args: [payload],
  });
}

async function focusOrOpenApp() {
  const tabs = await chrome.tabs.query({ url: `${APP_ORIGIN}/*` });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    return tabs[0];
  }
  return chrome.tabs.create({ url: APP_JOBS });
}

async function doGenericImport() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Scrape basic job info from the current page
  const scrapeResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const title = document.querySelector('h1')?.innerText?.trim()
        || document.title?.split(' - ')[0]?.trim()
        || document.title?.trim()
        || '';
      const company = document.querySelector('[class*="company"], [data-company], .employer-name, .company-name')?.innerText?.trim() || '';
      const location = document.querySelector('[class*="location"], [data-location], .job-location')?.innerText?.trim() || '';
      // Grab visible text from common job description containers
      const descEl = document.querySelector(
        '[class*="description"], [class*="job-details"], [class*="jobDescription"], article, .posting-page, main'
      );
      const description = descEl?.innerText?.substring(0, 5000)?.trim() || '';
      return { title, company, location, description, url: window.location.href };
    },
  });

  const scraped = scrapeResults?.[0]?.result || { url: tab.url, title: tab.title };
  extracted = scraped;
  const payload = JSON.stringify(scraped);

  const tabs = await chrome.tabs.query({ url: `${APP_ORIGIN}/*` });
  if (tabs.length > 0) {
    const appTab = tabs[0];
    if (appTab.url?.includes('/jobs')) {
      await injectIntoTab(appTab.id, payload);
      await chrome.tabs.update(appTab.id, { active: true });
      await chrome.windows.update(appTab.windowId, { focused: true });
    } else {
      await chrome.tabs.update(appTab.id, { url: APP_JOBS, active: true });
      await chrome.windows.update(appTab.windowId, { focused: true });
      waitForTabLoad(appTab.id, async () => { await injectIntoTab(appTab.id, payload); });
    }
  } else {
    const newTab = await chrome.tabs.create({ url: APP_JOBS });
    waitForTabLoad(newTab.id, async () => { await injectIntoTab(newTab.id, payload); });
  }
  renderSuccess();
}

async function doImport() {
  const description = document.getElementById('jd-text')?.value || extracted.description || '';
  const payload = JSON.stringify({ ...extracted, description });
  const tabs = await chrome.tabs.query({ url: `${APP_ORIGIN}/*` });

  if (tabs.length > 0) {
    const appTab = tabs[0];
    if (appTab.url?.includes('/jobs')) {
      await injectIntoTab(appTab.id, payload);
      await chrome.tabs.update(appTab.id, { active: true });
      await chrome.windows.update(appTab.windowId, { focused: true });
    } else {
      await chrome.tabs.update(appTab.id, { url: APP_JOBS, active: true });
      await chrome.windows.update(appTab.windowId, { focused: true });
      waitForTabLoad(appTab.id, async () => { await injectIntoTab(appTab.id, payload); });
    }
  } else {
    const newTab = await chrome.tabs.create({ url: APP_JOBS });
    waitForTabLoad(newTab.id, async () => { await injectIntoTab(newTab.id, payload); });
  }
  renderSuccess();
}

function waitForTabLoad(tabId, callback) {
  function listener(id, info) {
    if (id === tabId && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);
      callback();
    }
  }
  chrome.tabs.onUpdated.addListener(listener);
}

// ─── Universal Auto-Fill ───

async function doAutofill(platform) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const profile = {
    firstName: 'Yuting',
    lastName: 'Hu',
    fullName: 'Yuting Hu',
    email: 'yutinghu3@gmail.com',
    phone: '(210)-294-6504',
    location: 'Bellevue, WA',
    city: 'Bellevue',
    state: 'WA',
    zip: '98004',
    country: 'United States',
    linkedin: 'https://www.linkedin.com/in/yutinghu3',
    github: 'https://github.com/yhuuuu',
    yearsExperience: '5',
    coverLetter: '',
  };

  try {
    const fillResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: universalAutofill,
      args: [profile, platform],
    });

    const r = fillResults?.[0]?.result || {};
    const count = r.filled || 0;
    const skipped = r.skipped || 0;
    const platformLabel = r.detected || platform;

    document.getElementById('body').innerHTML = `
      <div class="success">
        <div class="icon">✨</div>
        <p>${count} field${count !== 1 ? 's' : ''} auto-filled!</p>
        ${skipped > 0 ? `<p class="sub">${skipped} field${skipped !== 1 ? 's' : ''} already had values (skipped)</p>` : ''}
        <p class="sub">Platform: ${platformLabel}<br/>Review the form before submitting.</p>
      </div>`;
  } catch (e) {
    document.getElementById('body').innerHTML = `
      <div class="state-error"><div class="icon">⚠️</div>
      <p>Auto-fill failed: ${e.message}</p>
      <p class="sub" style="margin-top:8px;font-size:11px;color:#94a3b8">
        Make sure the application form is visible on the page.
        Some sites use iframes that block auto-fill.</p></div>`;
  }
}

// This function runs inside the target page's context
function universalAutofill(profile, platform) {
  let filled = 0;
  let skipped = 0;

  // ── Helpers ──

  function setNativeValue(el, value) {
    if (!el || !value) return false;
    // Skip if already filled
    if (el.value && el.value.trim() !== '') { skipped++; return false; }
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    filled++;
    return true;
  }

  function q(selector) {
    return document.querySelector(selector);
  }

  function qAll(selector) {
    return [...document.querySelectorAll(selector)];
  }

  // Search for an input using multiple strategies
  function findField(searches) {
    for (const s of searches) {
      // aria-label exact
      let el = q(`input[aria-label="${s}"], textarea[aria-label="${s}"]`);
      if (el) return el;
      // aria-label contains (case-insensitive via attribute)
      el = q(`input[aria-label*="${s}" i], textarea[aria-label*="${s}" i]`);
      if (el) return el;
    }
    for (const s of searches) {
      // name attribute
      let el = q(`input[name="${s}"], textarea[name="${s}"]`);
      if (el) return el;
      // id attribute
      el = q(`input#${CSS.escape(s)}, textarea#${CSS.escape(s)}`);
      if (el) return el;
    }
    for (const s of searches) {
      // placeholder contains
      let el = q(`input[placeholder*="${s}" i], textarea[placeholder*="${s}" i]`);
      if (el) return el;
    }
    for (const s of searches) {
      // data-automation-id (Workday)
      let el = q(`input[data-automation-id="${s}"], textarea[data-automation-id="${s}"]`);
      if (el) return el;
      // data-test / data-testid
      el = q(`input[data-test="${s}"], input[data-testid="${s}"]`);
      if (el) return el;
    }
    // Label text fallback
    for (const lbl of qAll('label')) {
      const t = (lbl.innerText || lbl.textContent || '').trim().toLowerCase();
      for (const s of searches) {
        if (t === s.toLowerCase() || t.includes(s.toLowerCase())) {
          const forId = lbl.getAttribute('for');
          const inp = (forId && document.getElementById(forId))
            || lbl.querySelector('input, textarea, select');
          if (inp && (inp.tagName === 'INPUT' || inp.tagName === 'TEXTAREA')) return inp;
        }
      }
    }
    // Div/span label proximity fallback (for React frameworks without <label>)
    for (const s of searches) {
      for (const span of qAll('span, div, p')) {
        const t = (span.innerText || '').trim().toLowerCase();
        if (t === s.toLowerCase() && span.closest('[class]')) {
          const container = span.closest('div[class], fieldset, section');
          if (container) {
            const inp = container.querySelector('input, textarea');
            if (inp) return inp;
          }
        }
      }
    }
    return null;
  }

  function findAndFill(searches, value) {
    if (!value) return;
    const el = findField(searches);
    if (el) setNativeValue(el, value);
  }

  function clickRadio(questionKeywords, answerText) {
    // Search fieldsets
    for (const fs of qAll('fieldset')) {
      const legend = (fs.querySelector('legend, span, label, div')?.innerText || '').toLowerCase();
      const matches = questionKeywords.every(kw => legend.includes(kw));
      if (matches) {
        const labels = [...fs.querySelectorAll('label')];
        const target = labels.find(l => l.innerText.trim().toLowerCase() === answerText.toLowerCase());
        if (target) {
          const radio = target.querySelector('input[type="radio"]') || target.previousElementSibling;
          if (radio) { radio.click(); filled++; return true; }
        }
      }
    }
    // Broader search: any container with the question text
    for (const el of qAll('div, section')) {
      const text = (el.innerText || '').toLowerCase();
      const matches = questionKeywords.every(kw => text.includes(kw));
      if (matches && el.querySelectorAll('input[type="radio"]').length > 0) {
        const labels = [...el.querySelectorAll('label')];
        const target = labels.find(l => l.innerText.trim().toLowerCase() === answerText.toLowerCase());
        if (target) {
          const radio = target.querySelector('input[type="radio"]') || target;
          radio.click(); filled++; return true;
        }
      }
    }
    return false;
  }

  function fillSelect(searches, optionKeywords) {
    for (const s of searches) {
      const sel = q(`select[aria-label*="${s}" i], select[name="${s}"]`);
      if (!sel) continue;
      for (const opt of sel.options) {
        const txt = opt.text.toLowerCase();
        if (optionKeywords.some(kw => txt.includes(kw.toLowerCase()))) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
          return;
        }
      }
    }
    // Label fallback for selects
    for (const lbl of qAll('label')) {
      const t = (lbl.innerText || '').trim().toLowerCase();
      for (const s of searches) {
        if (t.includes(s.toLowerCase())) {
          const sel = lbl.querySelector('select')
            || document.getElementById(lbl.getAttribute('for'));
          if (sel?.tagName === 'SELECT') {
            for (const opt of sel.options) {
              const txt = opt.text.toLowerCase();
              if (optionKeywords.some(kw => txt.includes(kw.toLowerCase()))) {
                sel.value = opt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                filled++;
                return;
              }
            }
          }
        }
      }
    }
  }

  // ── Platform-specific selectors (run FIRST for best match) ──

  if (platform === 'workday') {
    // Workday uses data-automation-id attributes
    const wdMap = {
      'legalNameSection_firstName': profile.firstName,
      'legalNameSection_lastName': profile.lastName,
      'addressSection_addressLine1': '',
      'addressSection_city': profile.city,
      'addressSection_postalCode': profile.zip,
      'phone-number': profile.phone,
      'email': profile.email,
    };
    for (const [autoId, val] of Object.entries(wdMap)) {
      if (!val) continue;
      const el = q(`input[data-automation-id="${autoId}"]`);
      if (el) setNativeValue(el, val);
    }
    // Workday country/state dropdowns
    const countryBtn = q('[data-automation-id="countryDropdown"] button, [data-automation-id="country"] button');
    if (countryBtn) countryBtn.click();
  }

  if (platform === 'greenhouse') {
    // Greenhouse uses predictable id/name attributes
    const ghMap = {
      'first_name': profile.firstName,
      'last_name': profile.lastName,
      'email': profile.email,
      'phone': profile.phone,
      'location': profile.location,
    };
    for (const [id, val] of Object.entries(ghMap)) {
      if (!val) continue;
      const el = q(`#${id}`) || q(`input[name="${id}"]`);
      if (el) setNativeValue(el, val);
    }
  }

  if (platform === 'lever') {
    // Lever custom form with specific names
    const leverMap = {
      'name': profile.fullName,
      'email': profile.email,
      'phone': profile.phone,
      'org': '', // current company
      'urls[LinkedIn]': profile.linkedin,
      'urls[GitHub]': profile.github,
      'urls[Portfolio]': '',
    };
    for (const [name, val] of Object.entries(leverMap)) {
      if (!val) continue;
      const el = q(`input[name="${name}"]`) || q(`textarea[name="${name}"]`);
      if (el) setNativeValue(el, val);
    }
  }

  // ── Generic fill (runs on ALL platforms including after platform-specific) ──

  // Text fields
  findAndFill([
    'First name', 'Given name', 'firstName', 'first_name',
    'fname', 'givenName', 'applicant_first_name',
  ], profile.firstName);

  findAndFill([
    'Last name', 'Family name', 'Surname', 'lastName', 'last_name',
    'lname', 'familyName', 'applicant_last_name',
  ], profile.lastName);

  findAndFill([
    'Full name', 'Name', 'Legal name', 'fullName', 'full_name',
    'candidate_name', 'applicantName',
  ], profile.fullName);

  findAndFill([
    'Email', 'Email address', 'E-mail', 'email', 'emailAddress',
    'email_address', 'candidate_email', 'applicant_email',
  ], profile.email);

  findAndFill([
    'Phone', 'Phone number', 'Mobile phone number', 'Mobile number',
    'Telephone', 'phone', 'phoneNumber', 'phone_number', 'mobile',
    'cell_phone', 'candidate_phone',
  ], profile.phone);

  findAndFill([
    'City', 'City, state', 'Location', 'Current location',
    'city', 'location', 'candidate_location',
  ], profile.location);

  findAndFill([
    'State', 'Province', 'state', 'province', 'region',
  ], profile.state);

  findAndFill([
    'Zip', 'Zip code', 'Postal code', 'ZIP', 'zipCode',
    'zip', 'postal_code', 'postalCode',
  ], profile.zip);

  findAndFill([
    'LinkedIn', 'LinkedIn Profile', 'LinkedIn URL',
    'linkedin', 'linkedinUrl', 'linkedin_url', 'linkedin_profile',
    'urls[LinkedIn]',
  ], profile.linkedin);

  findAndFill([
    'Website', 'Portfolio', 'GitHub', 'Personal website',
    'Portfolio URL', 'website', 'portfolio', 'github',
    'portfolio_url', 'urls[GitHub]', 'urls[Portfolio]',
    'personal_website',
  ], profile.github);

  findAndFill([
    'Cover letter', 'Additional information', 'Message to hiring manager',
    'Why do you want to work', 'Additional comments',
    'coverLetter', 'cover_letter', 'additionalInfo',
    'message', 'comments',
  ], profile.coverLetter);

  // Selects
  fillSelect(
    ['country', 'Country', 'countryCode'],
    ['united states', 'us', 'usa']
  );
  fillSelect(
    ['years', 'experience', 'Years of experience'],
    [profile.yearsExperience, '5', '4-6', '3-5']
  );

  // Radio / yes-no questions
  clickRadio(['authorized', 'work'], 'yes');
  clickRadio(['legally', 'authorized'], 'yes');
  clickRadio(['eligible', 'work'], 'yes');
  clickRadio(['right to work'], 'yes');
  clickRadio(['sponsorship'], 'no');
  clickRadio(['visa', 'sponsorship'], 'no');
  clickRadio(['require', 'sponsorship'], 'no');

  // Also try checkbox-style "I agree" / "I acknowledge" if present (but don't auto-check)
  // That's a legal action the user should do themselves

  const detected = platform === 'generic' ? detectPlatformFromPage() : platform;
  return { filled, skipped, detected };

  function detectPlatformFromPage() {
    const html = document.documentElement.innerHTML.toLowerCase();
    if (html.includes('workday'))         return 'Workday';
    if (html.includes('greenhouse'))      return 'Greenhouse';
    if (html.includes('lever'))           return 'Lever';
    if (html.includes('icims'))           return 'iCIMS';
    if (html.includes('smartrecruiters')) return 'SmartRecruiters';
    if (html.includes('ashby'))           return 'Ashby';
    if (html.includes('bamboohr'))        return 'BambooHR';
    if (html.includes('jobvite'))         return 'Jobvite';
    return 'Generic';
  }
}

init();
