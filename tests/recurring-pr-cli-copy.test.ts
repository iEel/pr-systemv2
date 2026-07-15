import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const fixtureModule = pathToFileURL(resolve("tests/fixtures/recurring-pr-cli-dependencies.ts")).href;
const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");

function runCli(scenario: string) {
  try {
    const stdout = execFileSync(process.execPath, [tsxCli, "scripts/process-recurring-pr.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        RECURRING_PR_CLI_DEPENDENCIES_MODULE: fixtureModule,
        RECURRING_PR_CLI_TEST_SCENARIO: scenario,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, stderr: "", stdout };
  } catch (error) {
    const result = error as { status: number | null; stderr: string; stdout: string };
    return { exitCode: result.status, stderr: result.stderr, stdout: result.stdout };
  }
}

function expectSingleSafeJsonResult(result: { exitCode: number | null; stderr: string; stdout: string }, exitCode: number) {
  expect(result.exitCode).toBe(exitCode);
  expect(result.stderr).toBe("");
  const lines = result.stdout.trim().split("\n");
  expect(lines).toHaveLength(1);
  expect(JSON.parse(lines[0])).not.toHaveProperty("error", "DATABASE_URL=mssql://test-secret");
  return JSON.parse(lines[0]);
}

describe("recurring PR CLI deployment", () => {
  test("returns one JSON summary and exit code 0 after a successful run", () => {
    const result = expectSingleSafeJsonResult(runCli("success"), 0);
    expect(result).toMatchObject({ ok: true, created: 1, failed: 0, skipped: 0, total: 1 });
  });

  test("returns one JSON summary and exit code 2 after an isolated schedule failure", () => {
    const result = expectSingleSafeJsonResult(runCli("partial-failure"), 2);
    expect(result).toMatchObject({ ok: false, created: 1, failed: 1, skipped: 0, total: 2 });
  });

  test("returns one safe JSON error and exit code 1 when initialization rejects", () => {
    const result = expectSingleSafeJsonResult(runCli("initialization-rejection"), 1);
    expect(result).toEqual({ ok: false, error: "Recurring PR worker failed" });
  });

  test("returns one safe JSON error and exit code 1 when the worker rejects", () => {
    const result = expectSingleSafeJsonResult(runCli("worker-rejection"), 1);
    expect(result).toEqual({ ok: false, error: "Recurring PR worker failed" });
  });

  test("returns one safe JSON error and exit code 1 when disconnect rejects", () => {
    const result = expectSingleSafeJsonResult(runCli("disconnect-rejection"), 1);
    expect(result).toEqual({ ok: false, error: "Recurring PR worker failed" });
  });

  test("documents a private direct worker command and operational safeguards", () => {
    const pkg = JSON.parse(read("package.json"));

    expect(pkg.private).toBe(true);
    expect(pkg.scripts["recurring-pr:process"]).toBe("./node_modules/.bin/tsx scripts/process-recurring-pr.ts");
    expect(pkg.dependencies.tsx).toBeDefined();
    const deployment = read("docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md");
    const operations = read("docs/OPERATIONS_RUNBOOK.md");
    const retention = read("docs/RETENTION_POLICY.md");

    expect(deployment).toContain("CRON_TZ=Asia/Bangkok");
    expect(deployment).toContain("/var/www/it-pr-dms/current");
    expect(deployment).toContain("/var/lib/it-pr-dms/locks/recurring-pr.lock");
    expect(deployment).toContain("PATH=/usr/local/bin:/usr/bin:/bin");
    expect(deployment).toContain("/var/www/it-pr-dms/current/node_modules/.bin/tsx /var/www/it-pr-dms/current/scripts/process-recurring-pr.ts");
    expect(deployment).toContain("/var/log/it-pr-dms/recurring-pr.log");
    expect(deployment).toContain("no public nginx route");
    expect(deployment).toContain("env -i");
    expect(deployment).toContain("flock -n");
    expect(operations).toContain("/var/lib/it-pr-dms/locks/recurring-pr.lock");
    expect(operations).toContain("PATH=/usr/local/bin:/usr/bin:/bin");
    expect(deployment).toContain("logrotate");
    expect(operations).toContain("exit code 0");
    expect(operations).toContain("exit code 1");
    expect(operations).toContain("exit code 2");
    expect(operations).toContain("catch-up");
    expect(operations).toContain("maintenance");
    expect(retention).toContain("recurring-pr.log");
  });
});
