// Indeed job data extractor
// Uses Indeed's stable data-testid attributes and #jobDescriptionText container

function extractIndeedJob() {
  // ── Title ──
  let title = '';
  const titleEl = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]');
  if (titleEl) {
    // Get first span text, exclude the "- job post" suffix span
    const firstSpan = titleEl.querySelector('span');
    if (firstSpan) {
      // Clone and remove the suffix child span
      const clone = firstSpan.cloneNode(true);
      const suffix = clone.querySelector('span');
      if (suffix) suffix.remove();
      title = clone.innerText.trim();
    }
    if (!title) title = titleEl.innerText.replace(/\s*-\s*job post$/i, '').trim();
  }
  if (!title) {
    const h2 = document.querySelector('h2[class*="jobTitle"], h1[class*="jobTitle"]');
    if (h2) title = h2.innerText.replace(/\s*-\s*job post$/i, '').trim();
  }

  // ── Company ──
  let company = '';
  const companyEl = document.querySelector('[data-testid="inlineHeader-companyName"]');
  if (companyEl) {
    // May have a link inside
    const link = companyEl.querySelector('a');
    company = (link || companyEl).innerText.trim();
  }
  if (!company) {
    const fallback = document.querySelector('[class*="companyName"], .employer-name, a[data-tn-element="companyName"]');
    if (fallback) company = fallback.innerText.trim();
  }

  // ── Location ──
  let location = '';
  const locEl = document.querySelector('[data-testid="inlineHeader-companyLocation"]');
  if (locEl) {
    // Location div may also contain salary and job type — grab just the first text node
    const firstText = locEl.childNodes[0]?.textContent?.trim();
    if (firstText && !firstText.includes('$')) {
      location = firstText;
    } else {
      // Parse: "Remote" or "City, ST 12345"
      const full = locEl.innerText.trim();
      const parts = full.split('\n').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!p.includes('$') && !p.includes('Full-time') && !p.includes('Part-time') && !p.includes('Contract')) {
          location = p.replace(/^-\s*/, '');
          break;
        }
      }
    }
  }
  if (!location) {
    const fallback = document.querySelector('[class*="companyLocation"], .job-location, [data-testid*="location"]');
    if (fallback) location = fallback.innerText.trim().split('\n')[0];
  }

  // ── Salary ──
  let salary = '';
  // Try the tile that contains salary info
  const salaryTile = document.querySelector('[data-testid$="-tile"][data-testid*="$"]');
  if (salaryTile) {
    salary = salaryTile.innerText.trim();
  }
  // Fallback: parse from location container
  if (!salary && locEl) {
    const match = locEl.innerText.match(/\$[\d,]+(?:\.\d+)?(?:\s*[-–]\s*\$[\d,]+(?:\.\d+)?)?(?:\s*(?:a\s+year|an\s+hour|per\s+hour))?/i);
    if (match) salary = match[0];
  }
  // Fallback: job details container
  if (!salary) {
    const paySection = document.querySelector('[data-testid="jobsearch-OtherJobDetailsContainer"]');
    if (paySection) {
      const match = paySection.innerText.match(/\$[\d,]+(?:\.\d+)?(?:\s*[-–]\s*\$[\d,]+(?:\.\d+)?)?/);
      if (match) salary = match[0];
    }
  }

  // ── Description ──
  let description = '';
  const descEl = document.getElementById('jobDescriptionText');
  if (descEl?.innerText?.trim()?.length > 50) {
    description = descEl.innerText.trim();
  }
  if (!description) {
    const fallback = document.querySelector('[data-testid="vjJobDetails-test"], [class*="jobDescription"], .jobsearch-JobComponent-description');
    if (fallback?.innerText?.trim()?.length > 50) {
      description = fallback.innerText.trim();
    }
  }

  // ── Job ID ──
  let jobId = '';
  // From URL: /viewjob?jk=xxx or ?vjk=xxx
  const params = new URLSearchParams(document.location.search);
  jobId = params.get('jk') || params.get('vjk') || '';
  // From apply link
  if (!jobId) {
    const applyLink = document.querySelector('a[href*="applystart?jk="], a[href*="jk="]');
    if (applyLink) {
      const match = applyLink.href.match(/jk=([a-f0-9]+)/);
      if (match) jobId = match[1];
    }
  }

  // ── URL ──
  const url = jobId
    ? `https://www.indeed.com/viewjob?jk=${jobId}`
    : document.location.href;

  return { title, company, location, salary, description, url, jobId };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'extract') {
    setTimeout(() => {
      sendResponse(extractIndeedJob());
    }, 300);
    return true;
  }
  return true;
});
