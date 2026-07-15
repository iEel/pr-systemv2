type RecurringPrSummary = {
  failed: number;
  [key: string]: unknown;
};

type RecurringPrCliDependencies = {
  prisma: RecurringPrPrisma;
  processRecurringPrSchedules(): Promise<RecurringPrSummary>;
};

type RecurringPrPrisma = { $disconnect(): Promise<void> };

type RecurringPrCliDependencyLoader = {
  loadPrisma(): Promise<RecurringPrPrisma>;
  loadWorker(): Promise<Pick<RecurringPrCliDependencies, "processRecurringPrSchedules">>;
};

let resultWritten = false;

function writeResult(result: object) {
  if (resultWritten) return;
  resultWritten = true;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function loadDependencyLoader(): Promise<RecurringPrCliDependencyLoader> {
  await import("dotenv/config");
  const testModule = process.env.NODE_ENV === "test" ? process.env.RECURRING_PR_CLI_DEPENDENCIES_MODULE : undefined;
  if (testModule) {
    const fixture = await import(testModule) as { recurringPrCliDependencyLoader: RecurringPrCliDependencyLoader };
    return fixture.recurringPrCliDependencyLoader;
  }
  return {
    loadPrisma: async () => (await import("../lib/prisma")).prisma,
    loadWorker: async () => {
      const { processRecurringPrSchedules } = await import("../lib/recurring-pr-worker");
      return { processRecurringPrSchedules };
    },
  };
}

async function main() {
  let prisma: RecurringPrPrisma | undefined;
  let disconnectAttempted = false;
  try {
    const loader = await loadDependencyLoader();
    prisma = await loader.loadPrisma();
    const { processRecurringPrSchedules } = await loader.loadWorker();
    const summary = await processRecurringPrSchedules();
    disconnectAttempted = true;
    await prisma.$disconnect();
    writeResult({ ok: summary.failed === 0, ...summary });
    process.exitCode = summary.failed > 0 ? 2 : 0;
  } catch {
    if (prisma && !disconnectAttempted) {
      try {
        await prisma.$disconnect();
      } catch {
        // The safe result below deliberately does not expose cleanup failures.
      }
    }
    writeResult({ ok: false, error: "Recurring PR worker failed" });
    process.exitCode = 1;
  }
}

void main().catch(() => {
  writeResult({ ok: false, error: "Recurring PR worker failed" });
  process.exitCode = 1;
});
