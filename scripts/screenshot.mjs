// Take the three token-radar-01 screenshots with a headless browser.
// Requires Playwright's chromium-headless-shell (preferred) or a system
// Chrome/Chromium binary. Usage, from the repo root after `node main.ts`:
//   node scripts/screenshot.mjs            # uses out/dashboard
//   node scripts/screenshot.mjs out
// Then re-run main.ts so /output/dossier.json is rebuilt from the new shots:
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
//
// Views (1440x900, long side 1440, short side 900):
//   1-board.png    dashboard board, default view
//   2-detail.png   detail drawer for the rank-1 protocol (#p=<slug>)
//   3-filtered.png board filtered to one category (#category=Lending)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const out = process.argv[2] ?? 'out';
const board = JSON.parse(readFileSync(join(out, 'board.json'), 'utf8'));
const top = board.rows[0].slug;
const base = pathToFileURL(join(process.cwd(), out, 'dashboard', 'index.html')).href;
const views = [
  ['1-board.png', base],
  ['2-detail.png', `${base}#p=${top}`],
  ['3-filtered.png', `${base}#category=Lending`],
];

async function withPlaywright() {
  const { chromium } = await import('playwright-core');
  const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const browser = await chromium.launch({ executablePath: exe || undefined, headless: true, args: ['--no-sandbox'] });
  for (const [name, url] of views) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: join('screenshots', name), type: 'png' });
    await page.close();
    console.log('wrote screenshots/' + name);
  }
  await browser.close();
}

function withChrome(binary) {
  for (const [name, url] of views) {
    execFileSync(binary, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--window-size=1440,900', `--screenshot=${join('screenshots', name)}`, url], { stdio: 'inherit' });
    console.log('wrote screenshots/' + name);
  }
}

const candidates = ['/opt/meta-chromium/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
const chrome = candidates.find((c) => existsSync(c));
try {
  await withPlaywright();
} catch (e) {
  console.error('playwright path failed:', String(e).split('\n')[0]);
  if (!chrome) { console.error('No Playwright browser and no system Chrome found. Screenshots remain a manual step.'); process.exit(2); }
  withChrome(chrome);
}
