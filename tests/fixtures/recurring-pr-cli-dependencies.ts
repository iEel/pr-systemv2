import { appendFileSync } from "node:fs";

const scenario = process.env.RECURRING_PR_CLI_TEST_SCENARIO;

export const recurringPrCliDependencyLoader = {
  loadPrisma: async () => ({
    $disconnect: async () => {
      if (scenario === "partial-initialization-rejection") {
        appendFileSync(process.env.RECURRING_PR_CLI_TEST_STATE_FILE!, "disconnect\n");
      }
      if (scenario === "disconnect-rejection") {
        throw new Error("DATABASE_URL=mssql://test-secret");
      }
    },
  }),
  loadWorker: async () => {
    if (scenario === "initialization-rejection" || scenario === "partial-initialization-rejection") {
      throw new Error("DATABASE_URL=mssql://test-secret");
    }
    return {
      processRecurringPrSchedules: async () => {
        if (scenario === "worker-rejection") {
          throw new Error("DATABASE_URL=mssql://test-secret");
        }
        if (scenario === "partial-failure") {
          return {
            created: 1,
            failed: 1,
            results: [
              { outcome: "CREATED", scheduleId: "schedule_1" },
              { error: "Recurring PR processing failed", outcome: "FAILED", scheduleId: "schedule_2" },
            ],
            skipped: 0,
            total: 2,
          };
        }
        return { created: 1, failed: 0, results: [{ outcome: "CREATED", scheduleId: "schedule_1" }], skipped: 0, total: 1 };
      },
    };
  },
};
