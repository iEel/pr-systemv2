# Backup And Restore Runbook

Last updated: 2026-07-01

The system has two state stores that must stay consistent:

- SQL Server database `IT_PR_DMS`.
- Files under `storage/`, normally mounted as `/var/lib/it-pr-dms/storage` on Ubuntu.

Back up both.

## Backup Scope

SQL Server:

- All application tables.
- `_prisma_migrations`.
- Audit logs.

Storage:

- `storage/templates`
- `storage/generated`
- `storage/signed`
- `storage/quotations`
- `storage/template-previews`
- Any branch header/footer assets under storage.

Transient and review artifacts:

- `output/pdf-qa` is useful for UAT evidence, but not required to restore the live app.
- `node_modules`, `.next`, and dev logs are not backed up.

## SQL Server Backup

Run from a SQL Server admin context or a backup job:

```sql
BACKUP DATABASE [IT_PR_DMS]
TO DISK = N'D:\SQLBackups\IT_PR_DMS_full.bak'
WITH INIT, COMPRESSION, CHECKSUM, STATS = 10;
GO
```

Verify:

```sql
RESTORE VERIFYONLY
FROM DISK = N'D:\SQLBackups\IT_PR_DMS_full.bak'
WITH CHECKSUM;
GO
```

If using Linux tooling against a remote SQL Server, use `sqlcmd` with credentials from a secure secret store. Do not put passwords into shell history.

## Storage Backup

Recommended daily snapshot:

```bash
sudo mkdir -p /var/backups/it-pr-dms/storage
rsync -a --delete /var/lib/it-pr-dms/storage/ /var/backups/it-pr-dms/storage/latest/
tar -C /var/backups/it-pr-dms/storage -czf /var/backups/it-pr-dms/storage/storage-$(date +%Y%m%d-%H%M%S).tar.gz latest
```

For production, push backups to a second machine or managed backup target. A backup on the same disk is only a staging copy.

## Backup Schedule

Minimum:

- SQL full backup daily.
- SQL log or differential backups if point-in-time recovery is required.
- Storage backup daily.
- Off-server copy daily.
- Restore drill before production sign-off and after major storage changes.

## Restore Order

For a full restore to a replacement server:

1. Stop app writes.

```bash
pm2 stop it-pr-dms
sudo systemctl stop nginx
```

2. Restore SQL Server database.

```sql
RESTORE DATABASE [IT_PR_DMS]
FROM DISK = N'D:\SQLBackups\IT_PR_DMS_full.bak'
WITH REPLACE, RECOVERY, CHECKSUM, STATS = 10;
GO
```

3. Restore storage.

```bash
sudo mkdir -p /var/lib/it-pr-dms/storage
sudo tar -C /var/lib/it-pr-dms/storage -xzf /var/backups/it-pr-dms/storage/storage-YYYYMMDD-HHMMSS.tar.gz --strip-components=1
sudo chown -R $USER:$USER /var/lib/it-pr-dms/storage
```

4. Restore app release and `.env`.

```bash
ln -sfn /var/www/it-pr-dms/shared/.env /var/www/it-pr-dms/current/.env
ln -sfn /var/lib/it-pr-dms/storage /var/www/it-pr-dms/current/storage
```

5. Validate.

```bash
npx prisma migrate status
pm2 startOrReload /var/www/it-pr-dms/current/ecosystem.config.cjs --env production
sudo systemctl start nginx
```

6. Smoke test.

- Login.
- Open a known PR PDF.
- Download a quotation attachment.
- Open `/templates`.
- Generate a draft preview PDF.

## Consistency Notes

- SQL rows reference file paths in storage. Restoring SQL without matching storage can produce missing-file errors.
- Storage files without SQL metadata are not shown by the app.
- Prefer maintenance windows for full backups if storage is very active.
- For highest consistency, stop PM2 briefly during storage snapshot or use filesystem snapshots.
