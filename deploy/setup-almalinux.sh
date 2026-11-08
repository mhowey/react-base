#!/usr/bin/env bash
# Prepare the app only: no Node upgrade, Apache edits, firewall changes or startup.
# DOMAIN=aggrex.howeyhost.com ADMIN_EMAILS=you@example.com bash deploy/setup-almalinux.sh
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${DOMAIN:?Set DOMAIN to the public hostname}"
ADMIN_EMAILS="${ADMIN_EMAILS:?Set ADMIN_EMAILS explicitly}"
[[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || fail "Invalid DOMAIN"
[[ "$ADMIN_EMAILS" =~ ^[a-zA-Z0-9@._+,-]+$ ]] || fail "Use comma-separated admin emails without spaces"
[[ "$APP_DIR" =~ ^/[a-zA-Z0-9/_.-]+$ ]] || fail "Checkout path must not contain spaces or shell metacharacters"
[ "$(id -u)" -eq 0 ] || fail "Run as root"
. /etc/os-release
[ "$ID" = almalinux ] || fail "This script supports AlmaLinux only"
command -v /usr/bin/node >/dev/null || fail "Install Node 24 at /usr/bin/node first"
/usr/bin/node -e 'if (Number(process.versions.node.split(".")[0]) !== 24) process.exit(1)' \
  || fail "Install Node 24 at /usr/bin/node first; the shared runtime is never upgraded automatically"
for tool in npm runuser openssl systemctl sqlite3; do
  command -v "$tool" >/dev/null || fail "Missing prerequisite: $tool (see deploy/ALMALINUX.md)"
done
if systemctl is-active --quiet aggrex; then
  fail "aggrex is active; use the documented backup/build/restart update procedure"
fi
/usr/bin/node --input-type=module -e '
  import net from "node:net";
  const server = net.createServer();
  server.on("error", () => process.exit(1));
  server.listen(3000, "127.0.0.1", () => server.close());
' || fail "Port 3000 is unavailable"

id aggrex >/dev/null 2>&1 || useradd --system --user-group --home-dir /nonexistent --shell /sbin/nologin aggrex
runuser -u aggrex -- test -r "$APP_DIR/package.json" \
  || fail "Grant aggrex read/traverse access to the checkout without exposing .env"

# Build as the checkout owner; never transfer checkout ownership to the service.
OWNER="$(stat -c %U "$APP_DIR")"
runuser -u "$OWNER" -- bash -c 'cd "$1" && npm ci --no-audit --no-fund && npm run typecheck && npm test && npm run build' bash "$APP_DIR"
runuser -u aggrex -- test -r "$APP_DIR/dist/server/index.js" \
  || fail "aggrex cannot read the generated server bundle"

install -d -m 0700 /etc/aggrex
if [ ! -e /etc/aggrex/aggrex.env ]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  COOKIE_SECRET="$(openssl rand -hex 32)"
  export JWT_SECRET COOKIE_SECRET
  (
    umask 077
    cat > /etc/aggrex/aggrex.env <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
APP_URL=https://$DOMAIN
DATABASE_PATH=/var/lib/aggrex/app.db
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
ADMIN_EMAILS=$ADMIN_EMAILS
ENABLE_DEV_LOGIN=false
SESSION_TTL_DAYS=7
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
EOF
  )
  unset JWT_SECRET COOKIE_SECRET
fi
chown root:root /etc/aggrex/aggrex.env
chmod 0600 /etc/aggrex/aggrex.env
sed "s|/opt/aggrex|$APP_DIR|g" "$APP_DIR/deploy/aggrex.service" > /etc/systemd/system/aggrex.service
systemctl daemon-reload
printf '%s\n' \
  "App built and service installed, but NOT started." \
  "Review /etc/aggrex/aggrex.env privately and configure OAuth before starting." \
  "Existing development data has NOT been migrated." \
  "Follow deploy/ALMALINUX.md to start the service and configure Apache."