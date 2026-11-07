#!/usr/bin/env bash
# Deploy the latest code on the VPS: backup DB → git pull → npm ci → build → restart → health check.
# Installed by setup-server.sh as /usr/local/bin/react-base-deploy. Run as root:  react-base-deploy
# Optional: BRANCH=some-branch react-base-deploy
set -euo pipefail

APP_NAME=react-base
APP_USER=reactbase
APP_DIR=/srv/$APP_NAME
BRANCH="${BRANCH:-main}"
PORT="$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2 || true)"
PORT="${PORT:-3000}"

[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }
as_app() { sudo -u "$APP_USER" -H bash -c "cd '$APP_DIR' && $*"; }

echo "==> Backing up database"
/usr/local/bin/$APP_NAME-backup || echo "(backup skipped)"

echo "==> Pulling $BRANCH"
PREV="$(as_app git rev-parse HEAD)"
as_app "git fetch origin '$BRANCH' && git checkout '$BRANCH' && git reset --hard 'origin/$BRANCH'"
NEW="$(as_app git rev-parse HEAD)"
echo "    $PREV -> $NEW"
as_app "git log --oneline '$PREV..$NEW' | head -20" || true

echo "==> Installing dependencies and building"
as_app "npm ci --no-audit --no-fund && npm run build"

# Pick up any changes to deploy scripts themselves.
install -m 755 "$APP_DIR/deploy/backup.sh" /usr/local/bin/$APP_NAME-backup
install -m 755 "$APP_DIR/deploy/deploy.sh" /usr/local/bin/$APP_NAME-deploy

echo "==> Restarting service"
systemctl restart "$APP_NAME"

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null; then
    echo "==> Deployed $NEW — healthy"
    exit 0
  fi
  sleep 1
done

echo "!! Health check failed. Recent logs:"
journalctl -u "$APP_NAME" -n 60 --no-pager
echo
echo "To roll back:  sudo -u $APP_USER git -C $APP_DIR reset --hard $PREV && cd $APP_DIR && sudo -u $APP_USER npm ci && sudo -u $APP_USER npm run build && systemctl restart $APP_NAME"
exit 1
