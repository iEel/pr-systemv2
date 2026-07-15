import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("recurring PR CLI deployment", () => {
  test("provides a private local worker command with safe JSON exit handling", () => {
    const pkg = JSON.parse(read("package.json"));
    const cli = read("scripts/process-recurring-pr.ts");

    expect(pkg.private).toBe(true);
    expect(pkg.scripts["recurring-pr:process"]).toBe("tsx scripts/process-recurring-pr.ts");
    expect(pkg.dependencies.tsx).toBeDefined();
    expect(cli).toContain('import "dotenv/config"');
    expect(cli).toContain("processRecurringPrSchedules");
    expect(cli).toContain("JSON.stringify({ ok: summary.failed === 0, ...summary })");
    expect(cli).toContain("process.exitCode = 2");
    expect(cli).toContain('JSON.stringify({ ok: false, error: "Recurring PR worker failed" })');
    expect(cli).toContain("process.exitCode = 1");
    expect(cli).toContain("prisma.$disconnect");
    expect(cli).not.toContain("console.error(error)");
  });

  test("documents the cron worker, single-run lock, recovery, and log retention", () => {
    const deployment = read("docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md");
    const operations = read("docs/OPERATIONS_RUNBOOK.md");
    const retention = read("docs/RETENTION_POLICY.md");

    expect(deployment).toContain("CRON_TZ=Asia/Bangkok");
    expect(deployment).toContain("/var/www/it-pr-dms/current");
    expect(deployment).toContain("/usr/bin/flock -n /var/lock/it-pr-dms-recurring.lock");
    expect(deployment).toContain("recurring-pr:process");
    expect(deployment).toContain("/var/log/it-pr-dms/recurring-pr.log");
    expect(deployment).toContain("no public nginx route");
    expect(deployment).toContain("logrotate");
    expect(operations).toContain("exit code 0");
    expect(operations).toContain("exit code 1");
    expect(operations).toContain("exit code 2");
    expect(operations).toContain("catch-up");
    expect(operations).toContain("maintenance");
    expect(retention).toContain("recurring-pr.log");
  });
});
