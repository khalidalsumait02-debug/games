# Corporate Banking Academy — Training Game

A browser-based training game for corporate banking new joiners. Players act as a
Relationship Manager (bank name configurable in config.json): over a 10-month
campaign they meet clients, read ready-made analysis packs (all ratios
pre-computed — the skill is *interpreting* the numbers, not calculating them),
structure cash and non-cash facilities, choose collateral, walk every deal
through the SOP, and live with the consequences — client defaults, audit
findings, lost deals, and reputation damage.

## Levels

| Level | Audience | Focus |
|-------|----------|-------|
| 1 — Intern | No banking background | The absolute basics, one concept per client: repayment sources, overdrafts, LCs, guarantees, term loans, collateral, why process matters, reading simple numbers |
| 2 — Analyst | Fresh graduates | One facility per client: Sight LC, Usance LC (Acceptance), Bid/Performance/Advance Payment bonds, Overdraft, Short Term Revolving Loan, Term Loan, Discounting |
| 3 — Associate | 1–5 years experience | Fill-in-the-blank proposals (facility / amount / tenor each scored), sizing from the working capital cycle, DSCR-based tenors, restructuring, pushy clients |
| 4 — Senior RM | 5+ years experience | Every decision built from five-option blanks: window dressing, evergreening, diversion by tenor, concentration, overtrading, sector-aware ratio reading |

Each level is a campaign of 8 client scenarios plus monitoring months —
roughly 30–60 minutes, **pausable at any point** (progress autosaves; resume
from the menu).

## Play it online

**https://cbgquiz.com** — the full product on Cloudflare (game + shared
leaderboard + account sync backed by a D1 database). Deploy it with
`cd worker && npm run deploy` (see the Cloudflare section below).

A local-only fallback copy also runs on GitHub Pages:
**https://khalidalsumait02-debug.github.io/games/**

Deployment is automatic: every push to `main` triggers the
`.github/workflows/deploy-pages.yml` workflow, which builds the client and
publishes it to Pages. To redeploy, just push your changes to `main`.

(On Pages there is no leaderboard server, so high scores use the per-device
local leaderboard automatically.)

## Run the game

```bash
cd client
npm install
npm run dev          # local development — http://localhost:5173
npm run build        # production build in client/dist (static files, host anywhere)
```

## Accounts & saves

The game has lightweight accounts: each player creates an account on the menu
(name + optional 4–8 digit PIN). Every account has its own save slot, best
scores, and resume state on the device.

With the shared server connected, an account **with a PIN** also syncs its
in-progress campaign to the server — the same name + PIN resumes the campaign
from any device. Without a PIN (or without a server) saves stay on the device.

## Hosting on Cloudflare (game + leaderboard + database in one)

The `worker/` directory deploys the whole product to Cloudflare: the game is
served as static assets, `/api/*` is handled by a Worker, and scores + account
saves live in a D1 (SQLite) database. One deployment, one domain, HTTPS —
the shared leaderboard and cross-device account sync work out of the box.

One-time setup (requires a free Cloudflare account):

```bash
cd worker
npm install
npx wrangler login                      # opens the browser to authorise
npx wrangler d1 create academy-db       # prints a database_id
#   → paste the database_id into worker/wrangler.toml
npm run db:init                         # creates the tables
npm run deploy                          # builds the client and deploys everything
```

The deploy attaches **https://cbgquiz.com** (and www) automatically — the
custom domains are declared in `worker/wrangler.toml` and the zone lives on
the same Cloudflare account. A `*.workers.dev` URL is also printed as a
fallback address.

Redeploy after changes with `npm run deploy`. The client calls the API on the
same origin (`leaderboardUrl` is empty in config), so no CORS or URL wiring is
needed.

## Shared leaderboard & save server (optional)

The game works standalone with per-device scores and saves. To share the
leaderboard and enable cross-device resume for a cohort, run the small API
server somewhere everyone can reach (an internal host is fine):

```bash
cd server
npm install
npm start            # listens on port 8787 (override with PORT=...)
```

Then point the client at it in `client/src/data/config.json` →
`leaderboardUrl` (e.g. `http://training-server.internal:8787`) and rebuild.
If the server is unreachable, the game falls back to local scores and saves
automatically. Data lives in `server/data/scores.json` and
`server/data/saves.json` (PINs stored hashed).

Note on the public GitHub Pages copy: browsers block an `https://` page from
calling a plain-`http://` server (mixed content), so to use the shared
features either serve the built client from the same internal host as the
server, or put the server behind HTTPS.

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
