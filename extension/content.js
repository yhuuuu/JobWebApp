// Robust LinkedIn job data extractor — handles both normal and filtered views.
// LinkedIn uses semantic class names in normal view but hashed/obfuscated class names
// when filters are applied. This extractor uses multiple fallback strategies.

function getText(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim()) return el.innerText.trim();
    } catch (e) { /* invalid selector, skip */ }
  }
  return '';
}

function getTextPartial(partials) {
  for (const partial of partials) {
    try {
      const el = document.querySelector(`[class*="${partial}"]`);
      if (el?.innerText?.trim()) return el.innerText.trim();
    } catch (e) { /* skip */ }
  }
  return '';
}

function extractJob() {
  // ── Job ID ──
  const urlParams = new URLSearchParams(document.location.search);
  const jobIdFromUrl = urlParams.get('currentJobId');
  const jobIdFromPath = document.location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1];

  let jobIdFromDom = '';
  const jobIdEl = document.querySelector('[data-job-id]');
  if (jobIdEl) jobIdFromDom = jobIdEl.getAttribute('data-job-id');

  if (!jobIdFromDom) {
    const activeCard = document.querySelector('.jobs-search-results-list__list-item--active [data-job-id], .job-card-container--clicked [data-job-id]');
    if (activeCard) jobIdFromDom = activeCard.getAttribute('data-job-id');
  }

  let jobIdFromLink = '';
  const titleLinks = document.querySelectorAll('a[href*="/jobs/view/"]');
  for (const link of titleLinks) {
    const match = link.href.match(/\/jobs\/view\/(\d+)/);
    if (match) { jobIdFromLink = match[1]; break; }
  }

  const jobId = jobIdFromPath || jobIdFromUrl || jobIdFromDom || jobIdFromLink || null;

  // ── Title ──
  // Strategy 1: semantic selectors (normal view)
  let title = getText([
    '.job-details-jobs-unified-top-card__job-title a',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title a',
    '.jobs-unified-top-card__job-title',
    '.top-card-layout__title',
    'h1[class*="title"]',
    'h2[class*="title"]',
  ]);
  if (!title) title = getTextPartial(['job-title', 'job_title', 'topcard__title']);
  // Strategy 2: filtered view — title is an <a> linking to /jobs/view/{id}
  if (!title && jobId) {
    const link = document.querySelector(`a[href*="/jobs/view/${jobId}"]`);
    if (link?.innerText?.trim()) title = link.innerText.trim();
  }
  // Strategy 3: any <a> linking to /jobs/view/ near the top
  if (!title) {
    for (const link of titleLinks) {
      const t = link.innerText?.trim();
      if (t && t.length > 3 && t.length < 120 && !t.includes('LinkedIn')) {
        title = t; break;
      }
    }
  }

  // ── Company ──
  // Strategy 1: semantic selectors (normal view)
  let company = getText([
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name',
    '.topcard__org-name-link',
    'a[class*="company-name"]',
    'span[class*="company-name"]',
  ]);
  if (!company) company = getTextPartial(['company-name', 'org-name', 'company_name']);
  // Strategy 2: aria-label="Company, ..." (filtered view)
  if (!company) {
    const companyEl = document.querySelector('[aria-label^="Company,"]');
    if (companyEl) {
      const label = companyEl.getAttribute('aria-label');
      company = label.replace(/^Company,\s*/, '').replace(/\.$/, '').trim();
    }
  }
  // Strategy 3: company link near top
  if (!company) {
    const companyLinks = document.querySelectorAll('a[href*="/company/"]');
    for (const link of companyLinks) {
      const t = link.innerText?.trim();
      if (t && t.length < 60 && !t.includes('LinkedIn')) { company = t; break; }
    }
  }
  // Strategy 4: filtered view — "Company • Location" text node near title
  if (!company && title) {
    const allText = document.body.innerText;
    // Look for "CompanyName • Location" pattern right after the title
    const titleIdx = allText.indexOf(title);
    if (titleIdx >= 0) {
      const after = allText.substring(titleIdx + title.length, titleIdx + title.length + 300);
      const bulletMatch = after.match(/^\s*\n?\s*([^\n•]+?)\s*[•·]\s*([^\n]+)/);
      if (bulletMatch) {
        company = bulletMatch[1].trim();
      }
    }
  }

  // ── Location ──
  let location = '';
  // Strategy 1: semantic selector (normal view)
  const locSpan = document.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text:first-child');
  if (locSpan?.innerText?.trim()) {
    location = locSpan.innerText.trim();
  }
  // Strategy 2: metadata container with separator (normal view)
  if (!location) {
    const metaSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container',
      '.job-details-jobs-unified-top-card__tertiary-description-container',
      '[class*="primary-description"]',
    ];
    for (const sel of metaSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el?.innerText) {
          const parts = el.innerText.trim().split(/[·•]/).map(p => p.trim()).filter(Boolean);
          if (parts.length >= 1 && parts[0].length < 60) {
            location = parts[0]; break;
          }
        }
      } catch (e) { /* skip */ }
    }
  }
  if (!location) location = getTextPartial(['job-location', 'location']);
  // Strategy 3: filtered view — "Company • Location" text near title
  if (!location && title) {
    const allText = document.body.innerText;
    const titleIdx = allText.indexOf(title);
    if (titleIdx >= 0) {
      const after = allText.substring(titleIdx + title.length, titleIdx + title.length + 300);
      const bulletMatch = after.match(/[•·]\s*([^(\n]+?)(?:\s*\(|$)/);
      if (bulletMatch) {
        location = bulletMatch[1].trim();
      }
    }
  }

  // ── Salary ──
  const salaryRaw = getText([
    '[class*="salary"]',
    '[class*="compensation"]',
    '[class*="pay"]',
  ]);
  const salaryMatch = salaryRaw.match(/\$[\d,]+/);
  const salary = salaryMatch ? salaryMatch[0].replace(/[$,]/g, '') : '';

  // ── Description ──
  let description = '';
  // Strategy 1: semantic selectors (normal view)
  const descSelectors = [
    '#job-details',
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.jobs-description-content__text',
    '[class*="description__text"]',
    '[class*="jobs-description"]',
    'article[class*="jobs"]',
  ];
  for (const sel of descSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim()?.length > 50) {
        description = el.innerText.trim();
        break;
      }
    } catch (e) { /* skip */ }
  }
  // Strategy 2: filtered view — data-testid="expandable-text-box" or "About the job" section
  if (!description) {
    const expandBox = document.querySelector('[data-testid="expandable-text-box"]');
    if (expandBox?.innerText?.trim()?.length > 50) {
      description = expandBox.innerText.trim();
    }
  }
  if (!description) {
    // Find the "About the job" heading and grab text after it
    const headings = document.querySelectorAll('h2');
    for (const h of headings) {
      if (h.innerText?.trim() === 'About the job') {
        let sibling = h.nextElementSibling;
        while (sibling) {
          const text = sibling.innerText?.trim();
          if (text?.length > 50) {
            description = text;
            break;
          }
          sibling = sibling.nextElementSibling;
        }
        if (description) break;
        // If sibling approach failed, try parent's text
        const parent = h.closest('section') || h.parentElement;
        if (parent?.innerText?.trim()?.length > 100) {
          description = parent.innerText.replace(/^About the job\s*/i, '').trim();
        }
        break;
      }
    }
  }

  // ── URL ──
  const url = jobId
    ? `https://www.linkedin.com/jobs/view/${jobId}/`
    : document.location.href;

  return { title, company, location, salary, description, url, jobId };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'extract') {
    // Small delay to ensure the right panel has rendered the current job
    setTimeout(() => {
      sendResponse(extractJob());
    }, 300);
    return true; // keep message channel open for async response
  }
  return true;
});
