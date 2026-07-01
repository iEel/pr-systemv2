# Retention Policy

Last updated: 2026-07-01

This policy is a baseline for UAT and first production. Confirm final retention with finance, audit, and legal requirements before deleting controlled records.

## Principles

- Generated PR PDFs, signed documents, quotations, and audit logs are controlled business records.
- Do not delete controlled document files unless an approved retention policy exists.
- Keep SQL metadata and storage files consistent.
- Prefer archive/offline storage before deletion.

## Recommended Retention

| Data | Recommended Retention | Notes |
| --- | --- | --- |
| `PurchaseRequest` records | 7 years minimum | Includes generated snapshots and lifecycle status. |
| Generated PR PDFs | 7 years minimum | Stored under `storage/generated`. |
| Signed PDFs/scans | 7 years minimum | Stored under `storage/signed`. |
| Quotations/supporting files | 7 years minimum | Stored under `storage/quotations`. |
| Document templates | Keep all active plus archived history | Needed to prove what template was used. |
| Branch header/footer assets | Keep while referenced by active/issued documents | Do not remove assets referenced by historical PRs. |
| Audit logs | 7 years minimum | Required for document traceability. |
| Template preview PDFs | 180 days after template archive | Regenerable evidence, not the controlled PR document. |
| PDF QA artifacts | 180 days after UAT/release | Stored under `output/pdf-qa`. |
| PM2/nginx logs | 90 days online | Keep longer in centralized logging if available. |
| Daily backups | 30 days | Adjust after backup storage sizing. |
| Monthly backups | 12 months | Keep off-server. |
| Yearly backups | 7 years | Keep encrypted and access-controlled. |

## Cleanup Rules

Safe to automate after UAT approval:

- Old PM2/nginx logs through logrotate.
- `output/pdf-qa` artifacts older than the approved window.
- `storage/template-previews` for archived templates older than the approved window.

Do not automate without explicit approval:

- `storage/generated`
- `storage/signed`
- `storage/quotations`
- SQL `PurchaseRequest`
- SQL `AuditLog`
- SQL `DocumentTemplate`

## Storage Growth Watch

Monitor weekly:

```bash
du -sh /var/lib/it-pr-dms/storage/*
df -h
```

Raise an alert when disk usage reaches 80 percent.

## Deletion Procedure

Before deleting any controlled records:

1. Export affected SQL rows.
2. Export matching storage file list and SHA-256 hashes.
3. Get written approval from the business owner.
4. Take a fresh SQL and storage backup.
5. Delete in a test restore environment first.
6. Record the deletion in an operational log.
