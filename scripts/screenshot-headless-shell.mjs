import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import('/home/hatch/.npm/_npx/705bc6b22212b352/node_modules/playwright-core/index.mjs');
const out = 'out';
const board = JSON.parse(readFileSync(join('/home/hatch/workspace/token-radar-01', out, 'board.json'), 'utf8'));
const top = board.rows[0].slug;
const base = pathToFileURL(join('/home/hatch/workspace/token-radar-01', out, 'dashboard', 'index.html')).href;
const views = [
  ['1-board.png', base],
  ['2-detail.png', `${base}#p=${top}`],
  ['3-filtered.png', `${base}#category=Lending`],
];
const browser = await chromium.launch({ executablePath: '/tmp/chrome-headless-shell-linux64/chrome-headless-shell', headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
for (const [name, url] of views) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join('/home/hatch/workspace/token-radar-01/screenshots', name), type: 'png' });
  await page.close();
  console.log('wrote screenshots/' + name);
}
await browser.close();
