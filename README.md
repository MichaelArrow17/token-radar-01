# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/MichaelArrow17/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/MichaelArrow17/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Entry for the make.fun bounty **"Build the best token launch radar"**
(`token-radar-01`, $1,325). A web dashboard that ranks pre-token DeFi
protocols by implied launch value and shows how to farm a potential
airdrop for each one.

## How it works

`main.ts` (Node 22, standard library only) reads a sealed DefiLlama
snapshot, scores every protocol with no token that is not a wrapped /
staked product of a trading one, and writes `out/board.json`,
`out/data.js` and `out/dossier.json`.

Model ("radar-2"): `implied = round(TVL x 0.30 x growth x maturity x chain
breadth)`, with 7 farm steps per protocol. Board: **198 rows** — all 40
watchlist protocols plus 158 other rankable pre-token protocols.

Top of the board: 1. Steakhouse Financial ($655,066,788) · 2. Sentora
Curator ($617,720,272) · 3. Gauntlet ($393,155,736) · 4. Veda
($371,786,106) · 5. USDD ($243,712,243).

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

Then open `out/dashboard/index.html`, or serve `dashboard/` statically.
`dashboard/` is a static, no-network page: sortable board, search,
category / chain filters, watchlist toggle, per-protocol detail drawer
and a model sandbox.

## Checks

- `node scripts/validate-gate.mjs out` — local gate re-implementation, 7/7 pass
- `node scripts/dom-smoke-test.mjs` — dashboard render smoke test, 11/11 pass
- Screenshots: `screenshots/1-board.png`, `2-detail.png`,
  `3-filtered.png` (1440x900)

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>

## Licence

MIT — see `LICENSE`.
