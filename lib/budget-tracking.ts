import type { Prisma } from "@prisma/client";

type NumericValue = string | number | { toString(): string };

export type BudgetTrackingStatus = "MATCHED" | "OVER_BUDGET" | "MISSING";

export type BudgetReference = {
  branchId: string | null;
  companyId: string;
  departmentId: string;
  totalAmount: number;
  year: number;
};

export type BudgetCandidate = {
  budgetAmount: NumericValue;
  branchId: string | null;
  companyId: string;
  departmentId: string;
  id: string;
  reservedAmount: NumericValue;
  usedAmount: NumericValue;
  year: number;
};

export type BudgetAdjustment = {
  reservedDelta: number;
  usedDelta: number;
};

export type BudgetAdjustmentPreview = {
  budgetAmount: string;
  remainingAmount: string;
  reservedAmount: string;
  status: Exclude<BudgetTrackingStatus, "MISSING">;
  usedAmount: string;
};

export type BudgetTrackingResult = {
  budgetId: string | null;
  budgetStatus: BudgetTrackingStatus;
  remainingAmount: string | null;
  reservedAmount: string | null;
  scope: "BRANCH" | "ALL_BRANCHES" | null;
  usedAmount: string | null;
};

function numericValue(value: NumericValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function moneyText(value: number) {
  return roundMoney(value).toFixed(2);
}

function clampMoney(value: number) {
  return Math.max(0, roundMoney(value));
}

function missingBudgetResult(): BudgetTrackingResult {
  return {
    budgetId: null,
    budgetStatus: "MISSING",
    remainingAmount: null,
    reservedAmount: null,
    scope: null,
    usedAmount: null,
  };
}

function trackingResult(candidate: BudgetCandidate, preview: BudgetAdjustmentPreview): BudgetTrackingResult {
  return {
    budgetId: candidate.id,
    budgetStatus: preview.status,
    remainingAmount: preview.remainingAmount,
    reservedAmount: preview.reservedAmount,
    scope: candidate.branchId ? "BRANCH" : "ALL_BRANCHES",
    usedAmount: preview.usedAmount,
  };
}

export function buildBudgetReference({
  branchId,
  companyId,
  departmentId,
  documentDate,
  totalAmount,
}: {
  branchId: string | null;
  companyId: string;
  departmentId: string;
  documentDate: Date;
  totalAmount: NumericValue;
}): BudgetReference {
  return {
    branchId,
    companyId,
    departmentId,
    totalAmount: roundMoney(numericValue(totalAmount)),
    year: documentDate.getUTCFullYear(),
  };
}

export function selectBudgetMatch(reference: BudgetReference, candidates: BudgetCandidate[]) {
  return (
    candidates.find(
      (candidate) =>
        candidate.year === reference.year &&
        candidate.companyId === reference.companyId &&
        candidate.departmentId === reference.departmentId &&
        candidate.branchId === reference.branchId,
    ) ||
    candidates.find(
      (candidate) =>
        candidate.year === reference.year &&
        candidate.companyId === reference.companyId &&
        candidate.departmentId === reference.departmentId &&
        candidate.branchId === null,
    ) ||
    null
  );
}

export function adjustBudgetBuckets(candidate: BudgetCandidate, adjustment: BudgetAdjustment): BudgetAdjustmentPreview {
  const budgetAmount = numericValue(candidate.budgetAmount);
  const reservedAmount = clampMoney(numericValue(candidate.reservedAmount) + adjustment.reservedDelta);
  const usedAmount = clampMoney(numericValue(candidate.usedAmount) + adjustment.usedDelta);
  const remainingAmount = roundMoney(budgetAmount - reservedAmount - usedAmount);

  return {
    budgetAmount: moneyText(budgetAmount),
    remainingAmount: moneyText(remainingAmount),
    reservedAmount: moneyText(reservedAmount),
    status: remainingAmount < 0 ? "OVER_BUDGET" : "MATCHED",
    usedAmount: moneyText(usedAmount),
  };
}

async function findMatchingBudget(tx: Prisma.TransactionClient, reference: BudgetReference) {
  const candidates = await tx.budget.findMany({
    select: {
      budgetAmount: true,
      branchId: true,
      companyId: true,
      departmentId: true,
      id: true,
      reservedAmount: true,
      usedAmount: true,
      year: true,
    },
    where: {
      companyId: reference.companyId,
      departmentId: reference.departmentId,
      isActive: true,
      year: reference.year,
      OR: [{ branchId: reference.branchId }, { branchId: null }],
    },
  });

  return selectBudgetMatch(reference, candidates);
}

async function applyBudgetAdjustment(tx: Prisma.TransactionClient, reference: BudgetReference, adjustment: BudgetAdjustment) {
  const match = await findMatchingBudget(tx, reference);

  if (!match) return missingBudgetResult();

  const preview = adjustBudgetBuckets(match, adjustment);

  await tx.budget.update({
    data: {
      reservedAmount: preview.reservedAmount,
      usedAmount: preview.usedAmount,
    },
    where: { id: match.id },
  });

  return trackingResult(match, preview);
}

export async function reserveDraftBudget(tx: Prisma.TransactionClient, reference: BudgetReference) {
  return applyBudgetAdjustment(tx, reference, {
    reservedDelta: reference.totalAmount,
    usedDelta: 0,
  });
}

export async function updateDraftBudgetReservation(tx: Prisma.TransactionClient, previousReference: BudgetReference, nextReference: BudgetReference) {
  const previousMatch = await findMatchingBudget(tx, previousReference);
  const nextMatch = await findMatchingBudget(tx, nextReference);

  if (!previousMatch && !nextMatch) return missingBudgetResult();

  if (previousMatch && nextMatch && previousMatch.id === nextMatch.id) {
    const preview = adjustBudgetBuckets(previousMatch, {
      reservedDelta: roundMoney(nextReference.totalAmount - previousReference.totalAmount),
      usedDelta: 0,
    });

    await tx.budget.update({
      data: {
        reservedAmount: preview.reservedAmount,
        usedAmount: preview.usedAmount,
      },
      where: { id: previousMatch.id },
    });

    return trackingResult(previousMatch, preview);
  }

  let latestResult: BudgetTrackingResult = missingBudgetResult();

  if (previousMatch) {
    const preview = adjustBudgetBuckets(previousMatch, {
      reservedDelta: -previousReference.totalAmount,
      usedDelta: 0,
    });

    await tx.budget.update({
      data: {
        reservedAmount: preview.reservedAmount,
        usedAmount: preview.usedAmount,
      },
      where: { id: previousMatch.id },
    });
    latestResult = trackingResult(previousMatch, preview);
  }

  if (nextMatch) {
    const preview = adjustBudgetBuckets(nextMatch, {
      reservedDelta: nextReference.totalAmount,
      usedDelta: 0,
    });

    await tx.budget.update({
      data: {
        reservedAmount: preview.reservedAmount,
        usedAmount: preview.usedAmount,
      },
      where: { id: nextMatch.id },
    });
    latestResult = trackingResult(nextMatch, preview);
  }

  return latestResult;
}

export async function issueDraftBudget(tx: Prisma.TransactionClient, reference: BudgetReference) {
  return applyBudgetAdjustment(tx, reference, {
    reservedDelta: -reference.totalAmount,
    usedDelta: reference.totalAmount,
  });
}

export async function reverseUsedBudget(tx: Prisma.TransactionClient, reference: BudgetReference) {
  return applyBudgetAdjustment(tx, reference, {
    reservedDelta: 0,
    usedDelta: -reference.totalAmount,
  });
}
