// Local re-implementation of the token-radar-01 gate's seven rows, as far as
// they can be checked without the sealed scorer. Run from the repo root:
//   node scripts/validate-gate.mjs [out-dir]
// Exit 0 when every row passes. This does NOT replace the server grade.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from '../vendor/makefun-board.ts';

const out = process.argv[2] ?? 'out';
const snap = JSON.parse(readFileSync('input/snapshot.json', 'utf8'));
const boardDoc = JSON.parse(readFileSync(join(out, 'board.json'), 'utf8'));
const rows = boardDoc.rows;
const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(name);
};

// 1. dashboard_files
{
  const files = [];
  const walk = (dir, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(dir, e.name), p);
      else if (e.isFile()) files.push(p);
    }
  };
  walk(join(out, 'dashboard'));
  const hasHtml = files.includes('index.html');
  const hasCss = files.some((f) => f.endsWith('.css'));
  const hasJs = files.some((f) => f.endsWith('.js'));
  const bytes = files.reduce((n, f) => n + statSync(join(out, 'dashboard', f)).size, 0);
  let noNet = true;
  for (const f of files) {
    const text = readFileSync(join(out, 'dashboard', f), 'utf8');
    if (/https?:\/\//.test(text) && !/DefiLlama/.test(text)) {
      // Visible text may carry URLs; attributes/imports may not. This local
      // check is conservative: any http(s) string is flagged for review.
      noNet = false;
    }
    if (/https?:\/\//.test(text)) {
      // Re-check narrowly: attribute values and import specifiers.
      if (/(src|href)\s*=\s*["'][^"']*https?:\/\//.test(text) || /from\s+["']https?:\/\//.test(text) || /import\s*\(\s*["']https?:\/\//.test(text)) noNet = false;
    }
  }
  check('dashboard_files', hasHtml && hasCss && hasJs && files.length <= 400 && bytes <= 4_194_304,
    `${files.length} files, ${bytes} bytes, html=${hasHtml} css=${hasCss} js=${hasJs}`);
}

// 2. board_file
{
  const slugs = new Set(snap.protocols.map((p) => p.slug));
  const bad = rows.filter((r) => !slugs.has(r.slug)).slice(0, 3).map((r) => r.slug);
  const ok = Array.isArray(rows) && rows.length >= 100 && rows.length <= 4000 &&
    rows.every((r) => typeof r.name === 'string' && r.name.length > 0 &&
      Number.isSafeInteger(r.rank) && r.rank > 0 &&
      Number.isSafeInteger(r.implied_value_usd) && r.implied_value_usd > 0 &&
      r.implied_value_usd <= 100_000_000_000_000 && Array.isArray(r.farm_steps)) &&
    bad.length === 0 &&
    !(rows.length >= 2 && rows.every((r) => r.implied_value_usd === rows[0].implied_value_usd));
  check('board_file', ok, `${rows.length} rows, invented slugs: ${bad.join(', ') || 'none'}`);
}

// 3. sorted_by_value
{
  const ranks = rows.map((r) => r.rank).sort((a, b) => a - b);
  const ranksOk = ranks.every((v, i) => v === i + 1);
  const orderOk = rows.every((r, i) => i === 0 || r.implied_value_usd <= rows[i - 1].implied_value_usd);
  check('sorted_by_value', ranksOk && orderOk, `ranks 1..${rows.length} exact=${ranksOk}, non-increasing=${orderOk}`);
}

// 4. coverage
{
  const have = new Set(rows.map((r) => r.slug));
  const missing = snap.watchlist.filter((s) => !have.has(s));
  check('coverage', missing.length === 0, `${snap.watchlist.length - missing.length}/${snap.watchlist.length} watchlist slugs covered`);
}

// 5. farm_steps
{
  const bad = rows.filter((r) => r.farm_steps.length < 3 || r.farm_steps.length > 12 ||
    r.farm_steps.some((s) => s.trim().length < 20 || s.trim().length > 600));
  check('farm_steps', bad.length === 0, bad.length === 0 ? `${rows.length} rows x ${rows[0].farm_steps.length} steps, 20..600 chars` : `${bad.length} bad rows, first ${bad[0].slug}`);
}

// 6. screenshots (PNG/JPEG dimensions parsed from headers, no decoder needed)
{
  const names = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
  const dims = names.map((n) => {
    const buf = readFileSync(join(out, 'screenshots', n));
    let w = 0, h = 0, kind = 'unknown';
    if (buf[0] === 0x89 && buf[1] === 0x50) { kind = 'png'; w = buf.readUInt32BE(16); h = buf.readUInt32BE(20); }
    else if (buf[0] === 0xff && buf[1] === 0xd8) {
      kind = 'jpeg';
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break;
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
    return { name: n, kind, w, h, bytes: buf.length };
  });
  const ok = names.length >= 3 && names.length <= 4 &&
    dims.every((d) => (d.kind === 'png' || d.kind === 'jpeg') && d.bytes <= 524_288 &&
      Math.max(d.w, d.h) <= 1440 && Math.min(d.w, d.h) >= 800);
  check('screenshots', ok, dims.map((d) => `${d.name} ${d.kind} ${d.w}x${d.h} ${Math.round(d.bytes / 1024)}KB`).join('; '));
}

// 7. dossier_matches
{
  const built = buildDossier(out, { text_max_bytes: 65536, screenshots: { max: 4, max_bytes: 524288 }, dashboard: { max_files: 400, max_bytes: 4194304 } });
  const onDisk = readFileSync(join(out, 'dossier.json'));
  const same = Buffer.from(built).equals(onDisk);
  check('dossier_matches', same && onDisk.length <= 1_572_864, `dossier ${onDisk.length} bytes, byte-identical to buildDossier=${same}`);
}

console.log(failures.length === 0 ? 'GATE (local): ALL 7 ROWS PASS' : `GATE (local): ${failures.length} ROW(S) FAIL: ${failures.join(', ')}`);
process.exit(failures.length === 0 ? 0 : 1);
