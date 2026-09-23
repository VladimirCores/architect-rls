# E2E tests (Robot Framework + robotframework-browser)

End-to-end tests for the RLS backend API, written in
[Robot Framework](https://robotframework.org/) and driven by
[robotframework-browser](https://marketsquare.github.io/robotframework-browser/)
(Playwright under the hood). The example suite covers the `POST /api/v1/login`
route.

## Why robotframework-browser for an API?

`/login` is a JSON REST endpoint with no web frontend (the client is a Flutter
desktop app). robotframework-browser exposes an `Http` keyword that issues
requests **from a real headless Chromium**, so we get real browser-network
semantics (headers, status, JSON body) without needing Swagger UI or an extra
container.

## What runs

| File | Suite | Library | Covers |
|------|-------|---------|--------|
| `robot/login.robot` | `/login` example | `Browser` (`Http`) | 200 profile + 401 Problem |
| `robot/browser_smoke.robot` | browser health | `Browser` | headless Chromium launches (skips if Chromium missing) |

## Quick start

```bash
# One command: venv -> deps -> chromium -> seed DB -> start backend -> robot -> teardown
bun run e2e

# ...or:  bash tests/e2e/run.sh
# Only (re)install the Python + browser tooling:  bun run e2e:install   (= run.sh --setup)
```

Everything lives in **`tests/e2e/run.sh`** (a single entry point). It is
idempotent: the Python venv + robotframework-browser + Chromium are set up once
and cached, so repeated `bun run e2e` runs only start the backend and re-run the
tests.

## How it works

- `tests/e2e/server.ts` (Bun) imports the Hono `app` from `backend/src/main.ts`,
  seeds a **temporary SQLite DB** on startup — a deterministic user
  `operator_1` / `securePassword123` (role `user`, features `radar.export` +
  `session.history`) — then serves via `Bun.serve` on `BIND_ADDRESS:PORT`. Your
  real `data/app.db` is never touched (the DB path defaults to a fresh `/tmp`
  temp file).
- `run.sh` starts `server.ts`, waits for `GET /health`, runs `robot`, then kills
  the server and deletes the temp DB.
- `Resources/common.robot` imports `Browser`/`Collections`, defines the
  `${BASE_URL}` default, and provides a tolerant `Close All Browser Sessions`.

## Prerequisites

- **Python 3** (venv created automatically by `run.sh`)
- **Node.js ≥ 18** (robotframework-browser Node wrapper)
- **Bun** (serve the test backend)
- **curl** (health-check during startup)

## Environment overrides

| Variable | Default | Notes |
|----------|---------|-------|
| `RLS_TEST_PORT` | `3001` | Port the test backend listens on |
| `BIND_ADDRESS` | `127.0.0.1` | Bind address for the test backend |
| `DB_PATH` | auto temp | Point at a pre-seeded DB instead |

## Results

Robot artefacts are written to `tests/e2e/results/` (`log.html` /
`report.html` / `output.xml`) — git-ignored. Open
`tests/e2e/results/report.html` in a browser for the full report.
