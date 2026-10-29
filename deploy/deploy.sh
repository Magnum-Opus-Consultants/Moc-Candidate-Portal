#!/usr/bin/env bash
#
# Deploy the MOC Candidate Portal. Run on the server, from /srv/moc-portal.
#
# Every gate below exists so that a broken build never replaces a working
# one: the script stops before restarting anything if the tree is dirty,
# the settings are not production-safe, or either build fails.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# The ports the services actually bind. Read from the unit file rather than
# repeated here: this health check was looking at 8002 while gunicorn had
# been on 8004 for some time, so a good deploy still reported failure.
API_PORT="${API_PORT:-$(sed -n 's/.*--bind [0-9.]*:\([0-9][0-9]*\).*/\1/p' /etc/systemd/system/moc-portal-api.service 2>/dev/null | head -1)}"
API_PORT="${API_PORT:-8004}"
WEB_PORT="${WEB_PORT:-3001}"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mdeploy stopped: %s\033[0m\n' "$1" >&2; exit 1; }

# --- Refuse to deploy something that is not in git --------------------
# Otherwise nobody can tell later what is actually running.
[ -n "$(git status --porcelain)" ] && die "working tree is dirty — commit or stash first"

say "Fetching"
git pull --ff-only

# --- Backend ----------------------------------------------------------
say "Backend dependencies"
[ -d backend/.venv ] || python3 -m venv backend/.venv
backend/.venv/bin/pip install --quiet --upgrade pip
backend/.venv/bin/pip install --quiet -r backend/requirements.txt

say "Checking production settings"
# This is the gate that catches DEBUG left on, a development SECRET_KEY,
# or ALLOWED_HOSTS still pointing at localhost.
( cd backend && ./.venv/bin/python manage.py check --deploy --fail-level WARNING ) \
  || die "check --deploy failed — fix backend/.env before deploying"

say "Migrations"
( cd backend && ./.venv/bin/python manage.py migrate --noinput )

say "Static files"
( cd backend && ./.venv/bin/python manage.py collectstatic --noinput --clear )

# --- Frontend ---------------------------------------------------------
say "Frontend dependencies"
( cd frontend && npm ci )

say "Building the front end"
# Built before anything is restarted. A failure here leaves the running
# site untouched.
( cd frontend && npm run build ) || die "front-end build failed — nothing was restarted"

# --- Swap over --------------------------------------------------------
say "Restarting"
sudo systemctl restart moc-portal-api.service
sudo systemctl restart moc-portal-web.service

say "Waiting for both to answer"
for i in $(seq 1 30); do
  api=$(curl -fsS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${API_PORT}/api/health/" || true)
  web=$(curl -fsS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${WEB_PORT}/" || true)
  [ "$api" = "200" ] && [ "$web" = "200" ] && break
  sleep 2
done

[ "${api:-}" = "200" ] || die "the API did not come back — journalctl -u moc-portal-api -n 50"
[ "${web:-}" = "200" ] || die "the front end did not come back — journalctl -u moc-portal-web -n 50"

say "Deployed — https://careers.demo.moc-pty.com"
git --no-pager log --oneline -1
