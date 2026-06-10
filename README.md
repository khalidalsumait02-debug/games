# Corporate Banking Academy — Training Game

A browser-based training game for corporate banking new joiners. Players act as a
Relationship Manager at the fictional **Dasman Corporate Bank**: over a 10-month
campaign they meet clients, read ready-made analysis packs (all ratios
pre-computed — the skill is *interpreting* the numbers, not calculating them),
structure cash and non-cash facilities, choose collateral, walk every deal
through the SOP, and live with the consequences — client defaults, audit
findings, lost deals, and reputation damage.

## Levels

| Level | Audience | Focus |
|-------|----------|-------|
| 1 — Foundations | Fresh graduates | One facility per client: Sight LC, Usance LC (Acceptance), Bid/Performance/Advance Payment bonds, Overdraft, Short Term Revolving Loan, Term Loan, Discounting |
| 2 — Structuring | 1–5 years experience | Sizing limits from the working capital cycle, DSCR-based tenors, usance matched to the trade cycle, restructuring, pushy clients |
| 3 — Refresher | 5+ years experience | Window dressing, evergreening, diversion by tenor, concentration, overtrading, sector-aware ratio reading |

Each level is a campaign of 8 client scenarios plus monitoring months —
roughly 30–60 minutes, **pausable at any point** (progress autosaves; resume
from the menu).

## Play it online

The game is deployed on GitHub Pages from the `gh-pages` branch:

**https://khalidalsumait02-debug.github.io/games/**

(On Pages there is no leaderboard server, so high scores use the per-device
local leaderboard automatically.)

To redeploy after making changes:

```bash
cd client && npm run build
git worktree add /tmp/ghp gh-pages
rm -rf /tmp/ghp/assets /tmp/ghp/index.html /tmp/ghp/favicon.svg
cp -r dist/* /tmp/ghp/ && touch /tmp/ghp/.nojekyll
cd /tmp/ghp && git add -A && git commit -m "Redeploy" && git push
cd - && git worktree remove /tmp/ghp
```

## Run the game

```bash
cd client
npm install
npm run dev          # local development — http://localhost:5173
npm run build        # production build in client/dist (static files, host anywhere)
```

## Shared leaderboard (optional)

The game works standalone with a per-device leaderboard. To share high scores
across a cohort, run the small API server somewhere everyone can reach (an
internal host is fine):

```bash
cd server
npm install
npm start            # listens on port 8787 (override with PORT=...)
```

Then point the client at it in `client/src/data/config.json` →
`leaderboardUrl` (e.g. `http://training-server.internal:8787`) and rebuild.
If the server is unreachable, the game falls back to the local leaderboard
automatically. Scores are stored in `server/data/scores.json`.

## Editing the training content

All banking content is plain JSON in `client/src/data/` — designed to be
reviewed and adjusted by the training team without touching code:

| File | Contents |
|------|----------|
| `config.json` | Bank name, campaign length, leaderboard URL |
| `facilities.json` | Facility definitions shown in the in-game Product Guide |
| `collateral.json` | Collateral & security types |
| `sop.json` | SOP steps (order matters) and document checklists per facility type |
| `scenarios.level1/2/3.json` | The client scenarios: analysis packs, decisions, feedback, planted file errors |

> **Note:** product terms and the SOP flow are **draft v1** written from
> general corporate banking knowledge — they are intended to be reviewed and
> corrected against the bank's actual policies before rollout. No real bank's
> internal material is included.

## Tests

```bash
cd client
npx tsx scripts/smoke.ts   # simulates full campaigns on all levels + validates scenario data
npm run lint
```
