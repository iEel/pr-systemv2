import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { buildReportWorkbookSheets, getReportPageData, normalizeReportFilters } from "@/lib/reporting";
import { buildXlsxWorkbook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

function readFilters(searchParams: URLSearchParams) {
  return {
    categoryId: searchParams.get("categoryId") || "",
    companyId: searchParams.get("companyId") || "",
    month: searchParams.get("month") || "",
    status: searchParams.get("status") || "",
    year: searchParams.get("year") || "",
  };
}

export async function GET(request: Request) {
  await requireCurrentUser();

  const url = new URL(request.url);
  const filters = normalizeReportFilters(readFilters(url.searchParams));
  const report = await getReportPageData(filters);
  const workbook = await buildXlsxWorkbook({ sheets: buildReportWorkbookSheets(report) });
  const arrayBuffer = new ArrayBuffer(workbook.byteLength);
  new Uint8Array(arrayBuffer).set(workbook);
  const body = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="pr-report-${filters.year}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
