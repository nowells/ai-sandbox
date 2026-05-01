// Reads data/leaderboard.json, builds an HTML report, and uses Playwright
// to print it to a PDF in output/.
//
// Analysis goal stated by the requester:
//   "Show team country alongside scoring, to see whether older European
//    teams routinely score higher."
//
// We produce three sections:
//   1. Full leaderboard table (rank, team, country, rookie year, age, score).
//   2. Aggregates by country (mean / median / max / count).
//   3. Aggregates by region (Europe vs. rest) and by team age bucket.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'leaderboard.json');
const OUT_DIR = path.join(ROOT, 'output');

// ISO-3166 country names + codes that count as "Europe" for this report.
// Includes the 27 EU members plus UK, Switzerland, Norway, Iceland, the
// Western Balkans, Ukraine, Turkey, and the European microstates — i.e. the
// geographic continent rather than EU membership.
const EUROPE = new Set(
  [
    'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
    'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Czechia', 'Denmark', 'Estonia',
    'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
    'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta',
    'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway',
    'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia',
    'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Türkiye', 'Ukraine',
    'United Kingdom', 'UK', 'Great Britain', 'England', 'Scotland', 'Wales',
    'Northern Ireland', 'Vatican City',
    // ISO codes
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
    'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT',
    'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK',
    'SI', 'ES', 'SE', 'CH', 'TR', 'UA', 'GB', 'VA',
  ].map((s) => s.toLowerCase()),
);

function isEuropean(country) {
  if (!country) return false;
  return EUROPE.has(String(country).trim().toLowerCase());
}

function teamAge(rookieYear, scrapedAt) {
  if (!rookieYear) return null;
  const r = Number(rookieYear);
  if (!Number.isFinite(r)) return null;
  const seasonYear = new Date(scrapedAt).getUTCFullYear();
  return Math.max(0, seasonYear - r);
}

function ageBucket(age) {
  if (age == null) return 'Unknown';
  if (age <= 1) return 'Rookie (0–1 yr)';
  if (age <= 3) return 'Young (2–3 yr)';
  if (age <= 6) return 'Established (4–6 yr)';
  return 'Veteran (7+ yr)';
}

function summarize(scores) {
  if (scores.length === 0) return { count: 0, mean: null, median: null, max: null };
  const sorted = [...scores].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return {
    count: sorted.length,
    mean: +(sum / sorted.length).toFixed(2),
    median: +median.toFixed(2),
    max: sorted[sorted.length - 1],
  };
}

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r) ?? 'Unknown';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function fmtScore(s) {
  return s == null ? '—' : String(s);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(data) {
  const { sourceUrl, scrapedAt, headerText, pageTitle, teams } = data;

  const enriched = teams.map((t) => {
    const age = teamAge(t.rookieYear, scrapedAt);
    return {
      ...t,
      age,
      ageBucket: ageBucket(age),
      isEurope: isEuropean(t.country),
      score: Number(t.score ?? 0),
    };
  });

  // Per-country summary, sorted by mean desc.
  const byCountry = [...groupBy(enriched, (t) => t.country || 'Unknown')]
    .map(([country, rows]) => ({ country, ...summarize(rows.map((r) => r.score)) }))
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));

  // Europe vs. rest of world.
  const eu = enriched.filter((t) => t.isEurope);
  const rest = enriched.filter((t) => !t.isEurope && t.country);
  const regionRows = [
    { region: 'Europe', ...summarize(eu.map((r) => r.score)) },
    { region: 'Rest of world', ...summarize(rest.map((r) => r.score)) },
  ];

  // Age bucket summary, ordered rookie → veteran.
  const order = ['Rookie (0–1 yr)', 'Young (2–3 yr)', 'Established (4–6 yr)', 'Veteran (7+ yr)', 'Unknown'];
  const byAge = order
    .map((bucket) => {
      const rows = enriched.filter((t) => t.ageBucket === bucket);
      return { bucket, ...summarize(rows.map((r) => r.score)) };
    })
    .filter((row) => row.count > 0);

  // Cross-tab: Europe × age bucket (the headline question).
  const cross = [];
  for (const region of ['Europe', 'Rest of world']) {
    const pool = region === 'Europe' ? eu : rest;
    for (const bucket of order) {
      const rows = pool.filter((t) => t.ageBucket === bucket);
      if (rows.length === 0) continue;
      cross.push({ region, bucket, ...summarize(rows.map((r) => r.score)) });
    }
  }

  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>FIRST LEGO World Championship Leaderboard Report</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  html, body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1b1b1b; }
  body { font-size: 10.5pt; line-height: 1.35; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1pt solid #ccc; padding-bottom: 2pt; }
  h3 { font-size: 11.5pt; margin: 12pt 0 4pt; }
  .meta { color: #555; font-size: 9pt; margin-bottom: 12pt; }
  .meta a { color: #1a4ed8; word-break: break-all; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
  th, td { border: 1px solid #d0d0d0; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #f1f3f5; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.eu td { background: #eef6ff; }
  tr:nth-child(even) td { background: #fafafa; }
  tr.eu:nth-child(even) td { background: #e6f0fb; }
  .tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 8.5pt; }
  .tag-eu { background: #1a4ed8; color: white; }
  .tag-other { background: #6b7280; color: white; }
  .footnote { color: #666; font-size: 8.5pt; margin-top: 10pt; }
  .summary { background: #fffbe6; border: 1px solid #f5e6a0; padding: 8pt 10pt; border-radius: 4px; margin-bottom: 12pt; }
</style>
</head>
<body>
  <h1>FIRST LEGO League — World Championship Leaderboard</h1>
  <div class="meta">
    ${escapeHtml(headerText || pageTitle || '')}
    <br>Source: <a href="${escapeHtml(sourceUrl)}">${escapeHtml(sourceUrl)}</a>
    <br>Scraped: ${escapeHtml(scrapedAt)} · Report generated: ${escapeHtml(generatedAt)}
    <br>Teams in dataset: <strong>${enriched.length}</strong>
  </div>

  <div class="summary">
    <strong>Question:</strong> Do older European teams routinely score higher than other teams?
    <br>
    <strong>How to read this report:</strong> The full leaderboard is below; rows shaded blue are
    European teams. Following sections summarize scores by country, by region (Europe vs.
    rest&nbsp;of&nbsp;world), and by team age bucket (computed from rookie year). The final
    cross&nbsp;tab pairs region with age bucket so the headline question can be read directly.
  </div>

  <h2>Leaderboard</h2>
  <table>
    <thead>
      <tr>
        <th class="num">Rank</th>
        <th class="num">Team #</th>
        <th>Team name</th>
        <th>Country</th>
        <th>Region</th>
        <th>City / State</th>
        <th class="num">Rookie yr</th>
        <th class="num">Age</th>
        <th class="num">Score</th>
      </tr>
    </thead>
    <tbody>
      ${enriched
        .map(
          (t) => `
        <tr class="${t.isEurope ? 'eu' : ''}">
          <td class="num">${escapeHtml(t.rank)}</td>
          <td class="num">${escapeHtml(t.teamNumber)}</td>
          <td>${escapeHtml(t.teamName)}</td>
          <td>${escapeHtml(t.country || '—')}</td>
          <td>${
            t.country
              ? `<span class="tag ${t.isEurope ? 'tag-eu' : 'tag-other'}">${t.isEurope ? 'Europe' : 'Other'}</span>`
              : '—'
          }</td>
          <td>${escapeHtml([t.city, t.stateProv].filter(Boolean).join(', ') || '—')}</td>
          <td class="num">${escapeHtml(t.rookieYear || '—')}</td>
          <td class="num">${t.age == null ? '—' : t.age}</td>
          <td class="num">${fmtScore(t.score)}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Scores by country</h2>
  <table>
    <thead><tr>
      <th>Country</th><th class="num">Teams</th>
      <th class="num">Mean</th><th class="num">Median</th><th class="num">Max</th>
    </tr></thead>
    <tbody>
      ${byCountry
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.country)}</td>
          <td class="num">${r.count}</td>
          <td class="num">${r.mean ?? '—'}</td>
          <td class="num">${r.median ?? '—'}</td>
          <td class="num">${r.max ?? '—'}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Europe vs. rest of world</h2>
  <table>
    <thead><tr>
      <th>Region</th><th class="num">Teams</th>
      <th class="num">Mean</th><th class="num">Median</th><th class="num">Max</th>
    </tr></thead>
    <tbody>
      ${regionRows
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.region)}</td>
          <td class="num">${r.count}</td>
          <td class="num">${r.mean ?? '—'}</td>
          <td class="num">${r.median ?? '—'}</td>
          <td class="num">${r.max ?? '—'}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Scores by team age</h2>
  <table>
    <thead><tr>
      <th>Age bucket</th><th class="num">Teams</th>
      <th class="num">Mean</th><th class="num">Median</th><th class="num">Max</th>
    </tr></thead>
    <tbody>
      ${byAge
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.bucket)}</td>
          <td class="num">${r.count}</td>
          <td class="num">${r.mean ?? '—'}</td>
          <td class="num">${r.median ?? '—'}</td>
          <td class="num">${r.max ?? '—'}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Region × age bucket</h2>
  <table>
    <thead><tr>
      <th>Region</th><th>Age bucket</th><th class="num">Teams</th>
      <th class="num">Mean</th><th class="num">Median</th><th class="num">Max</th>
    </tr></thead>
    <tbody>
      ${cross
        .map(
          (r) => `
        <tr class="${r.region === 'Europe' ? 'eu' : ''}">
          <td>${escapeHtml(r.region)}</td>
          <td>${escapeHtml(r.bucket)}</td>
          <td class="num">${r.count}</td>
          <td class="num">${r.mean ?? '—'}</td>
          <td class="num">${r.median ?? '—'}</td>
          <td class="num">${r.max ?? '—'}</td>
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <p class="footnote">
    Team age is computed as <em>(season year − rookie year)</em> when rookie year is present
    in the source payload. Teams with unknown rookie year are listed under "Unknown" and are
    excluded from age-bucket aggregates. Region tag uses geographic Europe (not EU membership).
  </p>
</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const raw = await readFile(DATA, 'utf8');
  const data = JSON.parse(raw);

  const html = renderHtml(data);
  const htmlPath = path.join(OUT_DIR, 'report.html');
  await writeFile(htmlPath, html);
  console.log(`Wrote ${htmlPath}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  const pdfPath = path.join(OUT_DIR, 'leaderboard-report.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.6in', bottom: '0.6in', left: '0.6in', right: '0.6in' },
  });
  await browser.close();
  console.log(`Wrote ${pdfPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
