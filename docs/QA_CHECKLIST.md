# QA Checklist

Last updated: 2026-07-15

Use this before handing work to another developer or preparing a release.

## Automated Checks

```bash
npm run typecheck
npm test
npm run build
npx prisma validate
```

PDF visual QA for representative generated/template-preview PDFs:

```bash
npm run pdf:qa -- --input storage/generated/ITPR_2606008.pdf --expected-pages 1
```

Optional security/dependency check:

```bash
npm audit
```

Expected:

- TypeScript has no errors.
- Vitest passes.
- Next production build succeeds.
- Prisma schema validates.
- Audit is clean or any findings are documented with a mitigation plan.

## Phase 5 Hardening Checks

- `ecosystem.config.cjs` points PM2 to `/var/www/it-pr-dms/current` and reads the Next.js listen port from `PORT` with `3000` as the default.
- `deploy/nginx/it-pr-dms.conf` has the correct `server_name`, upload cap, auth/upload/render rate limits, and proxy target port matching `PORT`.
- `docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md` has been followed in UAT.
- `docs/BACKUP_RESTORE.md` has been tested by restoring SQL Server and storage to a non-production target.
- `docs/OPERATIONS_RUNBOOK.md` daily and weekly checks are assigned to an owner.
- `docs/RETENTION_POLICY.md` is approved by the business owner before controlled files are deleted.
- PM2 startup is registered with systemd and `pm2 save` has been run.
- nginx config passes `sudo nginx -t`.
- `AUTH_SECRET` is a real production secret.
- AD/LDAP certificate trust is resolved before setting `LDAP_TLS_REJECT_UNAUTHORIZED=true`.
- Carbone failures return safe operational messages and do not expose long response bodies to users.

## Documentation Checks

- `DEVELOPER_HANDOFF.md` reflects the latest behavior, routes, key files, limitations, and next work.
- Relevant `docs/*.md` files are updated in the same change as code/UI/template/workflow edits.
- [DOCUMENT_GENERATION.md](DOCUMENT_GENERATION.md) is updated when Word/PDF template tags, amount formatting, header/footer rendering, Draft Preview, or Issue PR behavior changes.
- Historical files under `docs/superpowers/` are left intact unless the user explicitly asks to revise phase history.

## Annual Recurring PR Checks

- Create a schedule only from a source PR as `ADMIN` or `IT_ADMIN`; confirm `IT_USER` can view but cannot create, edit, pause/resume, or Retry.
- Confirm the schedule form snapshots Company, Branch, Department, Division, Category, Purpose, Purchase Method, Remark, VAT, and ordered Heading/Item/Detail rows. Confirm it does not carry PR/reference numbers, document state, generated snapshot, attachments, template selection, audit history, or cancellation/clone/reissue lineage.
- Configure an annual rule and confirm the displayed renewal and Draft dates use Asia/Bangkok calendar dates and `renewalDate - leadDays`; check a February 29 rule in a non-leap year resolves to February 28.
- Create an active schedule due today, run two `npm run recurring-pr:process` commands concurrently, and confirm exactly one run and one `DRAFT` for that schedule/year.
- Confirm the generated PR has `status = DRAFT`, `prNo = null`, the responsible active user as creator, worker-date document date, renewal-date required date, preserved item row types, and a run/schedule trace link. Confirm no Carbone render, controlled PDF, running-number allocation, or external notification occurs.
- Set an active schedule due yesterday and run the worker; confirm catch-up creates its one annual Draft and advances the next run date.
- Make a required reference or responsible user inactive, process the due schedule, and confirm one safe `FAILED` run, no Draft, derived `Needs attention`, and a System audit actor. Correct the data, use authorized Retry, and confirm the same run becomes `SUCCEEDED` with one Draft.
- Confirm a paused schedule is not processed. Confirm `Needs attention` is derived rather than stored as a third schedule status.
- Run the documented Ubuntu minimal-environment manual command and inspect `/var/log/it-pr-dms/recurring-pr.log`; confirm one safe JSON line and expected exit code (`0`, `2`, or `1`). Confirm the cron path uses `CRON_TZ=Asia/Bangkok` and `flock -n`.

## Authentication Smoke Test

- Anonymous visit to `/dashboard` redirects to `/login?callbackUrl=%2Fdashboard`.
- Anonymous visit to `/settings/users` redirects to `/login?callbackUrl=%2Fsettings%2Fusers` instead of returning a server error.
- Login with the local MVP admin account succeeds.
- Login with an allowlisted LDAP user such as `veerapon.l` succeeds when LDAP environment variables are configured and the SQL Server user row is active.
- Login with a valid AD username that is not allowlisted in SQL Server is rejected.
- Login with an inactive SQL Server LDAP user is rejected even if the AD password is correct.
- LDAP login rejects email/domain usernames and accepts short usernames only.
- Login username field is blank on initial render; it is not prefilled with `admin`.
- Login page does not show unsupported `Forgot password?` or language-switch controls.
- Login left panel uses the generated transparent `public/login-pr-illustration.png` hero asset and does not show decorative `Draft / Preview / Issue PR / Signed` stepper text.
- Topbar shows the authenticated user's display name and role.
- Logout returns the user to login state.
- Protected pages are not reachable anonymously.
- A signed-in user without an admin permission is redirected to `/forbidden` for the matching admin route.
- `/forbidden` shows the missing permission and a Back to Dashboard action.

## Browser Smoke Test

Check desktop and mobile.

Desktop:
- `/dashboard`
- `/pr`
- `/pr/new`
- `/pr/<draftId>`
- `/pr/<draftId>/edit`
- `/pr/<draftOrIssuedId>/upload-quotation`
- `/templates`
- `/masters/companies`
- `/masters/pr-categories`
- `/masters/budgets`
- `/settings/users`
- `/settings/running-numbers`
- Left sidebar remains pinned while page content scrolls, and long navigation lists scroll inside the sidebar.

Mobile:
- Sidebar opens and closes.
- Main navigation links work.
- PR table uses internal scroll without page-level horizontal overflow.
- Form fields remain readable.
- Sticky panels do not cover content.

## PR Draft Checks

- PR list search filters by PR number, company, branch, department, division, and creator.
- Company filter works.
- Branch filter works.
- Status filter works.
- Empty state appears when filters match no rows.
- PR list row Download opens `/pr/<id>/preview-pdf?download=1` for drafts.
- PR list row Download opens `/pr/<id>/pdf?download=1` for issued/generated records.
- PR list row More menu opens and shows lifecycle shortcuts that match the row status.
- PR list row More menu includes `Clone as Draft`.
- PR list row More menu includes `Upload Quotation` for Draft/Generated/Printed/Signed rows.
- PR Documents `Table | Board` switch preserves the same search/company/branch/status filters.
- PR Documents Board view shows active Draft, Generated, and Printed columns with clear counts and empty-column states.
- PR Documents Board view keeps Signed, Cancelled, and Reissued rows in the `Completed / Archived` tab section instead of mixing them into the active workflow.
- PR Documents Board view defaults the archive section to `Latest Signed` and caps the preview so large signed history does not create an excessively tall board.
- PR Documents Board cards show PR No., company/branch, date, total, creator, preview, clone, and next lifecycle action.
- PR Documents Board view is read-only for status movement; there is no drag-and-drop status change path.
- PR detail shows `Clone as Draft` for an existing PR.
- PR detail groups actions into `Next action`, `Review & files`, and `Danger zone`.
- PR detail `Next action` renders as a compact command strip in the summary header and does not dominate the document information area.
- PR detail does not show disabled Mark Printed or Upload Signed buttons for unavailable statuses.
- `/pr/new?cloneFrom=<sourceId>` opens the New PR form prefilled from the source PR without creating a new row yet.
- Clone as Draft resets Document Date to the current default date and leaves Required Date blank.
- Clone as Draft copies business fields and item rows but does not copy PR No., generated PDF, signed uploads, controlled status, or previous audit history.
- Saving a cloned PR creates a new `DRAFT` row with `prNo = null`, `clonedFromId = <sourceId>`, and `Draft cloned` audit metadata.
- New Draft cannot save without a category, and the server rejects inactive or unavailable category selections.
- Draft edit also requires an active category; legacy controlled PRs with null categories remain readable and previewable as `Not categorized`.
- Clone as Draft preserves an active source category.
- Create PR form loads companies, branches, departments, and divisions from SQL Server.
- Department and division default to IT where available.
- Acct can be blank.
- New PR item rows do not contain sample Description, Quantity, Unit Cost, or Acct values.
- New PR Remark does not contain sample text.
- PR item rows can be switched between `รายการ`, `หัวข้อ`, and `รายละเอียด`.
- Heading rows require only Description, do not require Qty or Unit Cost, and do not change subtotal/VAT/total.
- Detail rows can be added after a priced item, require only Description, do not require Qty or Unit Cost, and do not change subtotal/VAT/total.
- PR detail and PDF output number only priced item rows, leaving heading/detail row numbers and amount cells blank.
- PR item Description column is visibly wider than Acct, Qty, and Unit Cost on desktop create/edit forms.
- PR item Qty and Unit Cost inputs remain readable with sample values like `1000` and `100000.00`.
- PR item table does not show unnecessary horizontal scroll on desktop widths around 960px and wider.
- Unit Cost and Total Amount item-table cells show comma-separated numbers with two decimals and no currency prefix.
- Quantity, unit cost, subtotal, VAT, and total are calculated server-side after submit.
- Save Draft creates a `DRAFT` PR with `prNo = null`.
- Save Draft updates Budget Master `reservedAmount` when a matching active budget exists.
- Save Draft is still allowed when budget is missing or insufficient; audit metadata records the budget warning status.
- Edit Draft is available only for `DRAFT`.
- Update Draft replaces item rows, recalculates totals, and writes audit history.
- Update Draft adjusts the old budget reservation out and the new reservation in.
- Save & Preview creates a draft and redirects to `/pr/<draftId>/preview-pdf`.
- Update & Preview saves edited values and redirects to `/pr/<draftId>/preview-pdf`.

## Reports Checks

- Reports filter labels are readable in Thai/English mixed context.
- Active filter chips match the selected year, month, company, and status.
- Reset filters returns to `/reports`.
- Export Current View uses the same active filters as the on-screen tables.
- Budget health strip stays compact and does not duplicate the Dashboard layout.
- If PR used/pending amounts exist but no active Budget Master row matches the filters, Reports shows `ยังไม่มี Budget สำหรับมุมมองนี้`, links to `/masters/budgets`, and does not present a negative Remaining Budget as trustworthy.
- Monthly Summary is a compact table that fits the desktop summary column without using the wide PR Detail table layout.
- Status Summary is a compact distribution panel with badge, count, amount, and mini bar rows instead of a horizontally scrolling table.
- Monthly, status, and company summaries show mini bars without resizing rows unexpectedly.
- Monthly Summary numeric headers (`PR`, `Total`, `Used`, `Pending`) align with their numeric cells.
- Company / Branch Summary numeric headers (`PR Count`, `Total Amount`, `Used`) align with their numeric cells, and dates stay in the intended date column.
- PR Detail status values use semantic badges instead of plain text.
- Category labels appear in list, Board, and PR Detail; legacy null category labels read `Not categorized`.
- Category filter, category summary, and PR Detail category values use the same result set.
- XLSX export preserves the category filter, uses one Category column in PR Detail, and includes a By Category sheet.

## Draft Preview Checks

- Draft detail shows `Preview Draft` and `Download Preview` before issuing.
- Draft create/edit form shows `Save & Preview` / `Update & Preview`.
- `/pr/<draftId>/preview-pdf` returns `application/pdf` for authenticated users with permission.
- `/pr/<draftId>/preview-pdf?download=1` returns attachment disposition.
- Preview PDF shows `DRAFT PREVIEW` instead of an official PR number.
- Preview does not change PR status.
- Preview does not allocate a running number.
- Preview does not create a generated attachment.
- Preview reflects latest SQL Server draft data; use Save & Preview or Update & Preview when browser edits need to be rendered immediately.

## Issue PR And PDF Checks

- `Issue PR` is visible for draft records.
- Issue PR allocates the next `ITPR_YYMMNNN` number.
- Issue PR moves the PR total from Budget `reservedAmount` to `usedAmount` when a matching active budget exists.
- Issue PR is still allowed when budget is missing or insufficient; audit metadata records the budget warning status.
- Duplicate PR numbers are not created when existing PR numbers are ahead of `RunningNumberSetting.currentValue`.
- `generatedSnapshotJson` is stored.
- `GENERATED_PDF` attachment metadata is stored with file size, MIME type, path, and SHA-256 hash.
- Generated file exists under `storage/generated`.
- PR status becomes `Generated`.
- PR detail shows Preview PDF and Download PDF after issue.
- `/pr/<id>/pdf` returns inline `application/pdf`.
- `/pr/<id>/pdf?download=1` returns attachment disposition.

## Template Rendering Checks

- Active template is `PR_STANDARD` with `templateType = DOCX`.
- Header/footer images render from the selected branch profile.
- Amounts in the PDF show comma separators and two decimals.
- Remark text stays on the intended ruled lines through `remarkLine1` and `remarkLine2`.
- Remark Thai/English text uses the same visual font size and family as item-table text after PDF render.
- Purpose and purchase method checkbox cells show marks only for selected options.
- Item loop stays inside the item table.
- Heading rows in the item loop render as description-only grouping rows; following priced items keep continuous visible numbering.
- Detail rows in the item loop render as description-only continuation rows under the prior item; following priced items keep continuous visible numbering.
- Long remark text does not push the PR into an unintended second page.
- Optional `d.categoryCode` and `d.categoryName` render when a template references them; legacy null-category previews still render successfully.
- `npm run pdf:qa -- --input <pdf> --expected-pages 1` writes a `PASS` report for the representative PR PDF.
- `output/pdf-qa/<pdf-name>/page-1.png` is manually reviewed before UAT.
- `output/pdf-qa/<pdf-name>/report.md` checklist has no unresolved visual issues.

## Printed / Signed / Cancel / Reissue Checks

- Mark Printed is available only for `Generated`.
- Mark Printed sets `printedAt`, status `Printed`, and audit history.
- Upload Signed is available only for `Printed`.
- Upload accepts `.pdf`, `.jpg`, `.jpeg`, `.png`.
- Upload rejects unsupported extensions and files above 15 MB.
- Upload stores versioned signed attachment metadata and does not overwrite generated PDF.
- Cancel requires a reason for generated/printed/signed records.
- Reissue is available only for cancelled records.
- Reissue creates a replacement draft linked through `reissuedFromId`.
- Reissue auto-reuses an active source category. For a missing or inactive source category, the user must select an active category before the replacement Draft is created.
- Original generated/signed attachments remain available after cancel/reissue.

## Quotation / Supporting Attachment Checks

- Upload Quotation is available for Draft, Generated, Printed, and Signed PRs.
- Upload Quotation is not available for Cancelled or Reissued PRs.
- Upload accepts `.pdf`, `.jpg`, `.jpeg`, `.png`, `.docx`, and `.xlsx`.
- Upload rejects unsupported extensions, empty files, and files above 15 MB.
- Upload stores a versioned `QUOTATION` attachment under `storage/quotations`.
- Upload writes audit metadata with version, original file name, stored file name, and SHA-256 hash.
- Upload does not change PR status.
- PR detail Quotation card shows the latest file, version, upload timestamp, and download link.
- PR detail shows `Attach quotation` on the Quotation card when no quotation exists and the status allows upload.
- `/pr/<id>/attachments/<attachmentId>` downloads signed/quotation/supporting attachments with attachment disposition.

## Template Management Checks

- DOCX upload succeeds.
- XLSX upload succeeds.
- Unsupported template file types are rejected.
- Template validation extracts found tags from Office XML.
- Missing required and unknown tags are displayed.
- A template with missing required tags cannot be activated.
- Activating a DOCX does not archive the active XLSX with the same name.
- Activating an XLSX does not archive the active DOCX with the same name.
- Download original template returns the correct Office content type.
- DOCX rows show `Preview Template` after validation succeeds.
- Template preview stores a PDF under `storage/template-previews`.
- `/templates/<templateId>/preview` returns inline `application/pdf` after a passed preview.
- `/templates/<templateId>/preview?download=1` returns attachment disposition.
- Failed preview attempts show failed preview status and do not allow `PR_STANDARD DOCX` activation.
- `PR_STANDARD DOCX` cannot be activated until validation passes and preview status is passed.
- XLSX activation remains validation-only.
- Archive is available for draft/active templates and blocked for already archived templates.
- Template actions write audit records.

## Audit Log Checks

- `/audit-logs` loads for users with `AUDIT_VIEW`.
- Search, entity, action, actor, and date filters change the displayed rows.
- Active filter chips show the current search/entity/action/actor/date filters and each chip removes only its own filter.
- Export CSV link preserves the current filter query, excludes UI-only selected `eventId`, and explains whether the export is filtered plus the 1,000-row cap.
- `Inspect` on a row opens a selected-event panel while preserving the active filters.
- Closing the selected-event panel removes only `eventId` from the URL.
- Selected-event detail shows action, category, actor, target, structured metadata, IP address, and user agent.
- With a selected event open on a 1600px desktop viewport, the audit table does not need horizontal scrolling to reach `Inspect`.
- Long metadata values such as SHA-256 hashes wrap inside the selected-event panel instead of causing page-level horizontal overflow.
- `/audit-logs/export` returns `text/csv; charset=utf-8` with attachment disposition.
- CSV columns include date, action, entity type, entity id, actor, detail, metadata, IP address, and user agent.
- CSV opens in Excel with Thai/English text readable.
- Users without `AUDIT_VIEW` cannot access the audit list or export route.

## Reports And Dashboard Checks

- `/dashboard` budget cards use SQL Server aggregate values, not hardcoded static values.
- Dashboard monthly trend, company/branch ranking, and status snapshot reflect PR records for the current year.
- `/reports` loads without `ModulePage` shell copy.
- Reports filters preserve selected year, month, company, and status.
- Reports summary cards match the table totals for the selected filters.
- `Export XLSX` preserves the current filters.
- `/reports/export` returns `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with attachment disposition.
- Exported workbook includes Summary, By Month, By Company, By Status, By Category, and PR Detail sheets.
- Exported workbook Summary includes a `Budget Warning` row when Budget Master is missing for the selected report view.
- Thai/English mixed text opens correctly in Excel.

## Company / Branch Master Checks

- Company and branch rows are readable and grouped clearly.
- Add Company is available.
- Branch document profile fields can be edited.
- Header image can be uploaded and previewed.
- Footer image can be uploaded and previewed.
- Header/footer upload modal supports doing both assets without forcing a full page workflow reset.
- Remove deletes unreferenced branches or deactivates referenced branches.
- Deactivated branches do not appear as active choices for new PR drafts.

## PR Category Master Checks

- `/masters/pr-categories` requires `MASTER_DATA_MANAGE`; `IT_USER` cannot open the route.
- Admin can create, edit, deactivate, and reactivate a category.
- Category code cannot change after the category is referenced by a PR.
- Deactivate never deletes referenced category history and removes the category from new-Draft choices.
- Active categories appear in sort-order/name order for Draft create, Draft edit, and Reissue selection.

## Budget Master Checks

- `/masters/budgets` loads for users with `BUDGET_MANAGE`.
- Year and company filters preserve selected values.
- Include inactive shows inactive budget rows.
- Create Budget validates year, company, department, optional branch, and budget amount.
- Selecting a branch from another company is rejected.
- Duplicate year/company/branch/department scopes are rejected.
- Update Budget stores budget, used, and reserved amounts with two decimals.
- Deactivate removes the row from active Dashboard/Reports totals.
- Reactivate restores the row to active Dashboard/Reports totals.
- Budget create/update/deactivate/reactivate actions write `AuditLog` records with `entityType = Budget`.
- Users without `BUDGET_MANAGE` cannot mutate budgets.

## Admin Settings Checks

- `/settings/users` loads for users with `USER_MANAGE`.
- User search, role filter, and include-inactive controls preserve selected values.
- The user table appears before create-user fields in the default layout.
- Compact Role guide is available and describes the assignable SQL Server roles without pushing the user table below the fold.
- `New User` opens the create-user panel; closing it returns to the table-first view.
- Create User stores a hashed password and never renders password hashes.
- New User supports Local and AD/LDAP modes.
- AD/LDAP mode exposes `Verify AD User`, verifies a short username such as `veerapon.l`, then creates a SQL allowlist row with an `AD/LDAP` provider badge.
- Creating an LDAP user after changing the username requires verification again.
- LDAP user rows do not expose `Open password reset`; LDAP passwords are managed by AD.
- Unknown/non-local auth providers cannot be password-reset from the UI or server action.
- User rows default to read mode; `Edit profile` opens an expanded row form for display name, email, role, and active state.
- `Open password reset` opens an expanded row form with a visible reset target.
- Reset Password accepts passwords of at least 8 characters and requires a matching Confirm Password value.
- User create/update/password reset success or failure returns inline feedback on `/settings/users` instead of a raw server error page.
- The signed-in account shows a `Current session` badge.
- Role and active controls are locked in the UI for the signed-in account.
- The current admin cannot deactivate their own account.
- The current admin cannot change their own role.
- User create/update/password reset actions write `AuditLog` records with `entityType = User`.
- Users without `USER_MANAGE` cannot mutate users.
- `/settings/running-numbers` loads for users with `RUNNING_NUMBER_MANAGE`.
- Create Setting validates document type, prefix, year format, month format, padding, current value, and optional scope.
- Selecting a branch from another company is rejected.
- Duplicate document type/company/branch scopes are rejected.
- Update Setting changes prefix, year/month format, padding, and current value.
- Next Preview matches the Issue PR running-number formatter.
- Running-number create/update actions write `AuditLog` records with `entityType = RunningNumberSetting`.
- Users without `RUNNING_NUMBER_MANAGE` cannot mutate running-number settings.

## Accessibility Checks

- Keyboard can reach primary navigation and page actions.
- Focus ring is visible.
- Status labels are text-readable.
- Skip link appears on focus.
- Reduced-motion mode does not rely on animation.
- Text does not clip in Thai/English mixed labels.

## Visual Checks

- App does not look like a legacy government form.
- Login fits a desktop viewport cleanly.
- Login generated hero image blends into the navy panel without a visible rectangular image background.
- Navy shell is strong but does not flood the content area.
- Cards and tables use restrained borders and shadows.
- Buttons have clear hierarchy.
- No text overlaps on common desktop and mobile widths.
- No page-level horizontal overflow.

## Security Regression Checks

- Protected app pages redirect anonymous requests through the auth proxy before server component data loading.
- Route-level admin permission mapping is covered by `tests/auth-route-access.test.ts`.
- Generated PR PDF delivery requires `PR_GENERATE` before querying attachment metadata or reading storage.
- Signed/quotation/supporting attachment delivery requires `PR_GENERATE` before querying attachment metadata or reading storage.
- Template original file delivery requires `TEMPLATE_MANAGE` before querying template metadata or reading storage.
- Unauthorized file delivery requests return status-aware JSON errors instead of leaking files or falling through to server errors.
- LDAP configuration errors return generic login/admin UI failures and do not expose service-account credentials or bind details.

## Future QA Additions

- After Task 8 applies `000010_annual_recurring_pr`, run SQL Server integration coverage for a late recurring-worker transaction failure and concurrent cron/manual Retry claims; confirm rollback leaves no run, Draft, budget reservation, or audit rows and contention leaves exactly one annual run and Draft.
- Visual regression screenshots for generated PDFs.
- Browser automation for the full draft-preview-issue-print-sign lifecycle.
- Concurrency test for multiple users issuing PRs at the same time.
- Budget reservation and usage reconciliation tests.
- Production AD/LDAP service-account rotation and lockout monitoring drill.
- Production backup/restore drill.
