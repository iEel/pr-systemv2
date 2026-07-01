# Ubuntu + nginx + PM2 Deployment

Last updated: 2026-07-01

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

Install Node.js LTS and PM2 using your server standard. Example:

```bash
npm install -g pm2
```

## Directory Layout

Recommended:

```text
/opt/it-pr-dms/current          -> symlink to active release
/opt/it-pr-dms/releases/<build> - app release directories
/opt/it-pr-dms/shared/.env      - production secrets
/var/lib/it-pr-dms/storage      - persistent document storage
/var/backups/it-pr-dms          - local backup staging
/var/log/it-pr-dms              - PM2 app logs
```

Create folders:

```bash
sudo mkdir -p /opt/it-pr-dms/releases /opt/it-pr-dms/shared /var/lib/it-pr-dms/storage /var/backups/it-pr-dms /var/log/it-pr-dms
sudo chown -R $USER:$USER /opt/it-pr-dms /var/lib/it-pr-dms /var/backups/it-pr-dms /var/log/it-pr-dms
```

Copy `.env` to:

```text
/opt/it-pr-dms/shared/.env
```

Do not commit or paste real secrets into source control.

## Release Steps

From the built release directory:

```bash
npm ci
ln -sfn /opt/it-pr-dms/shared/.env .env
rm -rf storage
ln -sfn /var/lib/it-pr-dms/storage storage
npx prisma generate
npx prisma migrate deploy
npm run build
```

Activate the release:

```bash
ln -sfn /opt/it-pr-dms/releases/<build> /opt/it-pr-dms/current
pm2 startOrReload /opt/it-pr-dms/current/ecosystem.config.cjs --env production
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

If you change the app port, set `PORT` in `/opt/it-pr-dms/shared/.env` and update the upstream server line in `deploy/nginx/it-pr-dms.conf` to the same port:

```text
PORT=3001
server 127.0.0.1:3001;
```

Then reload both services:

```bash
pm2 startOrReload /opt/it-pr-dms/current/ecosystem.config.cjs --env production
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

## Rollback

Rollback swaps the active symlink and reloads PM2:

```bash
ln -sfn /opt/it-pr-dms/releases/<previous-build> /opt/it-pr-dms/current
pm2 startOrReload /opt/it-pr-dms/current/ecosystem.config.cjs --env production
pm2 save
```

If the database migration changed schema in a non-backward-compatible way, use the backup/restore runbook instead of a simple app rollback.

## References

- Next.js self-hosting: https://nextjs.org/docs/app/guides/self-hosting
- PM2 startup scripts: https://pm2.keymetrics.io/docs/usage/startup/
- nginx request rate limiting: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
