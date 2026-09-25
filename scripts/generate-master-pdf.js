const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const mdPath = path.join(ROOT_DIR, 'SamadhanSetu_Current_Master_Project_Report.md');
const scratchDir = path.join(ROOT_DIR, 'scratch');
const htmlPath = path.join(scratchDir, 'report.html');
const pdfPath = path.join(ROOT_DIR, 'SamadhanSetu_Current_Master_Project_Report.pdf');

if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

console.log('Reading master report markdown...');
const mdContent = fs.readFileSync(mdPath, 'utf-8');

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  const html = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inTable = false;
  let tableBuffer = [];
  let inList = false;
  let inOrderedList = false;

  function flushList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    if (inOrderedList) {
      html.push('</ol>');
      inOrderedList = false;
    }
  }

  function flushTable() {
    if (!inTable) return;
    inTable = false;
    if (tableBuffer.length === 0) return;

    html.push('<div class="table-container"><table>');
    // First row is header
    const headerCols = tableBuffer[0].split('|').map(s => s.trim()).filter((s, i, a) => i > 0 && i < a.length - 1);
    html.push('<thead><tr>');
    headerCols.forEach(col => {
      html.push(`<th>${formatInline(col)}</th>`);
    });
    html.push('</tr></thead><tbody>');

    for (let r = 2; r < tableBuffer.length; r++) {
      const rowCols = tableBuffer[r].split('|').map(s => s.trim()).filter((s, i, a) => i > 0 && i < a.length - 1);
      if (rowCols.length > 0) {
        html.push('<tr>');
        rowCols.forEach(col => {
          html.push(`<td>${formatInline(col)}</td>`);
        });
        html.push('</tr>');
      }
    }
    html.push('</tbody></table></div>');
    tableBuffer = [];
  }

  function formatInline(str) {
    let out = str;
    // Bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Inline code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return out;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        html.push(`<pre><code class="language-${codeLang}">${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList();
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      flushList();
      html.push('<hr />');
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      flushList();
      html.push(`<h1 id="${slugify(line.slice(2))}">${formatInline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      html.push(`<h2 id="${slugify(line.slice(3))}">${formatInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      html.push(`<h3 id="${slugify(line.slice(4))}">${formatInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('#### ')) {
      flushList();
      html.push(`<h4 id="${slugify(line.slice(5))}">${formatInline(line.slice(5))}</h4>`);
      continue;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (inOrderedList) flushList();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${formatInline(line.trim().slice(2))}</li>`);
      continue;
    }

    const orderedMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (inList) flushList();
      if (!inOrderedList) {
        html.push('<ol>');
        inOrderedList = true;
      }
      html.push(`<li>${formatInline(orderedMatch[2])}</li>`);
      continue;
    }

    flushList();

    // Paragraph
    if (line.trim().length > 0) {
      html.push(`<p>${formatInline(line)}</p>`);
    }
  }

  flushList();
  flushTable();

  return html.join('\n');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-');
}

console.log('Converting Markdown to structured HTML...');
const bodyHtml = parseMarkdown(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ResolvIN — Current Master Project Report</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1c1917;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 22pt;
      font-weight: 800;
      color: #064e3b;
      margin-top: 24pt;
      margin-bottom: 8pt;
      border-bottom: 2pt solid #10b981;
      padding-bottom: 4pt;
      page-break-after: avoid;
    }
    h2 {
      font-size: 15pt;
      font-weight: 700;
      color: #047857;
      margin-top: 18pt;
      margin-bottom: 6pt;
      border-bottom: 1pt solid #e5e7eb;
      padding-bottom: 3pt;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #111827;
      margin-top: 14pt;
      margin-bottom: 4pt;
      page-break-after: avoid;
    }
    h4 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #374151;
      margin-top: 10pt;
      margin-bottom: 3pt;
      page-break-after: avoid;
    }
    p {
      margin-top: 0;
      margin-bottom: 8pt;
      text-align: justify;
    }
    a {
      color: #059669;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code {
      font-family: "Consolas", "Courier New", monospace;
      font-size: 9pt;
      background: #f3f4f6;
      padding: 1.5pt 3pt;
      border-radius: 3pt;
      color: #065f46;
      border: 0.5pt solid #e5e7eb;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 10pt 12pt;
      border-radius: 6pt;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: auto;
      page-break-inside: avoid;
      margin: 8pt 0 12pt 0;
    }
    pre code {
      background: transparent;
      padding: 0;
      border: none;
      color: inherit;
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin: 10pt 0 14pt 0;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      line-height: 1.35;
      margin: 0;
    }
    th, td {
      border: 0.5pt solid #d1d5db;
      padding: 5pt 7pt;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f0fdf4;
      color: #065f46;
      font-weight: 700;
      border-bottom: 1.5pt solid #059669;
    }
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 8pt;
      padding-left: 20pt;
    }
    li {
      margin-bottom: 3pt;
    }
    hr {
      border: none;
      border-top: 1pt solid #e5e7eb;
      margin: 16pt 0;
    }
    .hero-banner {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
      color: #ffffff;
      padding: 24pt;
      border-radius: 8pt;
      margin-bottom: 20pt;
      page-break-after: avoid;
    }
    .hero-title {
      font-size: 24pt;
      font-weight: 800;
      margin: 0 0 6pt 0;
      letter-spacing: -0.5pt;
    }
    .hero-subtitle {
      font-size: 12pt;
      opacity: 0.9;
      margin: 0 0 16pt 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8pt;
      background: rgba(255, 255, 255, 0.1);
      padding: 10pt;
      border-radius: 6pt;
      font-size: 8.5pt;
    }
    .meta-item strong {
      color: #a7f3d0;
    }
  </style>
</head>
<body>
  <div class="hero-banner">
    <div class="hero-title">🏛️ ResolvIN</div>
    <div class="hero-subtitle">Comprehensive Current Project Analysis &amp; Master Architecture Report</div>
    <div class="meta-grid">
      <div class="meta-item"><strong>Audit Date:</strong> September 23, 2026</div>
      <div class="meta-item"><strong>Target Ecosystem:</strong> Jharkhand Civic Crowdsourcing &amp; Innovation</div>
      <div class="meta-item"><strong>Services Active:</strong> 5 (PostgreSQL, NestJS, FastAPI, Next.js, Expo)</div>
      <div class="meta-item"><strong>Verification Status:</strong> 19 Master Suites • 100% Pass Rate</div>
    </div>
  </div>
  ${bodyHtml}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml);
console.log(`HTML generated at ${htmlPath}`);

console.log('Rendering PDF using Microsoft Edge Headless...');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

try {
  execSync(`"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`, {
    stdio: 'inherit'
  });

  const stats = fs.statSync(pdfPath);
  console.log(`✅ Master PDF generated successfully!`);
  console.log(`Path: ${pdfPath}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
} catch (err) {
  console.error('Error generating PDF with Edge:', err);
  process.exit(1);
}
