# Deploy Aggrex to a CloudCone VPS

This guide assumes an Ubuntu/Debian VPS with systemd, a sudo-capable deployment
user, and the repository available via Git. It installs the existing Express
application behind Nginx; Netlify is not needed. Adjust the steps for another
Linux distribution or an existing web server. These are instructions for the
VPS, not commands run automatically by this repository.

## 1. Prepare DNS and the server

- Point the `aggrex.howeyhost.com` A record to the VPS's public IPv4 address.
  Add an AAAA record only if the VPS has working public IPv6. Remove any stale
  records. Wait for the records to resolve before requesting a certificate.
- Permit TCP 80 and 443 in CloudCone's firewall and the VPS firewall. Preserve
  SSH access before changing firewall settings. Do not expose port 3000.
- Install Git, Nginx, Certbot with its Nginx plugin, SQLite CLI, and Node.js 24
  LTS with npm. Build tools may be needed if the native `better-sqlite3` module
  has to compile. Use a trusted Node package source appropriate to the VPS;
  confirm `/usr/bin/node --version` is Node 24 and `npm --version` works.
  The systemd unit uses `/usr/bin/node`, not a per-user nvm installation.

For Ubuntu/Debian, after configuring an appropriate Node 24 package source:

```bash
sudo apt update
sudo apt install git nginx certbot python3-certbot-nginx sqlite3 build-essential nodejs
/usr/bin/node --version
npm --version
```

The app and `better-sqlite3` require Node 22 or later; the test/build toolchain
has stricter version constraints. Node 24 LTS is the recommended common target.

## 2. Install and build the app

Make sure your latest changes are committed and pushed, then replace the clone
URL below with your repository's actual URL. The account performing updates
owns the checkout; the separate, unprivileged service account only reads it.

```bash
sudo useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin aggrex
sudo mkdir -p /opt/aggrex
sudo chown "$(id -u):$(id -g)" /opt/aggrex
git clone <YOUR_REPOSITORY_URL> /opt/aggrex
cd /opt/aggrex
npm ci
npm run typecheck
npm test
npm run build
```

Use a private repository deploy key if needed. Do not copy a macOS
`node_modules` directory to the Linux VPS: the SQLite dependency is native.
The Node service must be able to read `/opt/aggrex`, its parent directories,
the generated `dist/` files, dependencies, and `schema/app-schema.json`.

## 3. Configure the service

Create an environment file readable only by root. systemd reads this file
before starting the unprivileged app process; it must not be committed.

```bash
sudo install -d -m 0700 /etc/aggrex
sudo install -m 0600 deploy/aggrex.env.example /etc/aggrex/aggrex.env
sudo nano /etc/aggrex/aggrex.env
```

Generate **two different** random secrets on the VPS and paste them into
`JWT_SECRET` and `COOKIE_SECRET` in the protected file. Run this command twice:

```bash
openssl rand -hex 32
```

Confirm `APP_URL=https://aggrex.howeyhost.com`, `HOST=127.0.0.1`, `PORT=3000`,
`DATABASE_PATH=/var/lib/aggrex/app.db`, and your intended `ADMIN_EMAILS`. Change
the Nginx upstream if changing the port. An explicit admin list prevents an
unrelated first registrant from automatically receiving admin rights. Existing
admins are not demoted by changing this list. Development login is disabled in
production regardless of `ENABLE_DEV_LOGIN`.

To enable account sign-in, configure at least one provider's client ID and
secret in the environment file and register its exact callback URL:

- Google: `https://aggrex.howeyhost.com/api/auth/google/callback`
- Facebook: `https://aggrex.howeyhost.com/api/auth/facebook/callback`
- GitHub: `https://aggrex.howeyhost.com/api/auth/github/callback`

Without OAuth credentials, public reading works, but nobody can sign in or
access admin features. Use provider accounts and email addresses you trust.
Keep secrets private and never paste them into tickets or commit them to Git.

**Security limitation:** The current OAuth integration links accounts and
grants configured admin roles by the email returned in a provider profile; it
does not independently verify every provider's email-verification status.
Review and harden this behavior before enabling public sign-up or relying on
email-based account linking for production security. An admin allowlist alone
does not resolve unverified provider emails.

Install and start the service:

```bash
sudo install -m 0644 deploy/aggrex.service /etc/systemd/system/aggrex.service
sudo systemctl daemon-reload
sudo systemctl enable --now aggrex
sudo systemctl status aggrex --no-pager
curl -fsS http://127.0.0.1:3000/api/health
```

The unit creates `/var/lib/aggrex` for persistent SQLite data and runs the
app as the `aggrex` service account. It restricts writes outside that state
directory. Check logs with `sudo journalctl -u aggrex -n 100 --no-pager`.

## 4. Set up HTTPS

Install the provided Nginx site. Review it first if other sites already use this
VPS; do not overwrite an existing configuration with the same name.

```bash
sudo install -m 0644 deploy/aggrex.nginx.conf /etc/nginx/sites-available/aggrex
sudo ln -s /etc/nginx/sites-available/aggrex /etc/nginx/sites-enabled/aggrex
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d aggrex.howeyhost.com
sudo certbot renew --dry-run
```

Choose the HTTPS redirect when prompted, and verify your Certbot installation's
renewal timer or scheduled job is enabled. The site must be publicly reachable
on port 80 for HTTP-01 validation. If using a CDN or additional reverse proxy,
review trusted proxy settings and HTTPS forwarding separately.

Visit `https://aggrex.howeyhost.com` and check:

- `/api/health` returns `{"ok":true}` and `/api/news` returns feed data.
- `/sitemap.xml` uses the HTTPS hostname.
- Sign in with a configured provider, confirm your admin role, and test saved
  sources. Confirm an ordinary account cannot access `/admin/data`.
- Verify images and live feeds from the VPS; external feeds can be unavailable.

## 5. Updates and backups

Before updating, make a database backup using SQLite's online backup API. WAL
mode is enabled, so copying only the active `.db` file is not a safe backup.
For example:

```bash
sudo -u aggrex sqlite3 /var/lib/aggrex/app.db ".backup '/var/lib/aggrex/app-backup.db'"
```

Copy the backup securely to separate storage with restricted access; automate,
rotate, and regularly test restores. Preserve `/var/lib/aggrex` and
`/etc/aggrex/aggrex.env` across deployments and do not run `npm run db:reset`
on the VPS. For restore, stop the service first and restore a verified SQLite
backup together with appropriate ownership and permissions.

To deploy a new committed revision from your configured branch:

```bash
cd /opt/aggrex
git pull --ff-only
npm ci
npm run typecheck
npm test
npm run build
sudo systemctl restart aggrex
sudo systemctl status aggrex --no-pager
curl -fsS http://127.0.0.1:3000/api/health
```

If the service or Nginx configuration changes, reinstall the appropriate file,
run `sudo systemctl daemon-reload` or `sudo nginx -t` respectively, and restart
or reload the affected service. Test upgrades and backups before applying them
to production.