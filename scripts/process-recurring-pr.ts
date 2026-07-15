import "dotenv/config";
import { prisma } from "../lib/prisma";
import { processRecurringPrSchedules } from "../lib/recurring-pr-worker";

try {
  const summary = await processRecurringPrSchedules();
  console.log(JSON.stringify({ ok: summary.failed === 0, ...summary }));
  if (summary.failed > 0) process.exitCode = 2;
} catch {
  console.error(JSON.stringify({ ok: false, error: "Recurring PR worker failed" }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
