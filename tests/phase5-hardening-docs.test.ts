import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("Phase 5 hardening documentation and config", () => {
  test("indexes Ubuntu/nginx/PM2 and operations runbooks", () => {
    const readme = read("docs/README.md");
    const handoff = read("DEVELOPER_HANDOFF.md");

    for (const file of ["DEPLOYMENT_UBUNTU_NGINX_PM2.md", "OPERATIONS_RUNBOOK.md", "BACKUP_RESTORE.md", "RETENTION_POLICY.md"]) {
      expect(readme).toContain(file);
      expect(handoff).toContain(file);
    }
  });

  test("provides PM2 and nginx production scaffolds", () => {
    const pm2 = read("ecosystem.config.cjs");
    const nginx = read("deploy/nginx/it-pr-dms.conf");
    const envExample = read(".env.example");

    expect(pm2).toContain('name: "it-pr-dms"');
    expect(pm2).toContain("127.0.0.1");
    expect(pm2).toContain("dotenv.config");
    expect(pm2).toContain("process.env.PORT");
    expect(pm2).toContain("--port ${appPort}");
    expect(pm2).toContain("instances: 1");
    expect(envExample).toContain("PORT=3000");

    expect(nginx).toContain("limit_req_zone");
    expect(nginx).toContain("it_pr_upload");
    expect(nginx).toContain("it_pr_render");
    expect(nginx).toContain("client_max_body_size 25m");
    expect(nginx).toContain("Keep this port in sync with PORT");
    expect(nginx).toContain("proxy_pass http://it_pr_dms_next");
  });

  test("documents backup, restore, retention, monitoring, and Carbone handling", () => {
    expect(read("docs/BACKUP_RESTORE.md")).toContain("SQL Server database `IT_PR_DMS`");
    expect(read("docs/BACKUP_RESTORE.md")).toContain("/var/lib/it-pr-dms/storage");
    expect(read("docs/RETENTION_POLICY.md")).toContain("7 years minimum");
    expect(read("docs/OPERATIONS_RUNBOOK.md")).toContain("Carbone Incident Handling");
    expect(read("docs/OPERATIONS_RUNBOOK.md")).toContain("Rate Limiting");
    expect(read("docs/DEPLOYMENT_UBUNTU_NGINX_PM2.md")).toContain("pm2 startOrReload");
  });
});
