# TIMCHWAI Backend

Node.js/Express API (plus a Wikipedia scraper) for TIMCHWAI ("This Is My Career History, Who Am I?"), a football guessing game. The frontend lives in the `timchwai_app` repo.

## Architecture

```
Browser ──> https://www.timchwai.co.za   (React app, hosted on Vercel; DNS -> Vercel)
               │  axios
               ▼
        https://api.timchwai.co.za       (DigitalOcean droplet, Ubuntu)
               │  nginx (TLS + reverse proxy)
               ▼
        node app.js  (Express, PORT env var, default 3000)
               │  Sequelize
               ▼
        PostgreSQL   (location: UNKNOWN, see "Open questions")
```

- `api.timchwai.co.za` resolves to the droplet (134.122.126.172 as of 2026-11-10). `www`/apex resolve to Vercel.
- nginx on the droplet is the only public entry point. If the Node process is down, nginx returns **502 Bad Gateway**.
- The browser reports that 502 as a **CORS error**, because nginx's error page has no `Access-Control-Allow-Origin` header. The CORS message is a symptom, not the cause. The real problem is always that Node isn't answering.
- History: the backend previously ran on Render. It now runs on the droplet.

## Running locally

```bash
npm install
# create .env, see Environment below
node app.js            # listens on PORT or 3000
npm test               # jest + supertest against app.js; needs a reachable DB with real data (see Tests)
```

`npm start` runs `node app.js`.

The frontend dev server runs on port 3002 and is in the CORS allowlist.

## Environment (`.env`, git-ignored)

| Variable | Purpose |
|---|---|
| `PORT` | Express port (default 3000). Must match the nginx `proxy_pass` target. |
| `DB_URL` | Full Postgres URL. If unset, built from the vars below. |
| `DB_DIALECT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` | Postgres connection parts. |
| `DB_SSL` | `'true'` enables SSL with `rejectUnauthorized: false`. |
| `WIKI_USER_AGENT` | User-Agent for Wikipedia requests (default `career-history-scraper/1.0`). Wikipedia returns **403** to axios's default User-Agent, so the scraper must send one; Wikimedia's policy asks for contact info in it. |
| `DB_LOGGING` | `'true'` prints every SQL statement (very verbose: it made logs hundreds of MB). Off by default. |
| `NODE_ENV` | `test` stops `app.js` from calling `listen()` (for jest). |

Cloudinary is a dependency (team/player images, see `changeImgSource.js`); its credentials are not documented here yet.

## API

All GET, JSON. Controllers are in `models/controllers/`.

| Route | Controller | Notes |
|---|---|---|
| `/` | inline | Health check, returns text `Welcome to TIMCHWAI backend!` |
| `/players` | `PlayerController.getAllPlayers` | id, name, name_basic, birth_date for search. 404 if none. |
| `/player?playerId=` | `getPlayerById` | Player with career. 400 if `playerId` missing. |
| `/random_player` | `getRandomPlayer` | Used by the "Get random player" button. |
| `/player_in_team_seasons` | `getPlayerInTeamSeasons` | |
| `/random_euros_2024` | `getPlayerInEuros2024` | |
| `/last_sync` | `SyncController.getLastSync` | `{last_sync}`: the most recent `players.updatedAt`, i.e. when any player was last modified. Shown in the app header. |
| `/leagues`, `/leagues_with_seasons`, `/league_seasons` | `LeagueController` | |
| `/teams`, `/teams_in_seasons` | `TeamController` | |

CORS allowlist (in `app.js`): `http://localhost:3002`, `https://www.timchwai.co.za`, `https://timchwai-app.vercel.app`. **Any new frontend origin (e.g. the apex `https://timchwai.co.za`) must be added here.**

## Data model

Sequelize models in `models/`: `Player`, `Career`, `Team`, `TeamSeason`, `League`, `LeagueSeason`, `PlayerTeamSeason`. Associations are wired in each model's `associate()`.

Tables were originally created by `db.sync()`; that script (`syncModels.js`, `force: true`) was deleted because it dropped every table. Schema changes need to be made by hand in SQL (or with a one-off `Model.sync()` for a brand-new table, never `force`).

### Tests

`tests/api.test.js` hits the real routes through supertest and the configured database, and some assertions depend on production-like data (player id 2337 is Mason Mount, league seasons 24 and 25 have 23 teams). Run it against a restored copy of the DB, never an empty one. Local setup on a Mac:

```bash
brew install postgresql@16 && brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
createdb timchwai_local
pg_restore --no-owner --no-privileges -d timchwai_local path/to/backup.dump
export DB_URL="postgres://$USER@localhost:5432/timchwai_local"   # env var only, no .env needed
npm test
```

Backup of production: `sudo -u postgres pg_dump -Fc timchwai_db > /root/backups/timchwai_db_$(date +%F).dump`, then `scp` it down. Restore with `pg_restore -c -d timchwai_db <file>`.


## Scraper

`scraperController.js` (yargs CLI) drives `scraper/scraper.js` (cheerio, Wikipedia) to populate the DB. Run it with `node --max_old_space_size=4096 scraperController.js -f <function> ...`.

- `create_league.sh`: loops `-f league --leagueName "Premier League" --count 1..20`, one season per count.
- `create_international_league.sh`: same for `-f internationalLeague --internationalName "UEFA European Championship"`.
- `-f refreshPlayers [--limit 50] [--name "Salah"]`: re-scrapes **existing** players (careers, apps, goals, bio), least recently updated first. Idempotent: careers are `findOrCreate` + update, existing values are kept when Wikipedia yields nothing, and `image` is never replaced (images were migrated to Cloudinary). Run it in batches.
- `-f players`: processes only *new* players (`name_basic` is null); asks for confirmation.
- `-f league --leagueName "<League>"` chooses seasons by **start year** (2025 = 2025/26): no flag = catch-up (from the newest season that already has teams, re-run, through the current season; the current season is the one that began last July/August); `--season 2024` = one season; `--from 2022 [--to 2025]` = a range. `--count N` is the old calendar-year form and is not needed any more. `create_league.sh` (loops `--count 1..20`) predates this and never reaches the current season.
- `changeImgSource.js`: image source/Cloudinary migration helper.
- Logs go to `logs/scraper_<timestamp>.log`. The directory is git-ignored and must exist.

The app header's "Data last updated" date is dynamic: the scraper rewrites a player's row whenever it (re)processes them, so `/last_sync` (max `players.updatedAt`) advances by itself after any sync or refresh. There is nothing to record.

### Running syncs in the background (`sync.sh`)

Run on the droplet from `/root/timchwai_backend`. Jobs are detached, so they survive closing SSH. Each job has a log in `logs/sync/<id>.log` and a state (`running`, `done`, `failed`, `stopped`, `lost`).

```bash
./sync.sh season "Premier League" "La Liga"   # catch up each league to the current season, then load new players
./sync.sh season --season 2024 "La Liga"       # one season only (start year)
./sync.sh season --from 2022 --to 2024 "La Liga"   # a range
./sync.sh refresh 100                          # refresh 100 existing players (oldest first)
./sync.sh run teams -f teams                   # any other scraper call: run <label> <args>
./sync.sh list                                 # all jobs and their state
./sync.sh status [id]                          # progress of a job (default: latest)
./sync.sh tail [id]                            # follow its log (Ctrl-C leaves the job running)
./sync.sh errors [id]                          # error / failed lines
./sync.sh stop [id]
```

Steps keep running a few seconds after they log completion, because the scraper starts work it does not await; this is normal, and the process must not close the DB connection early (that breaks it).

The scraper's own per-process log (`logs/scraper_<timestamp>.log`, from `logger.js`) is also written. `NODE_MEM` (default 384 MB) caps Node's heap. The droplet has only ~450 MB RAM: with a 2048 cap the kernel OOM-killed the scraper (exit 137), and below ~256 Node itself runs out of heap (exit 134). Team pages are processed one at a time to keep memory low. A `--from/--to` range runs one process per season.

The scraper is a manual, offline tool. It is not needed for the API to run.

## Production server (DigitalOcean droplet)

Verified 2026-11-10. Ubuntu 24.04, host `ubuntu-timchwai`, IP 134.122.126.172, everything runs as `root`.

| Piece | Detail |
|---|---|
| App | `/root/timchwai_backend`, a plain `git clone` of this repo (`origin/master`), run by **pm2** as `timchwai_backend` (`node app.js`, fork mode). |
| Port | 3000 (`PORT` not set in `.env`, so the default is used). |
| pm2 binary | Installed globally (`/usr/local/bin/pm2`), not a project dependency. |
| Boot | pm2 is restored on boot by the `pm2-root` systemd service. After changing the process list, run `pm2 save`. |
| nginx | `/etc/nginx/sites-enabled/timchwai_backend`: `api.timchwai.co.za` on 443 (TLS) and 80, `proxy_pass http://localhost:3000`. |
| TLS | Let's Encrypt via certbot, auto-renewed by `certbot.timer` / `snap.certbot.renew.timer`. Check with `certbot certificates`. |
| Database | PostgreSQL on the same droplet, localhost only (5432), database `timchwai_db`, `DB_SSL=false`. Credentials are in `/root/timchwai_backend/.env`. |
| Backups | **None.** No dumps, no cron jobs. See "To do". |

### Deploy a change

```bash
ssh root@134.122.126.172
cd /root/timchwai_backend
git pull
npm install          # only if package.json changed
pm2 restart timchwai_backend
pm2 logs timchwai_backend --lines 30 --nostream
curl -i localhost:3000/random_player
```

There is no CI. The frontend deploys separately through Vercel.

### Triage a 502 from `api.timchwai.co.za`

A 502 means nginx is up but the Node app is not answering.

```bash
pm2 list                              # is timchwai_backend "online"? an empty list means pm2 lost its processes
pm2 resurrect                         # restore the saved process list if empty
pm2 logs --lines 100 --nostream       # crash reason: DB connection, missing .env, port in use
curl -i localhost:3000/               # does Node answer locally?
systemctl is-active postgresql nginx  # both should say "active"
systemctl is-enabled pm2-root         # must be "enabled" so the app survives reboots
df -h /; free -m                      # disk or memory exhaustion
```

Incident 2026-11-10: the droplet had rebooted and the pm2 process list was empty, so nginx returned 502 and browsers reported CORS errors. Fixed with `pm2 resurrect`, then `pm2 startup systemd` + `pm2 save`, and a reboot test confirmed the app comes back on its own.

### Access

SSH with a key (`ssh root@134.122.126.172`). The DigitalOcean web console also works without a password.

## To do

- **Back up Postgres.** The game data exists only in the droplet's database. At minimum add a nightly `pg_dump` cron job that copies off-server, and/or enable DigitalOcean droplet backups.
- Run as a non-root user, and apply pending OS updates (200 pending, 5 security).
- Add an uptime monitor on `https://api.timchwai.co.za/`.
- Make `tests/api.test.js` independent of production data (seed or fixtures).
- `leagues` has empty duplicate rows (ids 7-12: a second Premier League, three Serie A, "LaLiga EA Sports", Bundesliga, Ligue 1). Harmless now (lookups pick the lowest id) but worth deleting once confirmed unreferenced.
- Known scraper noise: `createLeague` logs `column "nan" does not exist` (infobox layout changed; the league row already exists); players whose image URL exceeds 512 characters are not updated.
- Document Cloudinary configuration.
