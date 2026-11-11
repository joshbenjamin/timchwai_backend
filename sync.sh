#!/usr/bin/env bash
# Run scraper jobs in the background, with a log and status per job.
# Jobs survive closing your SSH session. Run from the backend directory.
#
#   ./sync.sh season "Premier League" "La Liga"   catch up each league (every season since the newest one loaded,
#                                                 through the current season), then load new players
#   ./sync.sh season --season 2024 "La Liga"       only one season (2024 = 2024/25)
#   ./sync.sh season --from 2022 --to 2024 "La Liga"   a range (--to defaults to the current season)
#   ./sync.sh refresh [limit]                      refresh existing players' careers (default 50)
#   ./sync.sh run <label> <scraperController args> any other scraper call, e.g. run teams -f teams
#   ./sync.sh list                                 all jobs and their state
#   ./sync.sh status [id]                          state of one job (default: latest)
#   ./sync.sh tail [id]                            follow a job's log (Ctrl-C leaves the job running)
#   ./sync.sh errors [id]                          error/failed lines from a job's log
#   ./sync.sh stop [id]                            stop a running job
#
# Files: logs/sync/<id>.log (output), <id>.status, <id>.pid. <id> = timestamp-label.
# Env: NODE_MEM (MB, default 2048), SCRAPER_CMD (override for testing).
set -u
cd "$(dirname "$0")"

DIR=logs/sync
NODE_MEM="${NODE_MEM:-2048}"
SCRAPER_CMD="${SCRAPER_CMD:-node --max_old_space_size=$NODE_MEM scraperController.js}"
mkdir -p "$DIR"

latest_id() { ls -1t "$DIR"/*.status 2>/dev/null | head -1 | xargs -I{} basename {} .status; }
resolve() { local id="${1:-$(latest_id)}"; [ -n "$id" ] && [ -f "$DIR/$id.status" ] || { echo "No such job: ${1:-<none>}" >&2; exit 1; }; echo "$id"; }

# running | done | failed (exit N) | stopped | lost (process died without recording an end)
state() {
  local id="$1" s; s="$(cat "$DIR/$id.status")"
  if [ "$s" = "running" ]; then
    local pid; pid="$(cat "$DIR/$id.pid" 2>/dev/null)"
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then s="lost"; fi
  fi
  echo "$s"
}

step() { # step <logfile> <description> <cmd...>; stdin gets "y" for scraper confirmation prompts
  local log="$1" desc="$2"; shift 2
  echo "[$(date '+%F %T')] START $desc" >> "$log"
  printf 'y\ny\n' | "$@" >> "$log" 2>&1
  local rc=$?
  echo "[$(date '+%F %T')] END   $desc (exit $rc)" >> "$log"
  return $rc
}

job() { # internal: runs inside the detached process
  local id="$1" kind="$2"; shift 2
  local log="$DIR/$id.log" rc=0
  echo $$ > "$DIR/$id.pid"
  echo running > "$DIR/$id.status"
  case "$kind" in
    season)
      local extra=()
      while [[ "${1:-}" == --* ]]; do extra+=("$1" "$2"); shift 2; done
      for league in "$@"; do
        step "$log" "league '$league' ${extra[*]:-catch-up}" $SCRAPER_CMD -f league --leagueName "$league" ${extra[@]+"${extra[@]}"} || rc=1
      done
      step "$log" "new players" $SCRAPER_CMD -f players || rc=1
      ;;
    refresh)
      step "$log" "refresh players (limit $1)" $SCRAPER_CMD -f refreshPlayers --limit "$1" || rc=1
      ;;
    run)
      step "$log" "run: $*" $SCRAPER_CMD "$@" || rc=1
      ;;
  esac
  [ "$rc" = 0 ] && echo done > "$DIR/$id.status" || echo "failed" > "$DIR/$id.status"
  echo "[$(date '+%F %T')] JOB $id finished: $(cat "$DIR/$id.status")" >> "$log"
}

start() { # start <label> <kind> <args...>
  local label="$1" kind="$2"; shift 2
  local id; id="$(date +%Y%m%d-%H%M%S)-$(echo "$label" | tr -c 'A-Za-z0-9\n' '_' | tr -s '_')"
  echo queued > "$DIR/$id.status"
  nohup "$0" _job "$id" "$kind" "$@" < /dev/null > /dev/null 2>&1 &
  echo "Started job $id (pid $!)"
  echo "  follow: ./sync.sh tail $id"
  echo "  state:  ./sync.sh status $id"
}

cmd="${1:-help}"; [ $# -gt 0 ] && shift
case "$cmd" in
  season)  [ $# -ge 1 ] || { echo 'Usage: ./sync.sh season [--season Y | --from Y [--to Z]] "League Name" ["Another League" ...]'; exit 1; }
           start season season "$@" ;;
  refresh) start refresh refresh "${1:-50}" ;;
  run)     [ $# -ge 2 ] || { echo "Usage: ./sync.sh run <label> <scraperController args>"; exit 1; }
           label="$1"; shift; start "$label" run "$@" ;;
  _job)    job "$@" ;;
  list)    for f in $(ls -1t "$DIR"/*.status 2>/dev/null); do id="$(basename "$f" .status)"; printf '%-40s %s\n' "$id" "$(state "$id")"; done ;;
  status)  id="$(resolve "${1:-}")"; echo "$id: $(state "$id")"; grep -E "^\[[0-9-]+ [0-9:]+\] (START|END|JOB)" "$DIR/$id.log" 2>/dev/null | tail -20
           echo "progress: $(grep -E "Refreshed [0-9]+ of|Processing player [0-9]+ of" "$DIR/$id.log" 2>/dev/null | tail -1)" ;;
  tail)    id="$(resolve "${1:-}")"; touch "$DIR/$id.log"; tail -n 40 -f "$DIR/$id.log" ;;
  errors)  id="$(resolve "${1:-}")"; grep -n -i -E "error|failed|not found" "$DIR/$id.log" | grep -v -E "Refreshed [0-9]+ of" | tail -50 ;;
  stop)    id="$(resolve "${1:-}")"; pid="$(cat "$DIR/$id.pid" 2>/dev/null)"
           if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
             kids="$(pgrep -P "$pid")"; kill "$pid"; [ -n "$kids" ] && kill $kids 2>/dev/null; echo stopped > "$DIR/$id.status"; echo "Stopped $id"
           else echo "$id is not running"; fi ;;
  *)       sed -n '2,16p' "$0" ;;
esac
