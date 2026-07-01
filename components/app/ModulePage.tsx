import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";

export function ModulePage({
  title,
  description,
  columns,
  rows,
  actionLabel = "Create",
}: {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  actionLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader title={title} description={description} action={<Button>{actionLabel}</Button>} />
      <TableWrap>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th className={`${tableHeaderClass} px-4 py-3`} key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr className="hover:bg-slate-50" key={row.join("-")}>
                  {row.map((cell, cellIndex) => (
                    <td className={`${tableCellClass} ${cellIndex === 0 ? "font-bold text-ink" : ""}`} key={`${rowIndex}-${cell}`}>
                      {cell === "Active" ? <Badge tone="active">Active</Badge> : cell === "Draft" ? <Badge tone="neutral">Draft</Badge> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableWrap>
      <Card className="border-blue-200 bg-blue-50/70 shadow-none">
        <h2 className="font-bold text-blue-950">Phase note</h2>
        <p className="mt-1 text-sm leading-6 text-blue-800">หน้านี้เป็น shell สำหรับ Phase 1 เพื่อวาง navigation และ information architecture ก่อนต่อ backend จริง</p>
      </Card>
    </div>
  );
}
