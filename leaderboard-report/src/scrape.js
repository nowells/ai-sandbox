// Pulls the FIRST LEGO League World Championship leaderboard with Playwright.
//
// Strategy:
//   1. Load the leaderboard SPA in Chromium.
//   2. Capture every JSON response — eventhub is a React app and the table
//      is hydrated from a small set of API calls. We dump the raw JSON to
//      data/network/ so it can be inspected if the schema changes.
//   3. From those captured payloads we extract: rank, team number, team name,
//      score, city/state/country, and rookie year when available.
//   4. If the network-capture path comes up empty (e.g. eventhub changes how
//      it loads data) we fall back to scraping the rendered DOM.
//   5. Write the merged result to data/leaderboard.json.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const NET_DIR = path.join(DATA_DIR, 'network');

const LEADERBOARD_URL =
  process.env.LEADERBOARD_URL ||
  'https://eventhub.firstinspires.org/leaderboard/648a05f7-ee85-4744-bdd7-62d4b4f21c3a/87b8c427-18e0-4bb9-bf66-2f26f4b20057';

const HEADLESS = process.env.HEADLESS !== 'false';
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS || 60_000);
const SETTLE_MS = Number(process.env.SETTLE_MS || 4_000);

async function ensureDirs() {
  await mkdir(NET_DIR, { recursive: true });
}

function safeFilename(url) {
  return url.replace(/[^a-z0-9]+/gi, '_').slice(0, 180);
}

// Walk an arbitrary JSON tree and yield every object that "looks like" a
// leaderboard row. eventhub's payload shape isn't documented publicly, so
// we identify rows heuristically: an object with a numeric score-ish field
// plus a team identifier.
function* findLeaderboardRows(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) yield* findLeaderboardRows(item);
    return;
  }
  const keys = Object.keys(node);
  const lower = keys.map((k) => k.toLowerCase());
  const hasTeam = lower.some((k) =>
    ['teamnumber', 'team_number', 'teamid', 'team_id', 'teamname', 'team_name', 'team'].includes(k),
  );
  const hasScore = lower.some((k) =>
    ['score', 'highscore', 'high_score', 'totalscore', 'total_score', 'points'].includes(k),
  );
  if (hasTeam && hasScore) {
    yield node;
  }
  for (const k of keys) yield* findLeaderboardRows(node[k]);
}

function pick(obj, candidates) {
  for (const c of candidates) {
    for (const k of Object.keys(obj)) {
      if (k.toLowerCase() === c.toLowerCase() && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
        return obj[k];
      }
    }
  }
  return undefined;
}

function normalizeRow(raw) {
  const team = {
    rank: pick(raw, ['rank', 'place', 'position']),
    teamNumber: pick(raw, ['teamNumber', 'team_number', 'number']),
    teamName: pick(raw, ['teamName', 'team_name', 'name', 'nickname']),
    score: pick(raw, ['highScore', 'high_score', 'score', 'totalScore', 'total_score', 'points']),
    country: pick(raw, ['country', 'countryName', 'country_name', 'countryCode', 'country_code']),
    stateProv: pick(raw, ['stateProv', 'state', 'province', 'region', 'stateProvince']),
    city: pick(raw, ['city']),
    rookieYear: pick(raw, ['rookieYear', 'rookie_year', 'rookieyear', 'firstYear']),
  };
  return team;
}

// DOM fallback: scrape whatever rows are visible on the page. Less rich than
// the network path (no country, no rookie year), but ensures we always have
// at least the ranked names and scores.
async function scrapeDom(page) {
  return await page.evaluate(() => {
    const rows = [];
    // Look for any table or list-like rendering that pairs a number with a score.
    const candidateRows = document.querySelectorAll('tr, [role="row"], li, .leaderboard-row, .team-row');
    for (const el of candidateRows) {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      const numMatch = text.match(/\b(\d{3,6})\b/); // team numbers are 3-6 digits
      const scoreMatch = text.match(/\b(\d{1,4})\b\s*$/); // score often last token
      if (numMatch && scoreMatch && numMatch[1] !== scoreMatch[1]) {
        rows.push({
          raw: text,
          teamNumber: numMatch[1],
          score: Number(scoreMatch[1]),
        });
      }
    }
    return rows;
  });
}

async function main() {
  await ensureDirs();
  console.log(`Launching Chromium (headless=${HEADLESS})…`);
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const captured = [];
  page.on('response', async (resp) => {
    try {
      const ct = (resp.headers()['content-type'] || '').toLowerCase();
      if (!ct.includes('json')) return;
      const url = resp.url();
      const body = await resp.json().catch(() => null);
      if (!body) return;
      captured.push({ url, body });
      const fname = safeFilename(url) + '.json';
      await writeFile(path.join(NET_DIR, fname), JSON.stringify(body, null, 2));
    } catch {
      /* ignore parse errors */
    }
  });

  console.log(`Navigating to ${LEADERBOARD_URL}`);
  await page.goto(LEADERBOARD_URL, { timeout: NAV_TIMEOUT_MS, waitUntil: 'domcontentloaded' });

  // Give the SPA time to finish XHRs / render the leaderboard table.
  try {
    await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT_MS });
  } catch {
    console.warn('networkidle timeout — continuing with whatever loaded.');
  }
  await page.waitForTimeout(SETTLE_MS);

  // Pull the page title + visible header text for the report header.
  const pageTitle = await page.title();
  const headerText = await page
    .locator('h1, h2')
    .first()
    .textContent()
    .catch(() => null);

  // Pass 1: extract from captured JSON.
  const rowsByTeam = new Map();
  for (const { body } of captured) {
    for (const raw of findLeaderboardRows(body)) {
      const norm = normalizeRow(raw);
      const key = String(norm.teamNumber ?? norm.teamName ?? Math.random());
      const existing = rowsByTeam.get(key) || {};
      // merge — later rows can fill missing fields (e.g. country comes from a
      // separate team-detail call).
      rowsByTeam.set(key, { ...existing, ...Object.fromEntries(Object.entries(norm).filter(([, v]) => v !== undefined)) });
    }
  }

  let teams = [...rowsByTeam.values()];

  // Pass 2: DOM fallback if the network capture turned up nothing.
  if (teams.length === 0) {
    console.warn('No leaderboard rows found in captured JSON — falling back to DOM scrape.');
    const domRows = await scrapeDom(page);
    teams = domRows.map((r) => ({ teamNumber: r.teamNumber, score: r.score, _domRaw: r.raw }));
  }

  // Sort by score desc and assign rank if missing.
  teams.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
  teams.forEach((t, i) => {
    if (t.rank == null) t.rank = i + 1;
  });

  const out = {
    sourceUrl: LEADERBOARD_URL,
    scrapedAt: new Date().toISOString(),
    pageTitle,
    headerText,
    teamCount: teams.length,
    teams,
  };

  const outPath = path.join(DATA_DIR, 'leaderboard.json');
  await writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${teams.length} teams to ${outPath}`);
  console.log(`Captured ${captured.length} JSON responses in ${NET_DIR}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
