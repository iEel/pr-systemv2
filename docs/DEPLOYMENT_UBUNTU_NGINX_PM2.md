# Ubuntu + nginx + PM2 Deployment

Last updated: 2026-07-15

This runbook is the baseline deployment path for UAT and the first production release.

## Target Shape

```text
Browser / LAN
  -> nginx :80/:443
  -> Next.js production server on 127.0.0.1:${PORT:-3000}
  -> SQL Server IT_PR_DMS
  -> Carbone service
  -> persistent local storage
```

Use one PM2 instance first. The app writes document files under `storage/`, so multiple app instances require shared storage before scaling out.

## Ubuntu Packages

```bash
sudo apt update
sudo apt install -y nginx curl ca-certificates rsync logrotate
```

Install the supported system-wide Node.js LTS distribution so its executables are `/usr/local/bin/node` and `/usr/local/bin/npm`. Do not use a per-user nvm, Volta, or asdf installation for the application service user or cron. Verify the installation before continuing:

```bash
sudo test -x /usr/local/bin/node
sudo test -x /usr/local/bin/npm
sudo /usr/local/bin/npm install -g pm2
```

## Directory Layout

Recommended:

```text
/var/www/it-pr-dms/current          -> symlink to active release
/var/www/it-pr-dms/releases/<build> - app release directories
/var/www/it-pr-dms/shared/.env      - production secrets
/var/lib/it-pr-dms/storage      - persistent document storage
/var/lib/it-pr-dms/locks        - persistent recurring-worker locks
/var/backups/it-pr-dms          - local backup staging
/var/log/it-pr-dms              - PM2 app logs
```

Create folders:

```bash
sudo mkdir -p /var/www/it-pr-dms/releases /var/www/it-pr-dms/shared /var/lib/it-pr-dms/storage /var/lib/it-pr-dms/locks /var/backups/it-pr-dms /var/log/it-pr-dms
sudo chown -R $USER:$USER /var/www/it-pr-dms /var/lib/it-pr-dms /var/backups/it-pr-dms /var/log/it-pr-dms
```

Copy `.env` to:

```text
/var/www/it-pr-dms/shared/.env
```

Do not commit or paste real secrets into source control.

## Release Steps

From the built release directory:

```bash
npm ci
ln -sfn /var/www/it-pr-dms/shared/.env .env
rm -rf storage
ln -sfn /var/lib/it-pr-dms/storage storage
npx prisma generate
npx prisma migrate deploy
npm run build
```

Activate the release:

```bash
ln -sfn /var/www/it-pr-dms/releases/<build> /var/www/it-pr-dms/current
pm2 startOrReload /var/www/it-pr-dms/current/ecosystem.config.cjs --env production
pm2 save
```

Initial server boot setup:

```bash
pm2 startup systemd
# run the command printed by PM2
pm2 save
```

## nginx

Use the template:

```text
deploy/nginx/it-pr-dms.conf
```

Install:

```bash
sudo cp deploy/nginx/it-pr-dms.conf /etc/nginx/sites-available/it-pr-dms.conf
sudo ln -sfn /etc/nginx/sites-available/it-pr-dms.conf /etc/nginx/sites-enabled/it-pr-dms.conf
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name` and add TLS before production. For HTTPS, terminate TLS at nginx and keep PM2 bound to `127.0.0.1:<PORT>`.

If you change the app port, set `PORT` in `/var/www/it-pr-dms/shared/.env` and update the upstream server line in `deploy/nginx/it-pr-dms.conf` to the same port:

```text
PORT=3001
server 127.0.0.1:3001;
```

Then reload both services:

```bash
pm2 startOrReload /var/www/it-pr-dms/current/ecosystem.config.cjs --env production
sudo nginx -t
sudo systemctl reload nginx
```

## Production Environment Checklist

Required:

- `NODE_ENV=production`
- `PORT` is the local Next.js listen port; default is `3000`.
- `AUTH_SECRET` is a strong real secret.
- `SQLSERVER_*` values point to the intended instance and database.
- `CARBONE_URL`, `CARBONE_VERSION`, `CARBONE_CONVERTER`, and `CARBONE_TIMEOUT_MS` are set.
- `LDAP_ENABLED`, `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`, `LDAP_BASE_DN`, and `LDAP_TLS_REJECT_UNAUTHORIZED` are set for AD/LDAP.

Before production, prefer `LDAP_TLS_REJECT_UNAUTHORIZED=true` after Node.js trusts the internal AD certificate chain.

## Smoke Test

```bash
curl -I http://127.0.0.1:${PORT:-3000}/login
curl -I http://localhost/login
pm2 status it-pr-dms
pm2 logs it-pr-dms --lines 100
```

Browser checks:

- Login with local fallback admin.
- Verify AD user such as `veerapon.l`.
- Open `/dashboard`.
- Create a draft PR.
- Preview draft PDF.
- Issue PR through Carbone.
- Upload quotation.
- Export report XLSX.

## Recurring PR Worker

The recurring PR worker is a local cron command owned by the application service user (for example, `it-pr-dms`). It is not a PM2 process and has no public nginx route.

Create the persistent log and lock directories once, granting the application service user access. Do not use `/var/lock`: it is normally cleared during Ubuntu reboots.

```bash
sudo install -d -o it-pr-dms -g it-pr-dms /var/log/it-pr-dms
sudo install -d -o it-pr-dms -g it-pr-dms -m 0750 /var/lib/it-pr-dms/locks
```

Install this crontab as the application service user with `crontab -e`:

```cron
CRON_TZ=Asia/Bangkok
PATH=/usr/local/bin:/usr/bin:/bin
0 1 * * * cd /var/www/it-pr-dms/current && /usr/bin/flock -n /var/lib/it-pr-dms/locks/recurring-pr.lock /var/www/it-pr-dms/current/node_modules/.bin/tsx /var/www/it-pr-dms/current/scripts/process-recurring-pr.ts >> /var/log/it-pr-dms/recurring-pr.log 2>&1
```

The explicit `PATH` makes the local `tsx` shebang use the supported `/usr/local/bin/node`; the cron and manual commands use the same absolute local executable. `flock -n` makes the job single-run: a second invocation exits immediately while the active run retains the lock. The command loads the release `.env` through the `/var/www/it-pr-dms/current` symlink, writes one safe JSON result, and returns exit code `0` when every schedule is handled, `2` when an individual schedule fails, or `1` when the worker cannot start or complete. No raw errors, environment values, or secrets are logged by the CLI.

Run this deployment smoke check as the application user; it uses a cron-like minimal environment and must print exactly one JSON line with exit code `0`, `2`, or `1`:

```bash
sudo -u it-pr-dms env -i HOME=/var/lib/it-pr-dms NODE_ENV=production PATH=/usr/local/bin:/usr/bin:/bin /bin/sh -lc 'cd /var/www/it-pr-dms/current && /var/www/it-pr-dms/current/node_modules/.bin/tsx /var/www/it-pr-dms/current/scripts/process-recurring-pr.ts'
```

Verify lock concurrency before enabling cron. The second command must exit nonzero while the first holder is running:

```bash
sudo -u it-pr-dms /usr/bin/flock -n /var/lib/it-pr-dms/locks/recurring-pr.lock /bin/sh -c 'sleep 15' &
holder_pid=$!
sleep 1
sudo -u it-pr-dms /usr/bin/flock -n /var/lib/it-pr-dms/locks/recurring-pr.lock /bin/true
test $? -ne 0
wait "$holder_pid"
```

Configure logrotate for `/var/log/it-pr-dms/recurring-pr.log`; use the retention period in `RETENTION_POLICY.md`:

```conf
/var/log/it-pr-dms/recurring-pr.log {
  daily
  rotate 90
  compress
  missingok
  notifempty
  create 0640 it-pr-dms it-pr-dms
}
```

Do not add an nginx location or public HTTP route for this worker.

## Rollback

Rollback swaps the active symlink and reloads PM2:

```bash
ln -sfn /var/www/it-pr-dms/releases/<previous-build> /var/www/it-pr-dms/current
pm2 startOrReload /var/www/it-pr-dms/current/ecosystem.config.cjs --env production
pm2 save
```

If the database migration changed schema in a non-backward-compatible way, use the backup/restore runbook instead of a simple app rollback.

## References

- Next.js self-hosting: https://nextjs.org/docs/app/guides/self-hosting
- PM2 startup scripts: https://pm2.keymetrics.io/docs/usage/startup/
- nginx request rate limiting: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
