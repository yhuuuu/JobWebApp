import PizZip from 'pizzip';

/**
 * Parses the AI-generated resume text into section map keyed by template placeholders.
 */
function parseAIOutput(text) {
  const keys = ['JOB_TITLE', 'SUMMARY_SECTION', 'SKILLS_CONTENT', 'EY_EXPERIENCE',
    'WELLMED_EXPERIENCE', 'RECIPE_PROJECT_BULLETS', 'PLANT_PROJECT_BULLETS',
    'PROFESSIONAL_DEVELOPMENT', 'EDUCATION_SECTION'];

  const sections = Object.fromEntries(keys.map(k => [k, '']));

  // Split on known section headers
  const regex = new RegExp(`(${keys.join('|')})`, 'g');
  const parts = text.split(regex).map(s => s.trim()).filter(Boolean);

  let current = null;
  for (const part of parts) {
    if (keys.includes(part)) {
      current = part;
    } else if (current) {
      // Strip the COACHING NOTE from content — don't include in Word doc
      const cleaned = part.replace(/---\s*\nCOACHING NOTE:.*$/s, '').trim();
      sections[current] = cleaned;
      current = null;
    }
  }
  return sections;
}

/** Escapes XML special characters */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Given a paragraph XML string containing a placeholder,
 * returns N paragraph XMLs (one per non-empty line in the replacement text),
 * each cloning the original paragraph's formatting.
 */
function expandParagraph(paraXml, placeholder, replacementText) {
  const lines = replacementText.split('\n')
    .map(l => l.replace(/^[\u2022\u00B7\u2013\-\*]\s*/, '').trim()) // strip •, ·, –, -, *
    .filter(Boolean);

  if (lines.length === 0) return paraXml;

  // Extract the <w:t>...</w:t> portion and replace with each line
  return lines.map(line => {
    const escaped = escapeXml(line);
    // Replace the placeholder text inside <w:t> with this line's text
    return paraXml.replace(
      new RegExp(`<w:t[^>]*>${placeholder}</w:t>`),
      `<w:t xml:space="preserve">${escaped}</w:t>`
    );
  }).join('');
}

/**
 * Finds the full <w:p>...</w:p> block containing the placeholder and returns it.
 */
function findParagraph(xml, placeholder) {
  // Split on paragraph boundaries and find the one with our placeholder
  const paras = xml.split(/(?=<w:p[ >])/);
  for (const para of paras) {
    if (para.includes(placeholder) && para.includes('</w:p>')) {
      // Return just through the closing tag
      const end = para.indexOf('</w:p>') + 6;
      return para.substring(0, end);
    }
  }
  return null;
}

/**
 * Downloads a filled Resume Template.docx using the AI-generated resume text.
 */
export async function downloadAsWord(aiText, jobTitle) {
  const response = await fetch('/resume-template.docx');
  if (!response.ok) throw new Error('Could not load resume template');
  const arrayBuffer = await response.arrayBuffer();

  const zip = new PizZip(arrayBuffer);
  let xml = zip.file('word/document.xml').asText();

  const sections = parseAIOutput(aiText);

  for (const [placeholder, value] of Object.entries(sections)) {
    if (!value) continue;

    // Strip all bullet prefix characters from every line
    const lines = value.split('\n')
      .map(l => l.replace(/^[\u2022\u00B7\u2013\-\*]\s*/, '').trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const originalPara = findParagraph(xml, placeholder);
    if (!originalPara) {
      // Fallback: simple text replace
      xml = xml.replace(placeholder, escapeXml(lines.join(' ')));
      continue;
    }

    if (lines.length === 1) {
      // Single line — just replace text in-place
      const replaced = originalPara.replace(
        new RegExp(`<w:t[^>]*>${placeholder}</w:t>`),
        `<w:t xml:space="preserve">${escapeXml(lines[0])}</w:t>`
      );
      xml = xml.replace(originalPara, replaced);
    } else {
      // Multi-line — clone paragraph for each line
      const expanded = expandParagraph(originalPara, placeholder, value);
      xml = xml.replace(originalPara, expanded);
    }
  }

  zip.file('word/document.xml', xml);

  const blob = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Resume_${(jobTitle || 'Tailored').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
