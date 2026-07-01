import { Hash, Plus, Save } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { getRunningNumberSettingsPageData, type RunningNumberSettingRow } from "@/lib/running-number-settings";
import { createRunningNumberSettingAction, updateRunningNumberSettingAction } from "./actions";

export const dynamic = "force-dynamic";

type Option = {
  companyId?: string;
  id: string;
  label: string;
};

function selectOptions(options: Option[]) {
  return options.map((option) => (
    <option key={option.id} value={option.id}>
      {option.label}
    </option>
  ));
}

function yearFormatOptions(active?: string) {
  return (
    <select className={inputClass()} defaultValue={active || "YY"} name="yearFormat">
      <option value="YY">YY</option>
      <option value="YYYY">YYYY</option>
    </select>
  );
}

function monthFormatOptions(active?: string) {
  return (
    <select className={inputClass()} defaultValue={active || "MM"} name="monthFormat">
      <option value="MM">MM</option>
      <option value="NONE">None</option>
    </select>
  );
}

function createSettingForm({ branches, companies }: { branches: Option[]; companies: Option[] }) {
  return (
    <Card className="border-blue-200 bg-white shadow-none">
      <form action={createRunningNumberSettingAction} className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Create Setting</h2>
            <p className="mt-1 text-sm leading-6 text-muted">เพิ่มชุดเลขเอกสารใหม่ตาม document type และ optional company/branch scope</p>
          </div>
          <Badge tone="neutral">SQL Server RunningNumberSetting</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Document Type
            <input className={inputClass()} defaultValue="ITPR" name="documentType" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Prefix
            <input className={inputClass()} defaultValue="ITPR_" name="prefix" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Year Format
            {yearFormatOptions()}
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Month Format
            {monthFormatOptions()}
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Padding
            <input className={inputClass()} defaultValue={3} max={8} min={1} name="padding" required type="number" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Current Value
            <input className={inputClass()} defaultValue={0} min={0} name="currentValue" required type="number" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Company Scope
            <select className={inputClass()} name="scopeCompanyId">
              <option value="">Global</option>
              {selectOptions(companies)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Branch Scope
            <select className={inputClass()} name="scopeBranchId">
              <option value="">All branches</option>
              {selectOptions(branches)}
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            <Plus aria-hidden className="h-4 w-4" />Create Setting
          </Button>
        </div>
      </form>
    </Card>
  );
}

function settingRow(row: RunningNumberSettingRow) {
  return (
    <tr key={row.id} className="align-top hover:bg-slate-50">
      <td className={`${tableCellClass} min-w-52`}>
        <div className="font-bold text-ink">{row.documentType}</div>
        <div className="mt-1 text-xs font-semibold text-muted">{row.scopeLabel}</div>
      </td>
      <td className={`${tableCellClass} min-w-40`}>
        <div className="font-mono text-sm font-bold text-primary">{row.formatLabel}</div>
        <div className="mt-1 text-xs font-semibold text-muted">Next Preview: {row.nextPreview}</div>
      </td>
      <td className={`${tableCellClass} min-w-[32rem]`}>
        <form action={updateRunningNumberSettingAction} className="grid gap-3 md:grid-cols-[1fr_7rem_7rem_6rem_8rem_auto] md:items-end">
          <input name="settingId" type="hidden" value={row.id} />
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Prefix
            <input className={inputClass()} defaultValue={row.prefix} name="prefix" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Year
            {yearFormatOptions(row.yearFormat)}
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Month
            {monthFormatOptions(row.monthFormat || "NONE")}
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Padding
            <input className={inputClass()} defaultValue={row.padding} max={8} min={1} name="padding" type="number" />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-ink">
            Current
            <input className={inputClass()} defaultValue={row.currentValue} min={0} name="currentValue" type="number" />
          </label>
          <Button className="min-h-10 px-3" type="submit" variant="secondary">
            <Save aria-hidden className="h-4 w-4" />Update Setting
          </Button>
        </form>
      </td>
    </tr>
  );
}

function settingsTable({ rows }: { rows: RunningNumberSettingRow[] }) {
  return (
    <TableWrap>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr>
              {["Document / Scope", "Format", "Controls"].map((head) => (
                <th className={`${tableHeaderClass} px-4 py-3`} key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-semibold text-muted" colSpan={3}>
                  No running number settings found.
                </td>
              </tr>
            ) : (
              rows.map((row) => settingRow(row))
            )}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}

export default async function RunningNumbersPage() {
  const { branches, companies, rows, totals } = await getRunningNumberSettingsPageData();

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Running Number Settings"
          description="ตั้งค่าเลขเอกสาร PR จาก SQL Server พร้อม preview เลขถัดไปและ audit log เมื่อ admin ปรับเลข"
          action={
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900">
              <Hash aria-hidden className="h-4 w-4" />RUNNING_NUMBER_MANAGE
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Settings</div>
            <div className="mt-2 text-2xl font-bold text-ink">{totals.rowCount}</div>
          </Card>
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Scoped</div>
            <div className="mt-2 text-2xl font-bold text-primary">{totals.scopedRows}</div>
          </Card>
          <Card className="shadow-none">
            <div className="text-xs font-bold uppercase text-muted">Global</div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{totals.rowCount - totals.scopedRows}</div>
          </Card>
        </div>

        {createSettingForm({ branches, companies })}

        <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900">
          Document type and scope are fixed after create. Update only prefix, year/month format, padding, and current value.
        </div>

        {settingsTable({ rows })}
      </div>
    </AppFrame>
  );
}
