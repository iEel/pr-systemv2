const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });

const appPort = process.env.PORT || "3000";

module.exports = {
  apps: [
    {
      name: "it-pr-dms",
      cwd: "/opt/it-pr-dms/current",
      script: "node_modules/next/dist/bin/next",
      args: `start --hostname 127.0.0.1 --port ${appPort}`,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: appPort,
      },
      error_file: "/var/log/it-pr-dms/pm2-error.log",
      out_file: "/var/log/it-pr-dms/pm2-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true,
    },
  ],
};
