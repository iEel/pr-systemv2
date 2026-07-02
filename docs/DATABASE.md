# Database

## Chosen Database Name

Because dev and production are separated by `SQLSERVER_INSTANCE`, use the same logical database name in each instance:

```text
IT_PR_DMS
```

Recommended environment mapping:

| Environment | SQL Server Instance | Database Name |
| --- | --- | --- |
| Development | `alpha` | `IT_PR_DMS` |
| UAT | environment-specific instance | `IT_PR_DMS` |
| Production | production instance | `IT_PR_DMS` |

If a single SQL Server instance is ever shared across environments, then use suffixes such as `IT_PR_DMS_DEV` and `IT_PR_DMS_UAT`. With separated instances, the cleaner default is `IT_PR_DMS`.

## Provided SQL Server Target

```env
SQLSERVER_HOST=sqlserver.internal.example
SQLSERVER_INSTANCE=alpha
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=IT_PR_DMS
SQLSERVER_TRUST_CERT=true
```

User and password must stay local in `.env`, `.env.local`, or another secure secret store. Do not commit real credentials.

## Local Environment File

Copy `.env.example` to `.env` or `.env.local`, then replace `CHANGE_ME`. The current local file is `.env`.

```env
SQLSERVER_HOST=sqlserver.internal.example
SQLSERVER_INSTANCE=alpha
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=IT_PR_DMS
SQLSERVER_USER=CHANGE_ME
SQLSERVER_PASSWORD=CHANGE_ME
SQLSERVER_TRUST_CERT=true

# DATABASE_URL is optional. Prefer SQLSERVER_* values so the app can escape special characters safely.
```

The app and Prisma config prefer `SQLSERVER_*` values when they are complete. When `SQLSERVER_INSTANCE` is set, the connection helper uses the named instance form (`host\\instance`) instead of `host:port`, so this project targets `WIN-I284TKLAMMD\\ALPHA`. A raw `DATABASE_URL` is only a fallback.

```env
DATABASE_URL="sqlserver://sqlserver.internal.example\alpha;database=IT_PR_DMS;user=CHANGE_ME;password=CHANGE_ME;encrypt=true;trustServerCertificate=true;schema=dbo"
```

## Database Creation

If the database does not exist yet, create it with an admin login:

```sql
CREATE DATABASE [IT_PR_DMS];
GO
```

For development migrations, the app database user should temporarily have enough permission to create and alter tables. A practical dev setup is `db_owner` on `IT_PR_DMS` inside the development instance. Production should use a more restrictive permission model after migrations are handled by the deployment process.

## Prisma Notes

The Prisma schema uses SQL Server as the provider:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

The project pins Prisma `6.19.3` to keep `npm audit` clean. `prisma.config.ts` loads `.env`, builds a safe `DATABASE_URL` from `SQLSERVER_*`, and the runtime client uses `@prisma/adapter-mssql`:

```ts
const adapter = new PrismaMssql(resolveDatabaseUrl(), { schema: "dbo" });
const prisma = new PrismaClient({ adapter });
```

The project prefers `SQLSERVER_*` values and builds the connection string in code so special characters in usernames or passwords are escaped safely.

## Current Database Usage

The backend foundation is already implemented:

- Prisma dependencies are installed.
- `prisma/schema.prisma` exists.
- Initial migrations have been applied to the development `IT_PR_DMS` database.
- Migration `000005_purchase_request_clone_source` has been applied; it adds nullable `PurchaseRequest.clonedFromId` with an index and self-referencing foreign key for Clone as Draft lineage.
- Migration `000006_user_auth_provider` has been applied; it adds nullable local password support plus `User.authProvider`, `externalUsername`, `externalId`, and `lastLoginAt` for Local + AD/LDAP Search + Bind authentication.
- Migration `000007_purchase_request_item_row_type` has been applied; it adds `PurchaseRequestItem.rowType` with `ITEM` / `HEADING` support for non-priced grouping rows.
- `prisma/seed.mjs` seeds the MVP data.
- PR list/detail/create/edit, template management, company master, auth, and document-control commands use SQL Server.

Useful commands:

```bash
npx prisma validate
npx prisma generate
npm run db:seed
```

Use `npm run prisma:migrate` only when intentionally changing the schema against the selected development instance.

## Current Connection Probe Status

Current verified target:

```text
Server: WIN-I284TKLAMMD\\ALPHA
InstanceName: ALPHA
Database: IT_PR_DMS
Status: ONLINE
```

Seven Prisma migrations have been applied on the `ALPHA` instance. The database contains 13 base tables, including `_prisma_migrations`, `User`, `Company`, `Branch`, `PurchaseRequest`, `PurchaseRequestItem`, `PurchaseRequestAttachment`, `DocumentTemplate`, `RunningNumberSetting`, and `AuditLog`; `PurchaseRequest` now includes `clonedFromId` for clone lineage, `User` now includes Local/LDAP provider metadata, and `PurchaseRequestItem` now includes `rowType` for item vs heading rows.
