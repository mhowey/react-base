# AlmaLinux deployment with existing Apache
Use this route on the existing shared AlmaLinux server. Do not run
`setup-server.sh`: it targets fresh Debian/Ubuntu hosts and installs Caddy.
This route preserves Apache, certificates, firewalld, and unrelated sites.
## Prerequisites
The current checkout is `/var/www/aggrex/react-base`. Apache already has
`aggrex.howeyhost.com` HTTP and HTTPS virtual hosts and a Let's Encrypt certificate.
Confirm these assumptions on the target host before continuing.
Install Node 24 system-wide using a trusted RPM source appropriate to AlmaLinux.
Review other applications using Node before replacing the shared runtime.
The service needs `/usr/bin/node`; a root-only nvm installation will not work.
The currently installed Node 20 is unsupported by this project.
Install missing utilities using your normal package process:
```bash
dnf install gcc-c++ make python3 sqlite openssl util-linux curl git
/usr/bin/node --version
npm --version
```
Keep the existing Apache, Certbot, and mod_ssl installation. Do not introduce a
second proxy or expose port 3000. Preserve SSH access and allow HTTP/HTTPS in
the existing firewalld zone and any upstream firewall.
## Prepare the app
Commit or back up your changes first. The setup script builds the current
checkout as its owner (root for the current checkout), so dependency install
and build scripts run with that account's privileges. Prefer a dedicated
deployment account for ongoing operations. The service runs as `aggrex`.
From the checkout:
```bash
DOMAIN=aggrex.howeyhost.com ADMIN_EMAILS=you@example.com bash deploy/setup-almalinux.sh
```
The script requires Node 24, installs dependencies, runs typechecks/tests/build,
and installs the systemd service using the actual checkout path. It creates
root-only `/etc/aggrex/aggrex.env` only when absent, without displaying secrets.
It does not start the app, edit Apache/firewall settings, or upgrade Node.
It refuses setup while `aggrex` is active; use the update procedure below.
Ensure `aggrex` can traverse parent directories and read the checkout,
`node_modules`, `schema`, and `dist`. Do not make development `.env` files
world-readable. Production settings come from systemd's environment file,
not the development `.env`; existing environment values take precedence.
Edit `/etc/aggrex/aggrex.env` privately. Confirm the domain, admin emails, and
separate generated secrets. Add at least one OAuth provider and register its
exact callback, e.g. `https://aggrex.howeyhost.com/api/auth/google/callback`.
Production disables development login. See `deploy/README.md` for the current
OAuth email-verification limitation before enabling public sign-up.
Start and verify the service before changing public routing:
```bash
systemctl enable --now aggrex
systemctl status aggrex --no-pager
curl --fail http://127.0.0.1:3000/api/health
```
The service creates SQLite storage under `/var/lib/aggrex`. Existing
`data/app.db` is not migrated automatically. If it contains data to preserve,
stop its writers, take a consistent SQLite backup, and restore it with
`aggrex` ownership before the first production startup.
## Connect the existing HTTPS virtual host
Back up `/etc/httpd/conf.d/aggrex.howeyhost.com-le-ssl.conf` outside `conf.d`.
Check `httpd -M` lists `proxy_module`, `proxy_http_module`, `headers_module`,
and `ssl_module`.
Install the include:
```bash
install -m 0644 deploy/aggrex.apache.inc /etc/httpd/aggrex-proxy.inc
```
Inside the existing `<VirtualHost *:443>` for the Aggrex hostname, add:
```apache
Include /etc/httpd/aggrex-proxy.inc
```
Remove its obsolete `DocumentRoot /var/www/aggrex` and `<Directory>` block.
Keep certificate directives and logs. Keep the port 80 virtual host's HTTPS
redirect. Do not create a duplicate virtual host or replace other sites.
The proxy include disables inherited proxy rules and uses a location-scoped
mapping. This takes precedence over the server's global `/api` route to another
application; a virtual-host-level `ProxyPass /` alone did not isolate that route.
If SELinux is enforcing, allow Apache to connect to the upstream:
```bash
setsebool -P httpd_can_network_connect on
```
This boolean affects all Apache sites; review the policy change first.
Do not disable SELinux. Inspect audit denials for remaining permission issues.
SELinux was disabled on the inspected server, so no SELinux change is needed there.
Validate before reloading:
```bash
httpd -t && systemctl reload httpd
curl --fail https://aggrex.howeyhost.com/api/health
certbot renew --dry-run
```
Check public pages, feeds, login, and admin authorization. If routing fails,
restore the saved virtual host, validate, and reload Apache. For 502/503 errors,
inspect `journalctl -u aggrex -n 100 --no-pager` and Apache error logs.
## Backups and updates
Use SQLite online backup, not a plain copy of an active WAL database:
```bash
install -d -m 0700 /var/backups/aggrex
sqlite3 /var/lib/aggrex/app.db ".backup '/var/backups/aggrex/app-$(date -u +%Y%m%d-%H%M%S).db'"
chmod 0600 /var/backups/aggrex/*.db
```
Automate backups, rotate them, copy them off-server, and test restores.
Preserve `/etc/aggrex/aggrex.env` and `/var/lib/aggrex` across deployments.
The Debian `react-base-deploy` and `react-base-backup` helpers use different
paths; do not use them for this deployment.
After a verified backup, record the current Git revision. From the checkout,
as the deployment owner:
```bash
git pull --ff-only
npm ci
npm run typecheck
npm test
npm run build
systemctl restart aggrex
curl --fail http://127.0.0.1:3000/api/health
```
Use root privileges for systemctl if deploying as an unprivileged user.
In-place builds can briefly disrupt asset delivery; use staged releases if
uninterrupted updates are required. Roll back by rebuilding the recorded
revision. Restore database backups only with the service stopped and correct
ownership; schema changes may require a matching database rollback.