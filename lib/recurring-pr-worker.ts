import { Prisma } from "@prisma/client";
import { requirePermission } from "./auth/current-user";
import { buildBudgetReference, reserveDraftBudget } from "./budget-tracking";
import { buildDraftCreateData, calculateDraftTotals, DraftValidationError, type DraftLineItem, type DraftPurchaseRequestInput } from "./pr-draft";
import { prisma } from "./prisma";
import { buildAnnualOccurrence, calculateNextAnnualOccurrence, toBangkokDateOnly } from "./recurring-pr-date";
import { validateRecurringScheduleReferences } from "./recurring-pr";

export type RecurringWorkerOutcome = "CREATED" | "FAILED" | "SKIPPED";
export type RecurringWorkerResult = {
  outcome: RecurringWorkerOutcome;
  scheduleId: string;
  runId?: string;
  draftId?: string;
  error?: string;
};
export type RecurringWorkerSummary = {
  created: number;
  failed: number;
  skipped: number;
  total: number;
  results: RecurringWorkerResult[];
};
export type RecurringWorkerRepository = {
  findDueScheduleIds(today: Date): Promise<string[]>;
  processOccurrence(scheduleId: string, today: Date): Promise<RecurringWorkerResult>;
};

type WorkerMode = "CRON" | "RETRY";
type ScheduleRecord = any;

const knownValidationMessages = new Set([
  "Company / Branch ไม่พร้อมใช้งาน",
  "Department ไม่พร้อมใช้งาน",
  "หมวดหมู่ PR ไม่พร้อมใช้งาน",
  "Division ไม่ตรงกับ Department",
  "ผู้รับผิดชอบไม่พร้อมใช้งาน",
  "Recurring PR item snapshot is invalid",
]);

function bangkokDateOnlyToUtcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function occurrenceForSchedule(schedule: Pick<ScheduleRecord, "leadDays" | "nextRunDate" | "renewalDay" | "renewalMonth">) {
  const scheduled = schedule.nextRunDate.getTime();
  const startYear = schedule.nextRunDate.getUTCFullYear() - 1;
  const candidates = [startYear, startYear + 1, startYear + 2].map((year) =>
    buildAnnualOccurrence({ leadDays: schedule.leadDays, renewalDay: schedule.renewalDay, renewalMonth: schedule.renewalMonth, year }),
  );
  return candidates.reduce((closest, candidate) =>
    Math.abs(candidate.scheduledDraftDate.getTime() - scheduled) < Math.abs(closest.scheduledDraftDate.getTime() - scheduled) ? candidate : closest,
  );
}

export function sanitizeRecurringError(error: unknown) {
  if (error instanceof DraftValidationError) {
    const message = Object.values(error.fieldErrors).find((value) => knownValidationMessages.has(value));
    if (message) return message;
  }
  if (error instanceof Error && knownValidationMessages.has(error.message)) return error.message;
  return "Recurring PR processing failed";
}

function assertSnapshotItems(items: Array<{ rowType: string; quantity: unknown; unitCost: unknown; totalAmount: unknown }>) {
  if (
    items.length === 0 ||
    !items.some((item) => item.rowType === "ITEM") ||
    items.some(
      (item) =>
        !["HEADING", "ITEM", "DETAIL"].includes(item.rowType) ||
        (item.rowType === "ITEM" &&
          (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.unitCost)) || Number(item.unitCost) < 0)),
    )
  ) {
    throw new Error("Recurring PR item snapshot is invalid");
  }
}

export function buildRecurringDraftInput(schedule: ScheduleRecord, { renewalDate, today }: { renewalDate: Date; today: Date }) {
  assertSnapshotItems(schedule.items);
  const input: DraftPurchaseRequestInput & { createdById: string } = {
    branchId: schedule.branchId,
    categoryId: schedule.categoryId,
    createdById: schedule.responsibleUserId,
    departmentId: schedule.departmentId,
    divisionId: schedule.divisionId,
    documentDate: dateOnly(today),
    items: schedule.items
      .slice()
      .sort((left: { lineNo: number }, right: { lineNo: number }) => left.lineNo - right.lineNo)
      .map((item: any): DraftLineItem => ({
        accountCode: item.accountCode,
        description: item.description,
        quantity: Number(item.quantity),
        rowType: item.rowType,
        totalAmount: Number(item.totalAmount),
        unitCost: Number(item.unitCost),
      })),
    purchaseMethod: schedule.purchaseMethod,
    purpose: schedule.purpose,
    remark: schedule.remark,
    requiredDate: dateOnly(renewalDate),
  };
  return input;
}

function validateSchedule(schedule: ScheduleRecord) {
  validateRecurringScheduleReferences({
    branch: schedule.branch,
    category: schedule.category,
    department: schedule.department,
    division: schedule.division,
    responsibleUser: schedule.responsibleUser,
  });
  assertSnapshotItems(schedule.items);
}

function auditMetadata(schedule: ScheduleRecord, occurrence: ReturnType<typeof buildAnnualOccurrence>, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    occurrenceYear: occurrence.occurrenceYear,
    renewalDate: occurrence.renewalDate.toISOString(),
    responsibleUserId: schedule.responsibleUserId,
    scheduleId: schedule.id,
    scheduledDraftDate: occurrence.scheduledDraftDate.toISOString(),
    ...extra,
  });
}

async function loadSchedule(scheduleId: string) {
  return prisma.recurringPurchaseRequestSchedule.findUnique({
    include: {
      branch: { include: { company: { select: { isActive: true } } } },
      category: { select: { isActive: true } },
      department: { select: { id: true, isActive: true } },
      division: { select: { departmentId: true, isActive: true } },
      items: { orderBy: { lineNo: "asc" } },
      responsibleUser: { select: { isActive: true } },
    },
    where: { id: scheduleId },
  });
}

async function persistValidationFailure(schedule: ScheduleRecord, occurrence: ReturnType<typeof buildAnnualOccurrence>, error: string) {
  try {
    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.recurringPurchaseRequestRun.create({
        data: {
          errorMessage: error,
          finishedAt: new Date(),
          occurrenceYear: occurrence.occurrenceYear,
          renewalDate: occurrence.renewalDate,
          scheduleId: schedule.id,
          scheduledDraftDate: occurrence.scheduledDraftDate,
          status: "FAILED",
        },
        select: { id: true },
      });
      await tx.recurringPurchaseRequestSchedule.update({ data: { lastRunAt: new Date() }, where: { id: schedule.id } });
      await tx.auditLog.create({
        data: {
          action: "Recurring run failed",
          actorId: null,
          entityId: created.id,
          entityType: "RecurringPurchaseRequestRun",
          metadataJson: auditMetadata(schedule, occurrence, { error }),
        },
      });
      return created;
    });
    return { outcome: "FAILED" as const, scheduleId: schedule.id, runId: run.id, error };
  } catch (caught) {
    if (isUniqueViolation(caught)) return { outcome: "SKIPPED" as const, scheduleId: schedule.id };
    throw caught;
  }
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createDraftForRun({ actorId, mode, occurrence, runId, schedule, today }: {
  actorId: string | null;
  mode: WorkerMode;
  occurrence: ReturnType<typeof buildAnnualOccurrence>;
  runId?: string;
  schedule: ScheduleRecord;
  today: Date;
}) {
  return prisma.$transaction(async (tx) => {
    let activeRunId = runId;
    if (mode === "CRON") {
      const run = await tx.recurringPurchaseRequestRun.create({
        data: {
          occurrenceYear: occurrence.occurrenceYear,
          renewalDate: occurrence.renewalDate,
          scheduleId: schedule.id,
          scheduledDraftDate: occurrence.scheduledDraftDate,
          status: "PROCESSING",
        },
        select: { id: true },
      });
      activeRunId = run.id;
    } else {
      const claimed = await tx.recurringPurchaseRequestRun.updateMany({
        data: { errorMessage: null, finishedAt: null, startedAt: new Date(), status: "PROCESSING" },
        where: { id: runId, purchaseRequestId: null, status: "FAILED" },
      });
      if (claimed.count !== 1) throw new Error("Recurring run is not eligible for retry");
    }

    const input = buildRecurringDraftInput(schedule, { renewalDate: occurrence.renewalDate, today });
    const createData = {
      ...buildDraftCreateData(input, {
      companyId: schedule.companyId,
      createdById: input.createdById,
      documentRefNo: schedule.branch.documentRefNo,
      }),
      status: "DRAFT" as const,
    };
    const created = await tx.purchaseRequest.create({ data: createData, select: { id: true } });
    const totals = calculateDraftTotals(input.items);
    const budget = await reserveDraftBudget(
      tx,
      buildBudgetReference({
        branchId: createData.branchId,
        companyId: createData.companyId,
        departmentId: createData.departmentId,
        documentDate: createData.documentDate,
        totalAmount: totals.totalAmount,
      }),
    );
    await tx.recurringPurchaseRequestRun.update({
      data: { errorMessage: null, finishedAt: new Date(), purchaseRequestId: created.id, status: "SUCCEEDED" },
      where: { id: activeRunId },
    });
    await tx.recurringPurchaseRequestSchedule.update({
      data: {
        lastRunAt: new Date(),
        nextRunDate: calculateNextAnnualOccurrence({
          leadDays: schedule.leadDays,
          occurrenceYear: occurrence.occurrenceYear,
          renewalDay: schedule.renewalDay,
          renewalMonth: schedule.renewalMonth,
        }).scheduledDraftDate,
      },
      where: { id: schedule.id },
    });
    await tx.auditLog.create({
      data: {
        action: "Automated recurring Draft created",
        actorId: null,
        entityId: created.id,
        entityType: "PurchaseRequest",
        metadataJson: auditMetadata(schedule, occurrence, { budget, runId: activeRunId }),
      },
    });
    if (mode === "RETRY") {
      await tx.auditLog.create({
        data: {
          action: "Recurring run retried",
          actorId,
          entityId: activeRunId!,
          entityType: "RecurringPurchaseRequestRun",
          metadataJson: auditMetadata(schedule, occurrence, { draftId: created.id }),
        },
      });
    }
    return { draftId: created.id, runId: activeRunId! };
  });
}

export async function processRecurringScheduleOccurrence(scheduleId: string, today: Date, mode: WorkerMode = "CRON"): Promise<RecurringWorkerResult> {
  const schedule = await loadSchedule(scheduleId);
  if (!schedule || (mode === "CRON" && schedule.status !== "ACTIVE")) return { outcome: "SKIPPED", scheduleId };
  const occurrence = occurrenceForSchedule(schedule);
  if (mode === "CRON") {
    const existing = await prisma.recurringPurchaseRequestRun.findUnique({
      select: { id: true },
      where: { scheduleId_occurrenceYear: { occurrenceYear: occurrence.occurrenceYear, scheduleId } },
    });
    if (existing) return { outcome: "SKIPPED", scheduleId, runId: existing.id };
  }
  try {
    validateSchedule(schedule);
  } catch (error) {
    if (mode === "RETRY") throw new Error(sanitizeRecurringError(error));
    return persistValidationFailure(schedule, occurrence, sanitizeRecurringError(error));
  }
  try {
    const created = await createDraftForRun({ actorId: null, mode, occurrence, schedule, today });
    return { outcome: "CREATED", scheduleId, ...created };
  } catch (error) {
    if (isUniqueViolation(error)) return { outcome: "SKIPPED", scheduleId };
    throw error;
  }
}

const prismaRecurringWorkerRepository: RecurringWorkerRepository = {
  async findDueScheduleIds(today) {
    const schedules = await prisma.recurringPurchaseRequestSchedule.findMany({
      orderBy: [{ nextRunDate: "asc" }, { id: "asc" }],
      select: { id: true },
      where: { nextRunDate: { lte: today }, status: "ACTIVE" },
    });
    return schedules.map((schedule) => schedule.id);
  },
  processOccurrence: (scheduleId, today) => processRecurringScheduleOccurrence(scheduleId, today),
};

export async function processRecurringPrSchedules({ now = new Date(), repository = prismaRecurringWorkerRepository }: {
  now?: Date;
  repository?: RecurringWorkerRepository;
} = {}): Promise<RecurringWorkerSummary> {
  const today = bangkokDateOnlyToUtcDate(toBangkokDateOnly(now));
  const results: RecurringWorkerResult[] = [];
  for (const scheduleId of await repository.findDueScheduleIds(today)) {
    try {
      results.push(await repository.processOccurrence(scheduleId, today));
    } catch (error) {
      results.push({ error: sanitizeRecurringError(error), outcome: "FAILED", scheduleId });
    }
  }
  return {
    created: results.filter((result) => result.outcome === "CREATED").length,
    failed: results.filter((result) => result.outcome === "FAILED").length,
    skipped: results.filter((result) => result.outcome === "SKIPPED").length,
    total: results.length,
    results,
  };
}

export async function retryRecurringPurchaseRequestRun(runId: string) {
  const actor = await requirePermission("PR_RECURRING_MANAGE");
  const run = await prisma.recurringPurchaseRequestRun.findUnique({
    include: { schedule: true },
    where: { id: runId },
  });
  if (!run || run.status !== "FAILED" || run.purchaseRequestId) throw new Error("Recurring run is not eligible for retry");
  const schedule = await loadSchedule(run.scheduleId);
  if (!schedule) throw new Error("Recurring schedule not found");
  const occurrence = {
    occurrenceYear: run.occurrenceYear,
    renewalDate: run.renewalDate,
    scheduledDraftDate: run.scheduledDraftDate,
  };
  try {
    validateSchedule(schedule);
  } catch (error) {
    const safeError = sanitizeRecurringError(error);
    await prisma.recurringPurchaseRequestRun.update({ data: { errorMessage: safeError, finishedAt: new Date() }, where: { id: run.id } });
    throw new Error(safeError);
  }
  const created = await createDraftForRun({ actorId: actor.id, mode: "RETRY", occurrence, runId: run.id, schedule, today: bangkokDateOnlyToUtcDate(toBangkokDateOnly(new Date())) });
  return { id: created.draftId, runId: created.runId, scheduleId: schedule.id };
}
