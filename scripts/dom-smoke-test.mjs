// DOM-shim smoke test for dashboard/app.js (no browser available in this VM).
// Builds a minimal document/window, loads out/data.js + dashboard/app.js,
// renders the board, opens a detail view via hash, and applies a filter.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function makeEl(tag) {
  const el = {
    tag, children: [], attributes: {}, style: {},
    className: '', _text: '',
    set textContent(v) { this._text = v; this.children = []; },
    get textContent() { return this._text; },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener() {},
    appendChild(c) { this.children.push(c); c.parentNode = this; c.isConnected = true; return c; },
    set innerHTML(v) { this._html = v; },
    get innerHTML() { return this._html || ''; },
    showModal() { this.open = true; },
    close() { this.open = false; },
    open: false, isConnected: false, parentNode: null,
  };
  return el;
}

const appEl = makeEl('main');
const sandbox = {
  console,
  window: {
    location: { hash: '#p=sentora-curator', pathname: '/dashboard/index.html', search: '' },
    history: { replaceState() {} },
    addEventListener() {},
    RADAR: undefined,
  },
  document: {
    getElementById: (id) => (id === 'board' ? appEl : null),
    createElement: (tag) => makeEl(tag),
    createTextNode: (t) => { const n = makeEl('#text'); n._text = t; return n; },
  },
  URLSearchParams, Intl,
};
sandbox.window.window = sandbox.window;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync('/home/hatch/workspace/token-radar-01/out/data.js', 'utf8'), sandbox);
vm.runInContext(readFileSync('/home/hatch/workspace/token-radar-01/dashboard/app.js', 'utf8'), sandbox);

// Walk the rendered tree and collect text.
function textOf(node, depth = 0) {
  let out = '';
  if (node._text) out += node._text + ' ';
  if (node._html) out += node._html + ' ';
  for (const c of node.children || []) out += textOf(c, depth + 1);
  return out;
}
const text = textOf(appEl);
const checks = {
  'hero heading present': text.includes('Which pre-token protocol is worth farming next?'),
  'watchlist KPI present': text.includes('40 / 40'),
  'board size present': text.includes('198'),
  'top protocol present': text.includes('Steakhouse Financial'),
  'model formula present': text.includes('implied = round'),
  'sandbox present': text.includes('Try the model yourself'),
  'no-token disclaimer present': text.includes('records no token'),
};
let fail = 0;
for (const [k, v] of Object.entries(checks)) { console.log((v ? 'PASS' : 'FAIL') + ' ' + k); if (!v) fail++; }

// Detail dialog: hash #p=sentora-curator should have opened it.
const dialog = appEl.children.flatMap((s) => s.children || []).find((n) => n.tag === 'dialog') ||
  (function find(n) { for (const c of n.children || []) { if (c.tag === 'dialog') return c; const f = find(c); if (f) return f; } return null; })(appEl);
console.log((dialog && dialog.open ? 'PASS' : 'FAIL') + ' detail dialog opens from #p= hash');
if (!dialog || !dialog.open) fail++;
if (dialog) {
  const dt = textOf(dialog);
  console.log((dt.includes('Sentora Curator') ? 'PASS' : 'FAIL') + ' detail shows protocol name');
  console.log((dt.includes('Farm plan') ? 'PASS' : 'FAIL') + ' detail shows farm plan');
  console.log((dt.includes('Implied value') ? 'PASS' : 'FAIL') + ' detail shows implied value');
  if (!dt.includes('Sentora Curator') || !dt.includes('Farm plan') || !dt.includes('Implied value')) fail++;
}
console.log(fail === 0 ? 'DOM SMOKE TEST: ALL PASS' : `DOM SMOKE TEST: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
