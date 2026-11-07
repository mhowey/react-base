# Deploying to a CloudCone VPS

This sets up the app on a single VPS:

```
Internet ──443/80──▶ Caddy (automatic HTTPS) ──▶ 127.0.0.1:3000 Node app (systemd) ──▶ SQLite /var/lib/react-base/app.db
```

Everything is scripted in [`deploy/`](deploy/):

| File | Purpose |
|---|---|
| `setup-server.sh` | One-time bootstrap. Installs Node 22, Caddy, swap and the firewall, builds the app, and installs the systemd service, Caddy config and nightly backups. Safe to re-run. |
| `deploy.sh` | Updates the app: backs up the DB, pulls, runs `npm ci`, builds, restarts and health-checks. Installed as `react-base-deploy`. |
| `backup.sh` | Takes a consistent online SQLite backup and keeps 14 days. Installed as `react-base-backup` and runs every night at 03:17. |
| `react-base.service` | systemd unit with sandboxing. The app can only write to `/var/lib/react-base`. |
| `Caddyfile` | Reverse proxy with automatic Let's Encrypt certificates, gzip/zstd and HSTS. |

---

## 1. Create the VPS

In the CloudCone panel, **Deploy → Cloud Server**:

- **OS:** Ubuntu 24.04 or 22.04 (Debian 12 also works)
- **Size:** at least 1 GB RAM is recommended. 512 MB works because the script adds a 2 GB swap file, but builds will be slow.
- Note the server's **IPv4 address** and the **root password** (CloudCone emails it to you).

## 2. Point your domain at it

At your DNS provider, create an **A record**:

| Type | Name | Value |
|---|---|---|
| A | `news` (or `@` for the root domain) | your VPS IPv4 |

If you also want `www`, add a matching record and see [Serving www too](#serving-www-too).

Check it resolves before you continue, because Caddy can't get a certificate until it does:

```bash
dig +short news.example.com
```

## 3. Log in and secure SSH (recommended)

From your computer:

```bash
ssh root@YOUR_VPS_IP
```

Optionally, add your SSH key and turn off password login:

```bash
# on your computer
ssh-copy-id root@YOUR_VPS_IP
```

```bash
# on the server, after confirming key login works in a second terminal
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh
```

## 4. Run the setup script

On the server, as root:

```bash
curl -fsSL https://raw.githubusercontent.com/mhowey/react-base/main/deploy/setup-server.sh -o setup-server.sh
```

```bash
DOMAIN=news.example.com ADMIN_EMAILS=you@example.com bash setup-server.sh
```

The script takes about 3–6 minutes. It finishes with a health check and prints the next steps. Then open `https://news.example.com`.

> **Set `ADMIN_EMAILS`.** The dev login is turned off in production. If `ADMIN_EMAILS` is empty, the first person to sign in becomes admin.
>
> **Using a non-standard SSH port?** Pass `SSH_PORT=2222` (or whatever port you use) so the firewall doesn't lock you out.

## 5. Turn on sign-in providers

Users can only sign in through OAuth in production, so configure at least one provider. Edit `/srv/react-base/.env`:

```bash
nano /srv/react-base/.env
```

| Provider | Where to create credentials | Authorized redirect / callback URL |
|---|---|---|
| Google | console.cloud.google.com → APIs & Services → Credentials → OAuth client ID (Web) | `https://news.example.com/api/auth/google/callback` |
| GitHub | github.com/settings/developers → New OAuth App | `https://news.example.com/api/auth/github/callback` |
| Facebook | developers.facebook.com → My Apps → Facebook Login | `https://news.example.com/api/auth/facebook/callback` |

Then apply the change:

```bash
systemctl restart react-base
```

## 6. Deploying updates

Push to `main` on GitHub, then on the server run:

```bash
react-base-deploy
```

This backs up the database, resets the server's copy to `origin/main`, rebuilds, restarts and health-checks. If the health check fails, it prints the logs and the exact rollback command. To deploy a different branch: `BRANCH=my-branch react-base-deploy`.

Optional: deploy from your own machine in one line:

```bash
ssh root@YOUR_VPS_IP react-base-deploy
```

---

## Day-to-day operations

| Task | Command |
|---|---|
| App status | `systemctl status react-base` |
| Follow app logs | `journalctl -u react-base -f` |
| Follow Caddy / TLS logs | `journalctl -u caddy -f` |
| Restart after editing `.env` | `systemctl restart react-base` |
| Run a backup now | `react-base-backup` |
| List backups | `ls -lh /var/backups/react-base` |
| Open the database | `sqlite3 /var/lib/react-base/app.db` |

### Restore a backup

```bash
systemctl stop react-base
```

```bash
gunzip -c /var/backups/react-base/app-YYYYMMDD-HHMMSS.db.gz > /var/lib/react-base/app.db && rm -f /var/lib/react-base/app.db-wal /var/lib/react-base/app.db-shm && chown reactbase:reactbase /var/lib/react-base/app.db
```

```bash
systemctl start react-base
```

### Off-server backups

Backups in `/var/backups` won't survive the VPS being lost, so copy them somewhere else. The simplest option is from your computer:

```bash
rsync -av root@YOUR_VPS_IP:/var/backups/react-base/ ./react-base-backups/
```

For continuous replication to S3, Backblaze B2 or Cloudflare R2, consider [Litestream](https://litestream.io).

### Serving www too

Edit the first line of `/etc/caddy/Caddyfile` to `news.example.com, www.news.example.com {`, then:

```bash
systemctl reload caddy
```

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Browser shows a certificate error, or Caddy logs `challenge failed` | DNS doesn't point at the VPS yet, or ports 80/443 are blocked. Check `dig +short DOMAIN` and `ufw status`. Caddy retries automatically. |
| `502 Bad Gateway` | The app isn't running. Check `journalctl -u react-base -n 100`. |
| App exits with `Missing required environment variable` | `JWT_SECRET` or `COOKIE_SECRET` is empty in `/srv/react-base/.env`. |
| OAuth error `redirect_uri_mismatch` | The callback URL at the provider must exactly match `https://DOMAIN/api/auth/<provider>/callback`, and `APP_URL` in `.env` must be `https://DOMAIN` with no trailing slash. |
| Sign-in loops back to `/login?error=invalid_state` | The site was opened on a different host or over http. Always use the `https://DOMAIN` URL from `APP_URL`. |
| Build killed / `JavaScript heap out of memory` | Not enough RAM. Confirm swap is on with `swapon --show`, or resize the VPS. |
| News feeds empty | The server fetches RSS directly. Test from the VPS with `curl -I https://feeds.bbci.co.uk/news/world/rss.xml`. |
| Locked out by the firewall | Use CloudCone's **VNC console** in the panel, then `ufw allow <your ssh port>/tcp`. |

## Where things live

| Path | Contents |
|---|---|
| `/srv/react-base` | Code, `node_modules`, `dist/`, `.env` (mode 600) |
| `/var/lib/react-base/app.db` | SQLite database (WAL mode) |
| `/var/backups/react-base` | Nightly compressed backups |
| `/etc/systemd/system/react-base.service` | Service unit |
| `/etc/caddy/Caddyfile` | Reverse proxy config |
| `/etc/cron.d/react-base-backup` | Backup schedule |
