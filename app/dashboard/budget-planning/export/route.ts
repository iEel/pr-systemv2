import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getBudgetPlanningPageData } from "@/lib/budget-planning.server";
import { buildBudgetPlanningWorkbookSheets } from "@/lib/budget-planning-workbook";
import { buildXlsxWorkbook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireCurrentUser();

  const params = new URL(request.url).searchParams;
  const data = await getBudgetPlanningPageData({
    year: params.get("year") || "",
    companyId: params.get("companyId") || "",
    categoryId: params.get("categoryId") || "",
  });
  const sheets = buildBudgetPlanningWorkbookSheets(data);
  const workbook = await buildXlsxWorkbook({ sheets });
  const arrayBuffer = new ArrayBuffer(workbook.byteLength);
  new Uint8Array(arrayBuffer).set(workbook);
  const body = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="budget-planning-${data.filters.baseYear}-to-${data.filters.forecastYear}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
