# FIRST LEGO leaderboard report

Pulls the FIRST LEGO League World Championship leaderboard with Playwright and
renders a PDF report that pairs each team's score with its country and team age,
so you can read off whether older European teams routinely score higher.

Default source:
<https://eventhub.firstinspires.org/leaderboard/648a05f7-ee85-4744-bdd7-62d4b4f21c3a/87b8c427-18e0-4bb9-bf66-2f26f4b20057>

## Layout

- `src/scrape.js` — launches Chromium, captures every JSON response from the
  leaderboard SPA, and merges the rows into `data/leaderboard.json`. Falls back
  to scraping the rendered DOM if no JSON payload is recognized.
- `src/generate-report.js` — turns `data/leaderboard.json` into
  `output/report.html`, then prints it to `output/leaderboard-report.pdf` using
  Chromium.
- `data/network/` — raw JSON responses captured during scraping (kept for
  debugging / schema changes).

## Running locally

```bash
cd leaderboard-report
npm install
npx playwright install chromium
npm run all   # scrape, then generate the PDF
```

Override the source with `LEADERBOARD_URL=...`. Set `HEADLESS=false` to watch
the scrape run in a visible browser.

## Running in CI

The workflow at `.github/workflows/leaderboard-report.yml` runs on push/PR
touching this directory, on a weekly schedule, and on manual dispatch. It
uploads `leaderboard-report.pdf`, the HTML, the merged JSON, and the raw
network captures as a single `leaderboard-report` artifact on the workflow run.
