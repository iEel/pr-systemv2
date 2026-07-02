# Setup

## Requirements

- Node.js compatible with Next.js 16.
- npm.
- Windows PowerShell is the current development shell.
- SQL Server access to the `IT_PR_DMS` database.
- Carbone service access for DOCX to PDF rendering.

The selected logical database name is `IT_PR_DMS`; dev/prod are separated by `SQLSERVER_INSTANCE`. See [DATABASE.md](DATABASE.md).

## Install

```bash
npm install
```

## Run Development Server

```bash
npm run dev -- --port 3000
```

Open:

```text
http://localhost:3000
```

If port `3000` is busy, use another port:

```bash
npm run dev -- --port 3001
```

## Verification Commands

```bash
npm run typecheck
npm test
npm run build
npm audit
```

Expected result:

- TypeScript passes.
- Vitest passes.
- Production build completes.
- Audit reports no known vulnerabilities.

## Database Environment

Copy the example file if a local environment file does not exist:

```powershell
Copy-Item .env.example .env.local
```

Then fill in the real SQL Server login locally. Do not commit `.env.local`.

Development database target:

```text
SQLSERVER_INSTANCE=alpha
SQLSERVER_DATABASE=IT_PR_DMS
```

Auth session secret:

```text
AUTH_SECRET=<generate-a-long-random-secret>
```

The app has a dev-only fallback so local MVP testing can start quickly. Set a real `AUTH_SECRET` before production or shared UAT use, and keep the value stable across restarts/deploys. Changing it invalidates existing Auth.js JWT session cookies and users need to sign in again.

Carbone render settings are also read from the local environment. Keep service URLs/tokens local and out of source control.

## App Port

The default app port is:

```text
PORT=3000
```

For local development, either set `PORT` before starting Next.js or pass the port directly:

```powershell
$env:PORT="3001"
npm run dev
```

```bash
npm run dev -- --port 3001
```

Restart the running Next.js process after changing the port. For Ubuntu/nginx/PM2, update `PORT` in `/var/www/it-pr-dms/shared/.env`, update the nginx upstream port in `deploy/nginx/it-pr-dms.conf`, then reload PM2 and nginx.

## Local Login

Seeded MVP admin:

```text
username: admin
password: admin123
```

The login uses Auth.js Credentials provider and validates against SQL Server `User`.

## Database Commands

```bash
npx prisma validate
npx prisma generate
npm run db:seed
```

Use migrations only against the intended development database/instance.

## Generated Files

The following are local/generated and should not be committed:

- `node_modules/`
- `.next/`
- `out/`
- `*.tsbuildinfo`
- `dev-server.log`
- `dev-server.err.log`
- `.codex-tmp/`
- `.impeccable/`
- `.playwright-cli/`
- `output/`
- `tmp/`
- `.superpowers/`
- `storage/generated/`
- `storage/signed/`
- `storage/quotations/`
- `storage/template-previews/`
- uploaded runtime files under `storage/company-assets/` except source-controlled branch `header` and `footer` JPG/PNG baseline images

These are covered by `.gitignore`.

The seed document templates under `storage/templates/` and branch document image baselines under `storage/company-assets/<branchId>/header|footer` are source-controlled because local tests, seeded document profiles, and first-run document rendering expect them to exist. Production/UAT document storage is still operational data and must be covered by the backup/restore runbook.

## Troubleshooting

### Dev Server Already Running

Check active Node processes if a port is occupied. On Windows, you can run:

```powershell
Get-Process node
```

Then either use a different port or stop the old process if it is no longer needed.

### Sharp Install Warning

Next.js may print an npm approval warning for optional native install scripts such as `sharp`. The current shell builds successfully without additional action. If image optimization is needed later, review and approve native install scripts according to the team's security policy.

### Carbone Render Fails

Check that the Carbone URL and credentials in the local environment are correct, and confirm the service can accept DOCX templates with `convertTo: "pdf"`.

### Draft Preview Does Not Show Latest Browser Edits

Draft preview reads the latest saved SQL Server draft. Use `Save & Preview` on a new draft or `Update & Preview` on an existing draft to persist the browser values and render the PDF in one action.

### Auth.js JWTSessionError: no matching decryption secret

This means the browser still has an Auth.js session cookie encrypted with a different `AUTH_SECRET` than the server is using now. It commonly happens after adding or changing `AUTH_SECRET`, switching between dev/UAT configs, or reusing an old localhost cookie.

Fix:

1. Confirm `.env` has a stable `AUTH_SECRET`.
2. Restart the running Next.js process so the new secret is loaded.
3. Clear cookies for `localhost:3000`, especially `authjs.session-token`, `authjs.callback-url`, and `authjs.csrf-token`, or test in an incognito window.
4. Sign in again.
