# Operations Runbook

Last updated: 2026-07-01

This is the minimum operating procedure for UAT and first production.

## Daily Checks

```bash
pm2 status it-pr-dms
pm2 logs it-pr-dms --lines 100
sudo tail -n 100 /var/log/nginx/it-pr-dms.error.log
df -h
du -sh /var/lib/it-pr-dms/storage
```

Check in the app:

- `/dashboard` loads.
- `/settings/users` loads for admin.
- `/templates` lists the active `PR_STANDARD DOCX`.
- A draft preview can render through Carbone.

## Weekly Checks

- Confirm SQL Server backup job completed.
- Confirm storage backup completed.
- Restore a backup to a non-production location at least once before production sign-off.
- Review PM2 memory restarts.
- Review nginx 4xx/5xx spikes.
- Review disk growth under `storage/generated`, `storage/signed`, `storage/quotations`, and `storage/template-previews`.

## Logs

PM2:

```bash
pm2 logs it-pr-dms
pm2 describe it-pr-dms
```

nginx:

```bash
sudo tail -f /var/log/nginx/it-pr-dms.access.log
sudo tail -f /var/log/nginx/it-pr-dms.error.log
```

SQL Server:

- Review failed login spikes.
- Review migration history in `_prisma_migrations`.
- Review database backup history.

App audit:

- Use `/audit-logs`.
- Export CSV from the current filter when investigating document events.

## Monitoring Signals

Minimum alerts:

- App process down or repeatedly restarting.
- nginx 5xx rate above normal.
- Disk usage above 80 percent on the storage volume.
- SQL Server connection failures.
- Carbone render failures or timeouts.
- LDAP bind failures after a credential/certificate change.
- Backup job missing or failed.

## Rate Limiting

Baseline nginx rate limits are in:

```text
deploy/nginx/it-pr-dms.conf
```

Important limits:

- Auth routes: `it_pr_login`
- Upload routes: `it_pr_upload`
- PDF/template preview routes: `it_pr_render`
- General app traffic: `it_pr_app`

If users report false positives during UAT, increase burst values before increasing sustained rates.

## Upload And Render Limits

Current app limits:

- Quotation/support uploads: 15 MB.
- Signed upload: 15 MB.
- Template upload: 10 MB.
- nginx `client_max_body_size`: 25 MB.
- Carbone timeout: `CARBONE_TIMEOUT_MS`, recommended 60000 to 120000.

Keep nginx upload limit above app limits so the app can return friendly validation messages.

## Carbone Incident Handling

Symptoms:

- Draft preview fails.
- Issue PR fails before status becomes `GENERATED`.
- Template preview shows failed preview status.

Immediate checks:

```bash
curl -I "$CARBONE_URL"
pm2 logs it-pr-dms --lines 200
sudo tail -n 200 /var/log/nginx/it-pr-dms.error.log
```

Important behavior:

- Draft preview failures do not mutate PR status.
- Issue PR renders before final `GENERATED` status and generated attachment metadata are committed.
- Template preview failures are stored as failed preview metadata and block `PR_STANDARD DOCX` activation.
- Carbone client errors are classified as config, HTTP, network, or timeout without exposing long response bodies to users.

Response:

1. Check whether `CARBONE_URL` is reachable from the app server.
2. Check whether Carbone can convert a known-good DOCX.
3. If failures started after a template upload, render the previous active template.
4. If failures are timeout-only, raise `CARBONE_TIMEOUT_MS` temporarily and investigate Carbone load.
5. Do not manually mark PRs as generated unless the generated file and attachment metadata exist.

## Deployment Guardrails

Before deploy:

```bash
npm test
npm run typecheck
npx prisma validate
npm run build
```

Before production schema changes:

- Confirm SQL backup exists.
- Confirm storage backup exists.
- Run `npx prisma migrate status`.
- Run migration first in UAT.

After deploy:

- Run smoke tests from `DEPLOYMENT_UBUNTU_NGINX_PM2.md`.
- Check `/audit-logs` for unexpected errors.
