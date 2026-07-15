type RecurringPrSummary = {
  failed: number;
  [key: string]: unknown;
};

type RecurringPrCliDependencies = {
  prisma: { $disconnect(): Promise<void> };
  processRecurringPrSchedules(): Promise<RecurringPrSummary>;
};

let resultWritten = false;

function writeResult(result: object) {
  if (resultWritten) return;
  resultWritten = true;
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function loadDependencies(): Promise<RecurringPrCliDependencies> {
  await import("dotenv/config");
  const testModule = process.env.NODE_ENV === "test" ? process.env.RECURRING_PR_CLI_DEPENDENCIES_MODULE : undefined;
  if (testModule) {
    const fixture = await import(testModule) as { recurringPrCliDependencies: RecurringPrCliDependencies };
    return fixture.recurringPrCliDependencies;
  }
  const [{ prisma }, { processRecurringPrSchedules }] = await Promise.all([
    import("../lib/prisma"),
    import("../lib/recurring-pr-worker"),
  ]);
  return { prisma, processRecurringPrSchedules };
}

async function main() {
  let dependencies: RecurringPrCliDependencies | undefined;
  let disconnectAttempted = false;
  try {
    dependencies = await loadDependencies();
    const summary = await dependencies.processRecurringPrSchedules();
    disconnectAttempted = true;
    await dependencies.prisma.$disconnect();
    writeResult({ ok: summary.failed === 0, ...summary });
    process.exitCode = summary.failed > 0 ? 2 : 0;
  } catch {
    if (dependencies && !disconnectAttempted) {
      try {
        await dependencies.prisma.$disconnect();
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
