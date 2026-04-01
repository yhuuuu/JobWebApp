function getText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.innerText?.trim()) return el.innerText.trim();
  }
  return '';
}

function extractJob() {
  // ── Job ID + Title ──────────────────────────────────────────
  // The title <a> href contains /jobs/view/{jobId}/ — most reliable source
  const titleLink = document.querySelector('.job-details-jobs-unified-top-card__job-title a');
  const title = titleLink?.innerText?.trim() || getText(['h1.t-24', 'h1']);
  
  const jobIdFromLink = titleLink?.href?.match(/\/jobs\/view\/(\d+)/)?.[1];
  const jobIdFromUrl  = new URLSearchParams(document.location.search).get('currentJobId');
  const jobIdFromDom  = document.querySelector('[data-job-id]')?.getAttribute('data-job-id');
  const jobId = jobIdFromLink || jobIdFromUrl || jobIdFromDom || null;

  // ── Company ─────────────────────────────────────────────────
  const company = getText([
    '.job-details-jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name',
  ]);

  // ── Location ────────────────────────────────────────────────
  // ".t-14.truncate" contains "Company · Location (Remote)"
  // split on " · " and take parts after the first
  let location = '';
  const metaEl = document.querySelector('.t-14.truncate');
  if (metaEl) {
    const parts = metaEl.innerText.trim().split(' · ');
    if (parts.length >= 2) location = parts.slice(1).join(' · ');
  }
  if (!location) {
    location = getText([
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
    ]);
  }

  // ── Salary ──────────────────────────────────────────────────
  const salaryRaw = getText(['[class*="salary"]', '[class*="compensation"]']);
  const salaryMatch = salaryRaw.match(/\$[\d,]+/);
  const salary = salaryMatch ? salaryMatch[0].replace(/[$,]/g, '') : '';

  // ── Description ─────────────────────────────────────────────
  const descEl = document.querySelector('#job-details, .jobs-description__content, .jobs-box__html-content');
  const description = descEl?.innerText?.trim() || '';

  // ── URL ─────────────────────────────────────────────────────
  const url = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : document.location.href;

  return { title, company, location, salary, description, url, jobId };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'extract') sendResponse(extractJob());
  return true;
});
