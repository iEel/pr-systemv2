# Developer Handoff

Last updated: 2026-07-15

## Project Summary

IT PR Document Management System is an internal Next.js app for creating, cloning, previewing, issuing, printing, signing, cancelling, reissuing, and auditing IT Purchase Request documents.

The app is no longer only a frontend shell. It now uses SQL Server through Prisma, Auth.js credentials login with SQL Server roles, AD/LDAP Search + Bind for allowlisted directory users, server actions for document commands, local/network-style file storage under `storage/`, and Carbone for DOCX to PDF rendering.

Product and visual direction are documented in [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md).

## Current Implementation Status

Completed:
- Next.js App Router, TypeScript, Tailwind CSS, and focused Vitest tests.
- Modern premium app shell with sticky desktop sidebar, mobile drawer navigation, topbar, responsive navigation, premium generated-image login UI, and protected app pages.
- Premium login page uses a generated transparent IT PR document-control hero illustration in the navy left panel, keeps the form-first mobile order, and intentionally omits trust badges, language switching, password recovery, and decorative status stepper text.
- SQL Server database `IT_PR_DMS` on the `ALPHA` instance, Prisma schema/migration/seed, and Prisma Client through `@prisma/adapter-mssql`.
- Auth.js Credentials provider backed by SQL Server `User`; SQL Server `User.role` is the RBAC source of truth.
- Auth.js JWT/session encryption expects a stable `AUTH_SECRET` in each `.env`; stale browser cookies from an old secret cause `JWTSessionError: no matching decryption secret` until cookies are cleared and the app is restarted with the intended secret.
- AD/LDAP Search + Bind is implemented for short usernames such as `veerapon.l`; LDAP proves identity, while SQL Server remains the SQL allowlist, active/inactive switch, and role source.
- Local seeded admin remains an explicit fallback account with `authProvider = LOCAL` and password `admin123`.
- Auth hardening proxy protects app routes before server components load: anonymous users redirect to `/login?callbackUrl=...`, and authenticated users without route-level admin permissions redirect to `/forbidden`.
- DB-backed PR list, dashboard recent PR embed, PR detail, draft create, and draft edit.
- PR Category Master is complete: seven active categories are seeded through migration and development seed, `/masters/pr-categories` provides `MASTER_DATA_MANAGE` CRUD with audit history, and referenced categories are deactivated instead of deleted.
- Every new or edited Draft requires an active category on the server. The SQL relation remains nullable so legacy controlled PRs without a category stay readable, renderable, and display `Not categorized`.
- Clone preserves its source category. Reissue automatically reuses an active source category; for a missing or inactive source category, the user must choose an active category before the replacement Draft is created.
- PR Documents now supports `Table | Board` views on the same filtered page. Table keeps the dense list workflow; Board groups active Draft/Generated/Printed workflow rows separately from Completed/Archived Signed/Cancelled/Reissued rows, with read-only quick actions and no drag-and-drop status mutation.
- PR Documents row actions now use real links: detail, draft/generated PDF download, and a More menu with lifecycle shortcuts including Upload Quotation.
- PR Detail is now a command center with clear `Next action`, `Review & files`, and `Danger zone` groups instead of inactive lifecycle buttons.
- Server-side PR totals, validation, and audit events for draft create/update.
- PR item rows support `ITEM`, `HEADING`, and `DETAIL`: headings are non-priced grouping rows, details are non-priced continuation rows under the prior item, both require only Description, persist zero numeric values, do not affect totals/budget, and render with blank visible numbering/amounts while priced rows keep continuous item numbers.
- Draft form supports `Save & Preview` / `Update & Preview`, which persists the draft and immediately redirects to the temporary PDF preview.
- Clone PR is implemented as `Clone as Draft`: `/pr/new?cloneFrom=<id>` opens a prefilled New PR form, resets document date to today, clears required date, does not copy PR number/PDF/signed files/audit history, and writes `clonedFromId` plus `Draft cloned` audit metadata only after the user saves.
- Active `PR_STANDARD` DOCX template rendering through Carbone with PDF output.
- Branch/company document profile fields, including legal name, tax ID, address, Ref No., and uploaded header/footer images.
- Header/footer image upload, preview, replace, and remove flows in `/masters/companies`.
- DOCX template patching before render so branch header/footer images replace placeholder images in the Word file.
- Branch header/footer baseline images under `storage/company-assets/<branchId>/header|footer` are source-controlled so fresh clones can render the known document profiles.
- Draft Preview PDF flow that renders a temporary PDF without assigning a PR number or changing status.
- Official Issue PR flow that assigns the PR number, stores snapshot JSON, writes generated PDF metadata/hash, and moves the PR to `GENERATED`.
- PDF preview/download route for issued generated documents, guarded by `PR_GENERATE` and status-aware JSON error handling.
- Quotation/supporting attachment upload for Draft/Generated/Printed/Signed PRs, with 15 MB PDF/JPG/PNG/DOCX/XLSX validation, versioned `QUOTATION` metadata, SHA-256 hash, audit history, and guarded attachment download route.
- PDF Visual QA utility for generated PR PDFs and template preview PDFs, including PNG page render artifacts and Markdown checklist output.
- Mark Printed, signed document upload, Cancel, and Reissue workflows with audit history.
- Template Management for DOCX/XLSX uploads, tag extraction, validation, DOCX preview render QA, activation, archive, and `TEMPLATE_MANAGE`-guarded original file download.
- DB-backed Audit Logs investigation console with permission guard, filters, active filter chips, category badges, inspectable selected-event detail panel, structured metadata, entity links, latest-event table, desktop-safe Inspect column, and wrapped long hash metadata.
- Audit Log CSV export from the current filter set through `/audit-logs/export`; the UI now labels filtered export scope and the 1,000-row cap, and output remains UTF-8 BOM CSV for Excel compatibility.
- SQL Server-backed Dashboard budget/PR aggregates using shared reporting helpers.
- SQL Server-backed Reports console as a filter-driven export workspace with active filter chips, compact budget health strip, no-budget warning state, mini bars, status badges, aligned/glanceable Monthly/Status/Company summaries, PR detail rows, and `.xlsx` export through `/reports/export`.
- Reports now avoid misleading negative Remaining Budget when no active Budget Master row matches the current view; the page links users to `/masters/budgets`, and the XLSX Summary sheet includes a budget warning row.
- SQL Server-backed Budget Master CRUD at `/masters/budgets`, including create, inline update, deactivate/reactivate, `BUDGET_MANAGE`, and audit events.
- Soft Budget tracking is wired into the PR lifecycle without blocking work: Draft create/edit adjusts `reservedAmount`, Issue PR moves reserved to `usedAmount`, Cancel reverses used budget, and Reissue reserves the replacement draft when a matching active Budget row exists.
- SQL Server-backed Users/Roles admin at `/settings/users`, including table-first user management, Local vs AD/LDAP New User modes, Verify AD User, provider badges, compact role guide, expandable New User panel, row-expanded profile edit, confirmation-gated local password reset, current-session self-protection UI, inline action feedback, `USER_MANAGE`, and audit events.
- SQL Server-backed Running Number Settings admin at `/settings/running-numbers`, including create, update, next-number preview, `RUNNING_NUMBER_MANAGE`, and audit events.
- Phase 5 baseline hardening runbooks and deployment scaffolds for Ubuntu, nginx, PM2, backup/restore, monitoring, rate limiting, retention, and Carbone incidents.
- Carbone client errors are now classified as config, HTTP, network, or timeout with safe user-facing messages instead of leaking long render response bodies.
- Source-control hygiene is set for GitHub publishing: environment files, build output, local QA captures, and generated runtime document storage are ignored, while seed templates under `storage/templates/` and branch header/footer baselines under `storage/company-assets/` remain tracked for tests and first-run setup.
- Login hero asset `public/login-pr-illustration.png` is a generated transparent project asset and should remain tracked with the UI.
- Ubuntu/nginx/PM2 deployment uses `/var/www/it-pr-dms/current` as the active release path, with runtime document storage kept outside the web root at `/var/lib/it-pr-dms/storage`.
- App listen port is documented as `PORT=3000` in `.env.example`; PM2 loads `.env` before starting Next.js, and nginx upstream must be kept in sync when changing ports.
- Production UI copy no longer labels the connected app as Phase 1 sample data; PR list filtering now uses `lib/pr-filters.ts` instead of `lib/sample-data.ts`.

Not done yet:
- Budget is soft-controlled and auditable, but PR creation/issuance is intentionally not blocked by missing or insufficient budget.
- Production hardening still needs a real UAT restore drill, TLS certificates, centralized monitoring/log aggregation, and production sign-off.

## Documentation Discipline

After any create/edit work that changes behavior, workflow, data model, document templates, PDF output, UI flows, environment setup, or operational assumptions, update the relevant handoff/docs in the same change.

Minimum expectation:
- Update `DEVELOPER_HANDOFF.md` when the current system status, route map, key files, workflow, or next work changes.
- Update the relevant `docs/*.md` file for the changed area.
- Update [docs/DOCUMENT_GENERATION.md](docs/DOCUMENT_GENERATION.md) when PR Word/PDF templates, Carbone tags, amount formatting, header/footer rendering, draft preview, or Issue PR behavior changes.
- Update [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md) when verification steps or user-facing workflows change.
- Do not rewrite historical plan/spec files under `docs/superpowers/` unless explicitly asked; those are phase history.

## Quick Start

```bash
npm install
npm run dev -- --port 3000
```

Open:

```text
http://localhost:3000
```

MVP local admin login:

```text
username: admin
password: admin123
```

AD/LDAP login is available when LDAP environment variables are configured and the user has been allowlisted in SQL Server through `/settings/users`:

```text
username: veerapon.l
password: <AD password>
```

Do not commit real `.env` secrets.

Local/UAT session note:
- Set a stable `AUTH_SECRET` in `.env` before shared testing.
- After changing `AUTH_SECRET`, restart Next.js/PM2 and clear old Auth.js cookies for the app host before signing in again.

Verification commands:

```bash
npm run typecheck
npm test
npm run build
npx prisma validate
npm run pdf:qa -- --input storage/generated/ITPR_2606008.pdf --expected-pages 1
```

Latest verified result on 2026-07-03 after PR Documents Board archive refinement:
- `/pr` now has a client-side `Table | Board` switch. Existing search/company/branch/status filters feed both views.
- Board view groups active workflow rows into Draft, Generated, and Printed columns.
- Completed/Archived groups Signed, Cancelled, and Reissued into tabs below the active board; it defaults to Latest Signed and caps the archive preview to keep large signed history from stretching the workflow board.
- Status movement remains read-only through explicit lifecycle links rather than drag-and-drop mutation.
- Board cards expose PR No., company/branch, document date, total, creator, preview, clone, and next lifecycle action.
- `npm test -- tests/pr-list-actions.test.ts`: passed, 1 file / 3 tests.
- `npm run typecheck`: passed.
- `npm test`: passed, 50 files / 254 tests.
- `npm run build`: passed.
- Local HTTP smoke: `http://localhost:3000/pr` returned `307`, confirming the running dev server and auth proxy are active.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Latest verified result on 2026-07-02 after PR item detail rows:
- Added migration `000008_purchase_request_item_detail_row_type`; the `IT_PR_DMS` database on `alpha` is up to date with 8 migrations and the `PurchaseRequestItem.rowType` check constraint now allows `ITEM`, `HEADING`, and `DETAIL`.
- Create/edit/clone/reissue flows preserve row type. `DETAIL` rows require only Description, store zero numeric values, do not affect totals or soft budget tracking, and render as description-only continuation rows with blank visible item number/amount cells.
- Document payload item rows now expose `d.items[i].isDetail`; detail descriptions are prefixed with `- ` for the current `PR_STANDARD` template while following priced items keep continuous visible numbering.
- `npm test -- tests/pr-draft.test.ts tests/pr-generate.test.ts tests/pr-form-workflow-copy.test.ts tests/purchase-request-detail.test.ts`: passed, 4 files / 34 tests.
- `npm test -- tests/template-management.test.ts`: passed, 1 file / 19 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npx prisma migrate deploy`: applied `000008_purchase_request_item_detail_row_type`.
- `npx prisma migrate status`: database schema is up to date with 8 migrations.
- `npm test`: passed, 50 files / 253 tests.
- `npm run build`: passed.
- `git diff --check`: passed with Windows LF/CRLF warnings only.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Latest verified result on 2026-07-02 after premium generated Login hero update:
- `npm test -- tests/login-page-copy.test.ts`: passed, 1 file / 2 tests.
- `npm test`: passed, 50 files / 246 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- `git diff --check`: passed with Windows LF/CRLF warnings only.
- Chrome visual smoke on `/login`: desktop 1366x768 fits one viewport with no horizontal overflow; mobile 390x844 keeps the login form before the hero panel; username starts blank; unsupported `Forgot password?` and language switch controls remain hidden; decorative `Draft / Preview / Issue PR / Signed` stepper text is absent.
- Generated asset `public/login-pr-illustration.png` is a transparent PNG cutout created for this project and used by `app/login/page.tsx`.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Latest user-verified result on 2026-07-02 after PR template Remark font normalization:
- Active `storage/templates/PR_STANDARD_V1.docx` was updated so the Remark tag runs use the same font family/size treatment as the PR item table.
- User tested the PR preview/PDF output and confirmed the Remark Thai/English font-size mismatch is resolved.

Latest operational note on 2026-07-02 after Auth.js JWTSessionError investigation:
- Local `.env` was missing `AUTH_SECRET`; a stable local value was added without exposing the secret.
- `.env.example` now includes an `AUTH_SECRET` placeholder.
- `docs/SETUP.md` documents the `no matching decryption secret` recovery path: keep `AUTH_SECRET` stable, restart the app after changes, clear old Auth.js cookies, and sign in again.

Latest verified result on 2026-07-02 after PR item heading rows:
- Added `PurchaseRequestItem.rowType` through migration `000007_purchase_request_item_row_type`; the `IT_PR_DMS` database on `alpha` now has non-null `rowType` plus an `ITEM` / `HEADING` check constraint.
- Create/edit/clone/reissue flows preserve heading rows. Heading rows require only Description, store zero numeric values, do not affect totals or budget calculations, and render blank visible item number/amount cells.
- `npm test -- tests/pr-draft.test.ts tests/pr-generate.test.ts tests/pr-form-workflow-copy.test.ts tests/purchase-request-detail.test.ts tests/phase5-hardening-docs.test.ts`: passed, 5 files / 36 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npx prisma migrate status`: database schema is up to date with 7 migrations.
- `npm test`: passed, 50 files / 250 tests.
- `npm run build`: passed.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after AD/LDAP Search + Bind implementation:
- Task 6 subagent reviews: spec compliant and quality review found no Critical/Important issues.
- `npm test -- tests/ldap-schema-env.test.ts tests/ldap-utils.test.ts tests/ldap-provider.test.ts tests/auth-local-provider.test.ts tests/auth-credentials-provider.test.ts tests/user-management.test.ts tests/user-management-ldap.test.ts tests/admin-settings-page-copy.test.ts tests/docs-ldap.test.ts`: passed, 9 files / 66 tests.
- `npm test`: passed, 48 files / 237 tests.
- `npm run typecheck`: passed.
- `npx prisma generate`: passed after stopping the local Next dev server that had locked the Prisma query engine DLL.
- `npx prisma migrate deploy`: applied `000006_user_auth_provider` successfully to SQL Server `IT_PR_DMS` on the `alpha` instance after marking the initial failed attempt rolled back and changing index creation to deferred dynamic SQL.
- `npx prisma migrate status`: database schema is up to date.
- `npx prisma validate`: passed.
- `npm run build`: passed and includes `/settings/users` plus existing protected app routes in the route manifest.
- HTTP smoke on restarted dev server `http://localhost:3000`: `/login` returned 200, had no `admin` prefill, no `Forgot password?`, and no language switch; Auth.js credentials login with `admin/admin123` succeeded; `/settings/users?createUser=1&createAuthProvider=LDAP` returned 200 and contained `AD/LDAP` plus `Verify AD User`.
- LDAP service-account search smoke for `veerapon.l` passed with `ldaps://10.10.100.2:636`, `LDAP_TLS_REJECT_UNAUTHORIZED=false`, service bind OK, one search result, DN present, external id present, display name present, and email present.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Latest verified result on 2026-07-01 after GitHub source-control hygiene and Phase 5 baseline hardening docs/config:
- `npm test -- tests/carbone-client.test.ts tests/carbone-config.test.ts`: passed, 2 files / 7 tests.
- `npm test -- tests/phase5-hardening-docs.test.ts`: added regression coverage for the Ubuntu/nginx/PM2 runbooks and config scaffold; pass after docs index updates.
- `npm test -- tests/carbone-client.test.ts tests/carbone-config.test.ts tests/phase5-hardening-docs.test.ts tests/template-management.test.ts tests/pr-generate.test.ts`: passed, 5 files / 40 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm test`: passed, 50 files / 244 tests.
- `npm run build`: passed.
- Added `ecosystem.config.cjs` for PM2 and `deploy/nginx/it-pr-dms.conf` for nginx reverse proxy, upload limits, render route timeouts, and baseline rate limits.
- Added `docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md`, `docs/OPERATIONS_RUNBOOK.md`, `docs/BACKUP_RESTORE.md`, and `docs/RETENTION_POLICY.md`.
- Added GitHub-safe `.gitignore` coverage for local QA captures, build output, environment files, and runtime document storage; `.env.example` and `docs/DATABASE.md` use placeholder host values instead of private network details.
- Added `PORT=3000` to `.env.example`, wired PM2 to load `.env` before reading the port, and documented the nginx upstream sync step for custom ports.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after PR Detail compact Next Action polish:
- `npm test -- tests/pr-detail-command-center.test.ts`: passed after red/green coverage for compact command strip classes.
- `npm test`: passed, 42 files / 186 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- Chrome visual check on `/pr/cmqza65qj001pt9pwxyp7uw96`: `Next action` now renders as a compact command strip with shorter copy and a smaller action button, no longer a tall callout dominating the document information area.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after PR Detail command center and Quotation Upload implementation:
- `npm test -- tests/auth-permissions.test.ts tests/pr-document-control.test.ts tests/file-delivery-security.test.ts tests/pr-list-actions.test.ts tests/pr-detail-command-center.test.ts`: passed after red/green coverage for `PR_UPLOAD_ATTACHMENT`, quotation validation/storage paths, attachment delivery guard, PR row Upload Quotation action, and PR Detail command grouping.
- `npm test`: passed, 42 files / 185 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed and included `/pr/[id]/upload-quotation` plus `/pr/[id]/attachments/[attachmentId]` in the route manifest.
- Playwright CLI smoke on the running local dev server: logged in as `admin`, opened `/pr/cmqza65qj001pt9pwxyp7uw96`, confirmed `next action`, `review & files`, `danger zone`, and `upload quotation`; opened `/pr/cmqza65qj001pt9pwxyp7uw96/upload-quotation`, confirmed `upload quotation` and `versioning rule`; final console warning/error query returned zero messages.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after Clone PR implementation:
- `npm test -- tests/pr-draft.test.ts tests/pr-list-actions.test.ts tests/pr-form-workflow-copy.test.ts`: passed after red/green coverage for clone source mapping, `clonedFromId` create payload, form hidden source identity, and PR list Clone action.
- `npx prisma generate`: passed after stopping the local dev server that had locked the Prisma query engine DLL.
- `npx prisma migrate deploy`: applied `000005_purchase_request_clone_source` successfully to SQL Server `IT_PR_DMS`.
- `npm test`: passed, 41 files / 179 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- HTTP session smoke on `/pr/new?cloneFrom=cmqza65qj001pt9pwxyp7uw96`: Auth.js credentials login returned a session redirect, clone page returned `200`, page contained `Clone Purchase Request`, hidden `cloneSourceId`, `Save Draft`, and visible `Cloned from ITPR_2606008` banner content.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after Login control cleanup:
- `npm test -- tests/login-page-copy.test.ts`: passed, 1 file / 1 test after red/green coverage for blank username and hidden unsupported login controls.
- `npm test`: passed, 41 files / 175 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- Isolated Chrome browser smoke on `/login`: username value was blank, `Forgot password?` count was `0`, and `ไทย (TH)` language button count was `0`.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after Sticky Desktop Sidebar polish:
- `npm test -- tests/app-sidebar-copy.test.ts`: passed, 1 file / 2 tests after red/green regression coverage for sticky desktop navigation and internal nav scrolling.
- `npm test`: passed, 40 files / 174 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- Chrome browser smoke on the user's open localhost tab: after reload and page scroll, sidebar computed `position=sticky`, top stayed at `0`, height matched the viewport, and page-level horizontal overflow stayed false.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after Audit Log responsive table/hash overflow polish:
- `npm test -- tests/audit-logs-page-export.test.ts`: passed, 1 file / 3 tests after red/green regression coverage for desktop Inspect visibility and metadata wrapping.
- `npm test`: passed, 40 files / 173 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- Chrome browser smoke on the user's open `/audit-logs?eventId=...` tab at 1600px: after reload, `pageHasHorizontalOverflow=false`, audit table `hasHorizontalOverflow=false`, first `Inspect` link was visible in the viewport, and SHA-256 metadata code measured `scrollWidth == clientWidth`.
- Known warning remains: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

Previous verified result on 2026-06-30 after Budget Soft Reservation:
- `npm test -- tests/budget-tracking.test.ts tests/pr-draft.test.ts tests/pr-generate.test.ts tests/pr-document-control.test.ts`: passed, 4 files / 36 tests.
- `npm test`: passed, 40 files / 167 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed.
- `npm run build`: passed.
- Soft budget lifecycle tracking now reserves draft totals, moves issued totals from reserved to used, reverses used budget on cancel, and reserves replacement drafts on reissue without blocking missing or over-budget PRs.

Previous verified result on 2026-06-30 after Running Number React key warning fix:
- `npm test -- tests/admin-settings-page-copy.test.ts tests/budget-master-page-copy.test.ts`: passed, 2 files / 7 tests.
- `npm test`: passed, 39 files / 160 tests.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Playwright browser smoke: logged in as `admin`, opened `/settings/running-numbers` and `/masters/budgets`; both pages reported `0` console errors and `0` console warnings after navigation.
- Fixed stable React row keys on Running Number Settings and Budget Master table rows to prevent `<tbody>` list key warnings.

Previous verified result on 2026-06-30 after Auth Hardening proxy:
- `npm test -- tests/auth-route-access.test.ts tests/auth-proxy-source.test.ts`: passed, 2 files / 5 tests.
- `npm test -- tests/admin-settings-page-copy.test.ts tests/user-management.test.ts`: passed previously, 2 files / 10 tests.
- `npm test`: passed, 39 files / 158 tests.
- `npm run typecheck`: passed.
- `npx prisma validate`: passed; Prisma 7.8.0 update notice remains non-blocking.
- `npm run build`: passed with `proxy.ts` using the Next.js 16 request proxy convention.
- Anonymous HTTP smoke for `/settings/users`: now returns `307` to `/login?callbackUrl=%2Fsettings%2Fusers`.
- Anonymous HTTP smoke for `/dashboard`: now returns `307` to `/login?callbackUrl=%2Fdashboard`.
- Anonymous HTTP smoke for `/masters/budgets`: now returns `307` to `/login?callbackUrl=%2Fmasters%2Fbudgets`.
- Low-role live browser smoke for `/forbidden` is still pending; current coverage is helper/source tests because the local seeded user is admin.
- Previous Reports focused test: `tests/reports-page.test.ts` covers Reports table alignment/no-budget behavior.
- Previous PR list action focused test: `tests/pr-list-actions.test.ts` covers PR Documents action links and More menu URL generation.
- Previous file-delivery security regression: `tests/file-delivery-security.test.ts` covers generated PDF and template original download permission guards.
- Previous PDF QA smoke on `storage/generated/ITPR_2606008.pdf`: passed; wrote `output/pdf-qa/ITPR_2606008/report.md`, `report.json`, and one rendered PNG.
- Previous manual Carbone sample render with `storage/templates/PR_STANDARD_V1.docx`: returned `application/pdf`, 234,143 bytes, `%PDF` header.
- Known warning: Prisma/MSSQL emits Node `DEP0123` when TLS `ServerName` is an IP address; current commands still pass.

## Main Routes

| Route | Purpose | Main Source |
| --- | --- | --- |
| `/` | Entry redirect/home | `app/page.tsx` |
| `/login` | Auth.js credentials login UI | `app/login/page.tsx` |
| `/forbidden` | Friendly authenticated 403 page for route-level permission denials | `app/forbidden/page.tsx`, `lib/auth/route-access.ts`, `proxy.ts` |
| `/dashboard` | SQL Server budget/PR aggregate dashboard with recent PR embed | `app/dashboard/page.tsx`, `lib/reporting.ts` |
| `/pr` | DB-backed PR Documents table/board view, search, filters | `app/pr/page.tsx`, `components/pr/PRList.tsx` |
| `/pr/new` | Create draft PR; optional `?cloneFrom=<id>` pre-fills a Clone as Draft form | `app/pr/new/page.tsx`, `components/pr/PRForm.tsx` |
| `/pr/[id]` | PR detail and lifecycle command center | `app/pr/[id]/page.tsx`, `components/pr/PRDetail.tsx` |
| `/pr/[id]/edit` | Edit draft PR only | `app/pr/[id]/edit/page.tsx` |
| `/pr/[id]/preview-pdf` | Temporary draft PDF preview/download | `app/pr/[id]/preview-pdf/route.ts` |
| `/pr/[id]/pdf` | Issued generated PDF preview/download guarded by `PR_GENERATE` | `app/pr/[id]/pdf/route.ts` |
| `/pr/[id]/cancel` | Cancel controlled PR with reason | `app/pr/[id]/cancel/page.tsx` |
| `/pr/[id]/upload-signed` | Upload signed PDF/scan for printed PR | `app/pr/[id]/upload-signed/page.tsx` |
| `/pr/[id]/upload-quotation` | Upload versioned quotation/support files for draft/generated/printed/signed PRs | `app/pr/[id]/upload-quotation/page.tsx`, `components/pr/QuotationUpload.tsx` |
| `/pr/[id]/attachments/[attachmentId]` | Download signed/quotation/support attachments guarded by `PR_GENERATE` | `app/pr/[id]/attachments/[attachmentId]/route.ts` |
| `/templates` | DOCX/XLSX template management | `app/templates/page.tsx` |
| `/templates/[id]/file` | Download original template file guarded by `TEMPLATE_MANAGE` | `app/templates/[id]/file/route.ts` |
| `/templates/[id]/preview` | Inline/download rendered template preview PDF | `app/templates/[id]/preview/route.ts` |
| `/masters/companies` | Company/branch document profile, header/footer assets | `app/masters/companies/page.tsx` |
| `/masters/companies/assets/[branchId]/[assetType]` | Header/footer image preview | `app/masters/companies/assets/[branchId]/[assetType]/route.ts` |
| `/masters/pr-categories` | PR Category Master CRUD, active-state management, and audit history | `app/masters/pr-categories/page.tsx`, `lib/pr-category-master.ts` |
| `/masters/budgets` | SQL Server Budget Master CRUD for yearly IT budget rows | `app/masters/budgets/page.tsx`, `lib/budget-master.ts` |
| `/reports` | SQL Server PR reports with filters, no-budget warning state, and XLSX export link | `app/reports/page.tsx`, `lib/reporting.ts` |
| `/reports/export` | Filter-preserving PR report XLSX download, including a Summary warning row when Budget Master is missing for the view | `app/reports/export/route.ts`, `lib/xlsx.ts`, `lib/reporting.ts` |
| `/settings/users` | SQL Server Users/Roles admin with Local and AD/LDAP user creation, Verify AD User, provider badges, table-first layout, expandable New User panel, compact role guide, row-expanded edit/reset, self-protection, and inline feedback | `app/settings/users/page.tsx`, `app/settings/users/actions.ts`, `lib/user-management.ts` |
| `/settings/running-numbers` | SQL Server running-number settings admin with next-number preview | `app/settings/running-numbers/page.tsx`, `lib/running-number-settings.ts` |
| `/audit-logs` | DB-backed audit log investigation console with filters, active filter chips, category badges, selected-event detail panel, and CSV export scope copy | `app/audit-logs/page.tsx`, `lib/audit-logs.ts` |
| `/audit-logs/export` | Filter-preserving Audit Log CSV download | `app/audit-logs/export/route.ts`, `lib/audit-logs.ts` |

## Key Files

| File | Notes |
| --- | --- |
| `prisma/schema.prisma` | SQL Server data model. |
| `prisma/seed.mjs` | Idempotent seed for users, companies, branches, templates, PR records, attachments, and audit logs. |
| `lib/prisma.ts` | Prisma Client with SQL Server adapter. |
| `lib/auth/*` | Auth.js config, local credentials, LDAP Search + Bind provider/config/utils, current-user helpers, and RBAC permission checks. |
| `lib/carbone-client.ts` | Carbone render client with timeout handling and safe typed operational errors. |
| `lib/auth/route-access.ts` | Proxy-safe protected-route and permission mapping helpers. |
| `proxy.ts` | JWT route gate for protected app routes and route-level permission redirects. |
| `lib/pr-form-defaults.ts` | Client-safe default values for the PR form; do not import Prisma-backed modules into client components for simple defaults. |
| `lib/pr-filters.ts` | Client-safe PR list filtering helper shared by DB-backed list views and tests. |
| `lib/pr-list-actions.ts` | Client-safe PR list action URL builder for detail, clone-as-draft, download, preview, edit, upload quotation, upload signed, cancel, and reissue-from-detail shortcuts. |
| `lib/pr-submit-intent.ts` | Reads draft form submit intent and maps save vs preview redirects. |
| `lib/pr-draft.ts` | Draft create/update/clone-source parsing, validation, totals, and transactions. |
| `lib/pr-category-master.ts` | PR category parsing, permission-guarded CRUD, active-state changes, and audit events. |
| `lib/pr-generate.ts` | Running number allocation, Carbone payload, draft preview, Issue PR, DOCX image patching, and PDF output. |
| `lib/pr-document-control.ts` | Permission-guarded PDF/attachment delivery, mark printed, quotation upload, signed upload, cancel, and reissue commands. |
| `lib/pdf-visual-qa.ts` | PDF QA report helpers for signature, size, page count, rendered page evidence, and Markdown checklist. |
| `lib/template-management.ts` | DOCX/XLSX upload, tag extraction, validation, DOCX preview render QA, activation guard, archive, and permission-guarded template file delivery. |
| `lib/company-master.ts` | Company/branch master edit and header/footer asset management. |
| `lib/budget-master.ts` | Budget master filter parsing, amount normalization, SQL Server CRUD, active-state commands, and audit events. |
| `lib/budget-tracking.ts` | Soft budget matching, reserved/used adjustment math, and transaction helpers for PR lifecycle budget tracking. |
| `lib/user-management.ts` | SQL Server user admin filters, Local/LDAP create flows, LDAP verification, edit/reset URL state, role validation/description helpers, create/update, confirmation-gated local password reset, self-protection, and audit events. |
| `lib/running-number-settings.ts` | Running-number setting validation, scope checks, next-number preview, create/update, and audit events. |
| `lib/reporting.ts` | Dashboard/report filters, aggregates, active filter chip helpers, report bar helpers, workbook sheet mapping, and SQL Server reporting queries. |
| `lib/audit-logs.ts` | Audit log filters, SQL Server queries, metadata parsing, event taxonomy, active filter chips, inspect/close URLs, and CSV serialization. |
| `lib/xlsx.ts` | Minimal Office Open XML workbook writer backed by `jszip`. |
| `components/pr/PRForm.tsx` | Create/edit/clone draft UI with Save Draft, Save & Preview, Update Draft, Update & Preview, and hidden clone source identity. |
| `components/pr/PRDetail.tsx` | PR command center with Next action, Review & files, attachment cards, Danger zone, and timeline. |
| `components/pr/QuotationUpload.tsx` | Drag/drop upload UI for versioned quotation/support attachments. |
| `scripts/pdf-visual-qa.mjs` | CLI for `npm run pdf:qa`, Poppler page rendering, and QA report artifact writing. |
| `ecosystem.config.cjs` | PM2 production process scaffold for Ubuntu deployment. |
| `deploy/nginx/it-pr-dms.conf` | nginx reverse proxy scaffold with upload size, rate limit, and render timeout baseline. |
| `public/login-pr-illustration.png` | Generated transparent login hero asset for the IT PR document workflow. |
| `storage/templates/PR_STANDARD_V1.docx` | Active PR Word template used for official PDF generation. |
| `tests/*` | Focused unit tests for PR payloads, document control, templates, auth/RBAC, company master, and route helpers. |

## Document Generation Rules

- Draft Preview:
  - Route: `/pr/[id]/preview-pdf`.
  - Allowed only for `DRAFT`.
  - Uses active `PR_STANDARD DOCX`.
  - Uses PR number text `DRAFT PREVIEW`.
  - Does not update status, running number, `generatedSnapshotJson`, attachment records, or audit logs.
  - File name pattern: `PR_DRAFT_PREVIEW_<draftId>.pdf`.
- Issue PR:
  - Button label in UI: `Issue PR`.
  - Allowed only for `DRAFT`.
  - Allocates `ITPR_YYMMNNN` inside a transaction after checking existing PR numbers.
  - Stores immutable `generatedSnapshotJson`, generated file, hash, template id, attachment metadata, and `Generated PDF` audit event.
  - Moves status to `GENERATED`.
- Generated PDF Delivery:
  - Route: `/pr/[id]/pdf`.
  - Download route: `/pr/[id]/pdf?download=1`.
  - Permission: `PR_GENERATE`.
  - Authorization failures return status-aware JSON before querying attachment metadata or reading storage.
- Quotation / Support Attachments:
  - Upload route: `/pr/[id]/upload-quotation`.
  - Download route: `/pr/[id]/attachments/[attachmentId]`.
  - Upload permission: `PR_UPLOAD_ATTACHMENT`.
  - Download permission: `PR_GENERATE`.
  - Allowed statuses: Draft, Generated, Printed, Signed.
  - Rejected statuses: Cancelled and Reissued.
  - Accepted files: PDF, JPG/JPEG, PNG, DOCX, XLSX up to 15 MB.
  - Files are stored under `storage/quotations` as versioned `QUOTATION` attachments and do not change PR status.
- Editing:
  - Draft PRs remain editable through `/pr/[id]/edit`.
  - Generated/Printed/Signed records are controlled records. Use Cancel/Reissue instead of mutating issued documents.
  - Use `Save & Preview` or `Update & Preview` to persist current browser form values and immediately render `/pr/[id]/preview-pdf`.
- Clone as Draft:
  - Entry points: PR Detail `Clone as Draft` and PR Documents row More menu.
  - Route: `/pr/new?cloneFrom=<sourceId>`.
  - Opens the normal New PR form with copied business fields and line items; no new record is created until Save Draft or Save & Preview.
  - Resets document date to the current default date and clears required date.
  - Does not copy PR number, generated PDF, signed uploads, template snapshot, status, or audit history.
  - Saved cloned drafts store `PurchaseRequest.clonedFromId` and write `Draft cloned` audit metadata.
- PDF Visual QA:
  - Command: `npm run pdf:qa -- --input <pdf-path> --expected-pages <n>`.
  - Uses Poppler `pdftoppm` when available to render page PNGs.
  - Writes `report.json`, `report.md`, and `page-*.png` under `output/pdf-qa/<pdf-file-base>/`.
  - Latest smoke artifact: `output/pdf-qa/ITPR_2606008/report.md` with `page-1.png`.
- Template Preview:
  - Route: `/templates/[id]/preview`.
  - Download route: `/templates/[id]/preview?download=1`.
  - Permission: `TEMPLATE_MANAGE`.
  - Renders selected DOCX template versions with sample PR payload and PR number text `TEMPLATE PREVIEW`.
  - Writes preview PDFs under `storage/template-previews`.
  - Stores preview pass/fail metadata inside `DocumentTemplate.validationJson`.
  - `PR_STANDARD DOCX` activation now requires tag validation and a passed template preview.
- Template Original Download:
  - Route: `/templates/[id]/file`.
  - Permission: `TEMPLATE_MANAGE`.
  - Authorization failures return status-aware JSON before querying template metadata or reading storage.

## Template Contract Notes

See [docs/DOCUMENT_GENERATION.md](docs/DOCUMENT_GENERATION.md) for the full render contract.

Important current tags:
- Monetary display fields should use `d.items[i].unitCostFormatted`, `d.items[i].totalAmountFormatted`, `d.subtotalFormatted`, `d.vatAmountFormatted`, and `d.totalAmountFormatted`.
- Item loop rows expose `d.items[i].rowType`, `d.items[i].isHeading`, `d.items[i].isDetail`, and `d.items[i].itemNo`; `d.items[i].lineNo` is blank for heading/detail rows and numbered only for priced item rows.
- Remark rows should use `d.remarkLine1` and `d.remarkLine2` for the two ruled lines in the Word template.
- Purpose/purchase method checkbox cells should use precomputed mark tags such as `d.purposeNewMark`, `d.purposeRepairMark`, `d.purchaseByProcurementMark`, and `d.purchaseSelfMark`.
- Header/footer image placeholders are detected by image alt text containing `{d.companyHeaderImage}` and `{d.companyFooterImage}`.
- Template upload supports both DOCX and XLSX, but official PR PDF generation uses the active `PR_STANDARD` `DOCX`.
- XLSX templates still use validation-only activation; rendered PDF template preview is DOCX-only.

## UI Formatting Notes

- PR item table amount columns (`Unit Cost`, `Total Amount`) display plain numeric values with comma separators and two decimals, without a currency prefix.
- PR create/edit item table has row modes: `รายการ` requires Qty/Unit Cost and affects totals; `หัวข้อ` and `รายละเอียด` require only Description and show blank non-priced cells. Detail rows are intended for notes/spec lines under the preceding priced item.
- PR create/edit item table uses fixed percentage columns: Description remains the primary wide column, Acct/Qty/Unit Cost use compact cells and numeric inputs that still show values such as `1000` and `100000.00`, and Total Amount/action columns are compact enough to avoid desktop horizontal scroll.
- New PR item rows start blank. Do not prefill sample Description, Quantity, Unit Cost, or Acct values in the create form.
- New PR Remark starts blank. Do not prefill sample remark text in the create form.
- Summary totals and dashboard budget values can still use THB currency formatting where the context is an overall money total.
- Reports show a strict no-budget warning instead of a negative Remaining Budget when PR usage exists but no active Budget Master row matches the current filters.
- Reports Monthly Summary uses a compact table and Status Summary uses a distribution panel so desktop users can read the summaries without the wide detail-table horizontal scroll.
- Reports Monthly Summary and Company / Branch Summary define explicit column widths and alignment; numeric headers and numeric cells are right-aligned with `tabular-nums` to avoid misreading totals.
- Users/Roles uses a table-first layout; `New User` opens an optional panel after the table, and the compact role guide is available without pushing the user list below the fold.
- Users/Roles uses a read-first table; `Edit profile` and `Open password reset` expand the selected row so dangerous account changes are not always visible inline.
- Users/Roles password reset shows the reset target, requires password confirmation, and uses a danger action treatment.
- Users/Roles marks the authenticated account as `Current session` and disables role/active controls for that row in addition to server-side self-protection.
- Users/Roles supports AD/LDAP allowlisted users through `Verify AD User`; LDAP users show an `AD/LDAP` provider badge and do not expose local password reset.
- Running Number Settings and Budget Master table rows use stable database ids as React keys to avoid console key warnings when rendering `<tbody>` row lists.
- Audit Logs keeps the Selected Event panel stacked above the table until very wide screens (`1800px+`) so desktop users do not have to horizontally scroll to reach `Inspect`; long metadata values such as SHA-256 hashes wrap inside the detail panel.
- Desktop app navigation uses a sticky `100dvh` sidebar with internal nav scrolling, while mobile continues to use the fixed drawer.
- Login page starts with blank username input, hides unsupported language-switch/password-recovery controls, and uses a generated transparent IT PR document-control hero image instead of trust badges or `Draft / Preview / Issue PR / Signed` status-strip decoration.
- PR Documents Board view is a workflow scan surface, not a replacement for Reports or Dashboard: Draft, Generated, and Printed are the active columns; Signed, Cancelled, and Reissued are grouped below in Completed/Archived tabs; status changes still go through explicit lifecycle commands.
- PR Detail groups document commands into `Next action`, `Review & files`, and `Danger zone`, and shows download/attach actions directly on Generated PDF, Signed PDF/Scan, and Quotation attachment cards.
- PR Detail `Next action` uses a compact command strip inside the summary header; avoid returning it to a tall callout/card because it overpowers document information.

## Recommended Next Work

1. Implement the Annual Recurring PR plan. It depends on the completed Category phase: each scheduled Draft must use an active primary category, while legacy nullable PR categories remain readable.
2. Add browser-level low-role smoke coverage by seeding a disposable `IT_USER`/`VIEWER` test account or adding a dedicated test fixture.
3. Add user-facing PR warning banners for `MISSING` / `OVER_BUDGET` audit states if IT wants budget warnings visible before audit review.
4. Run a real UAT backup/restore drill using `docs/BACKUP_RESTORE.md`.
5. Add automated pixel/baseline comparison on top of the PDF QA rendered PNGs.
6. Add centralized monitoring/log aggregation and production TLS/internal CA sign-off.

## Documentation Index

- [docs/README.md](docs/README.md)
- [docs/SETUP.md](docs/SETUP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/FEATURES.md](docs/FEATURES.md)
- [docs/DOCUMENT_GENERATION.md](docs/DOCUMENT_GENERATION.md)
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md)
- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md)
- [docs/COMPANY_BRANCH_MASTER.md](docs/COMPANY_BRANCH_MASTER.md)
- [docs/BUDGET_MASTER.md](docs/BUDGET_MASTER.md)
- [docs/ADMIN_SETTINGS.md](docs/ADMIN_SETTINGS.md)
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- [docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md](docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md)
- [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)
- [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md)
- [docs/RETENTION_POLICY.md](docs/RETENTION_POLICY.md)
- [docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/PHASE_2_STATUS.md](docs/PHASE_2_STATUS.md)
