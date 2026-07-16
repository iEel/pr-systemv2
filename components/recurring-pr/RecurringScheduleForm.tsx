"use client";

import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileText, Save, UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { PRItemEditor } from "@/components/pr/PRItemEditor";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import type { RecurringScheduleFormValue, RecurringScheduleOptions } from "@/lib/recurring-pr";
import { getRenewalPreview, toBangkokDateOnly } from "@/lib/recurring-pr-date";
import {
  getRecurringDraftTimingState,
  getRecurringScheduleReadiness,
  initialRecurringScheduleFormState,
  resetDivisionForDepartmentChange,
  thaiMonthOptions,
  type RecurringScheduleFormState,
} from "@/lib/recurring-pr-form";
import { formatDate } from "@/lib/utils";

type Props = {
  action: (previousState: RecurringScheduleFormState, formData: FormData) => Promise<RecurringScheduleFormState>;
  cancelHref: string;
  initialValue: RecurringScheduleFormValue;
  mode: "create" | "edit";
  options: RecurringScheduleOptions;
};

const itemFieldNames = {
  accountCode: "accountCode",
  description: "description",
  quantity: "quantity",
  rowType: "rowType",
  unitCost: "unitCost",
};

export function RecurringScheduleForm({ action, cancelHref, initialValue, mode, options }: Props) {
  const [name, setName] = useState(initialValue.name);
  const [responsibleUserId, setResponsibleUserId] = useState(initialValue.responsibleUserId);
  const [categoryId, setCategoryId] = useState(initialValue.categoryId);
  const [renewalMonth, setRenewalMonth] = useState(initialValue.renewalMonth);
  const [renewalDay, setRenewalDay] = useState(initialValue.renewalDay);
  const [leadDays, setLeadDays] = useState(initialValue.leadDays);
  const [departmentId, setDepartmentId] = useState(initialValue.departmentId);
  const [divisionId, setDivisionId] = useState(initialValue.divisionId || "");
  const [state, formAction, isPending] = useActionState(action, initialRecurringScheduleFormState);
  const divisions = options.departments.find((department) => department.id === departmentId)?.divisions || [];
  const today = toBangkokDateOnly(new Date());
  const preview = getRenewalPreview({ leadDays, renewalDay, renewalMonth, today });
  const readiness = getRecurringScheduleReadiness({
    categoryId,
    name,
    previewValid: preview.valid,
    responsibleUserId,
  });
  const timingState = preview.valid ? getRecurringDraftTimingState(preview.occurrence.scheduledDraftDate, today) : null;
  const responsibleUserLabel = options.responsibleUsers.find((user) => user.id === responsibleUserId)?.label || "Not selected";
  const timingLabel = timingState === "overdue" ? "Due immediately" : timingState === "dueToday" ? "Due today" : "Next Draft";

  return (
    <form action={formAction} className="space-y-5">
      <input aria-describedby={state.fieldErrors.sourcePurchaseRequestId ? "source-purchase-request-error" : undefined} name="sourcePurchaseRequestId" type="hidden" value={initialValue.sourcePurchaseRequestId} />
      <SectionHeader
        action={<Badge tone="neutral">{mode === "create" ? "Schedule setup" : "Editing schedule"}</Badge>}
        description="กำหนดวันต่ออายุ ผู้รับผิดชอบ และข้อมูลที่จะใช้สร้าง Draft สำหรับการทบทวนในแต่ละปี"
        title={mode === "create" ? "Create Recurring PR Schedule / สร้างกำหนดการ PR ประจำปี" : "Edit Recurring PR Schedule / แก้ไขกำหนดการ PR ประจำปี"}
      />

      {mode === "create" ? (
        <Card className="border-blue-200 bg-blue-50/80 shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                <FileText aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-blue-950">Source PR: {initialValue.sourcePurchaseRequestLabel}</div>
                <p className="mt-1 max-w-[72ch] text-sm leading-6 text-blue-800">การแก้ไข Schedule นี้ไม่เปลี่ยน PR ต้นทาง และไม่คัดลอกเลข PR, ไฟล์แนบ, PDF, signed file หรือ audit history</p>
              </div>
            </div>
            <Badge className="self-start sm:self-center" tone="info">Review copied data</Badge>
          </div>
        </Card>
      ) : null}

      {state.message ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{state.message}</div> : null}
      {state.fieldErrors.sourcePurchaseRequestId ? <p className="text-sm font-semibold text-red-700" id="source-purchase-request-error" role="alert">{state.fieldErrors.sourcePurchaseRequestId}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Card>
            <div className="mb-4">
              <h2 className="text-base font-bold text-ink">Schedule details / รายละเอียด Schedule</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">ตั้งชื่อให้ค้นหาได้ง่าย และระบุผู้รับผิดชอบหลักสำหรับ Draft ที่ระบบจะสร้าง</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field error={state.fieldErrors.name} label="Schedule name / ชื่อกำหนดการ *"><input aria-invalid={Boolean(state.fieldErrors.name)} className={inputClass()} name="name" onChange={(event) => setName(event.target.value)} required value={name} /></Field>
              <Field error={state.fieldErrors.responsibleUserId} label="Responsible user / ผู้รับผิดชอบ *">
                <select aria-invalid={Boolean(state.fieldErrors.responsibleUserId)} className={inputClass()} name="responsibleUserId" onChange={(event) => setResponsibleUserId(event.target.value)} required value={responsibleUserId}>
                  <option value="">Select responsible user</option>
                  {options.responsibleUsers.map((user) => <option disabled={user.disabled} key={user.id} value={user.id}>{user.label}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-base font-bold text-ink">Annual renewal rule / รอบต่ออายุประจำปี</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">ระบบจะเตรียม Draft ล่วงหน้าตามจำนวน Lead days ก่อนวันต่ออายุ</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field error={state.fieldErrors.renewalMonth} label="Renewal month / เดือนต่ออายุ *">
                <select aria-invalid={Boolean(state.fieldErrors.renewalMonth)} className={inputClass()} name="renewalMonth" onChange={(event) => setRenewalMonth(Number(event.target.value))} required value={renewalMonth}>
                  {thaiMonthOptions.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field error={state.fieldErrors.renewalDay} label="Renewal day / วันที่ต่ออายุ *"><input aria-invalid={Boolean(state.fieldErrors.renewalDay) || !preview.valid} className={inputClass()} max={preview.maximumDay || undefined} min="1" name="renewalDay" onChange={(event) => setRenewalDay(Number(event.target.value))} required type="number" value={renewalDay} /></Field>
              <Field error={state.fieldErrors.leadDays} label="Lead days / สร้างล่วงหน้า *"><input aria-invalid={Boolean(state.fieldErrors.leadDays)} className={inputClass()} max="365" min="1" name="leadDays" onChange={(event) => setLeadDays(Number(event.target.value))} required type="number" value={leadDays} /></Field>
            </div>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-base font-bold text-ink">PR snapshot / ข้อมูลที่จะใช้สร้าง Draft</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">ข้อมูลชุดนี้เป็นสำเนาสำหรับ Draft ในอนาคต การแก้ไขจะไม่กระทบ PR ต้นทาง</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <Field error={state.fieldErrors.branchId} label="Company / Branch *">
                <select aria-invalid={Boolean(state.fieldErrors.branchId)} className={inputClass()} defaultValue={initialValue.branchId} name="branchId" required>
                  <option value="">Select company / branch</option>
                  {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.companyDisplayName} / {branch.name}</option>)}
                </select>
              </Field>
              <Field error={state.fieldErrors.departmentId} label="Department *">
                <select aria-invalid={Boolean(state.fieldErrors.departmentId)} className={inputClass()} name="departmentId" onChange={(event) => { setDepartmentId(event.target.value); setDivisionId(resetDivisionForDepartmentChange(divisionId)); }} required value={departmentId}>
                  <option value="">Select department</option>
                  {options.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </Field>
              <Field error={state.fieldErrors.divisionId} label="Division">
                <select aria-invalid={Boolean(state.fieldErrors.divisionId)} className={inputClass()} disabled={divisions.length === 0} name="divisionId" onChange={(event) => setDivisionId(event.target.value)} value={divisionId}>
                  <option value="">{divisions.length === 0 ? "No divisions available" : "No division"}</option>
                  {divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
                </select>
              </Field>
              <Field error={state.fieldErrors.categoryId} label="PR Category / หมวดหมู่ PR *">
                <select aria-invalid={Boolean(state.fieldErrors.categoryId)} className={inputClass()} name="categoryId" onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}>
                  <option value="">Select category</option>
                  {options.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
              </Field>
              <Field error={state.fieldErrors.purpose} label="Purpose / วัตถุประสงค์ *"><input aria-invalid={Boolean(state.fieldErrors.purpose)} className={inputClass()} defaultValue={initialValue.purpose} name="purpose" required /></Field>
              <Field error={state.fieldErrors.purchaseMethod} label="Purchase method / วิธีการจัดซื้อ *"><input aria-invalid={Boolean(state.fieldErrors.purchaseMethod)} className={inputClass()} defaultValue={initialValue.purchaseMethod} name="purchaseMethod" required /></Field>
              <Field label="Remark / หมายเหตุ"><textarea className={inputClass("min-h-24 resize-y")} defaultValue={initialValue.remark || ""} name="remark" /></Field>
            </div>
          </Card>

          <section aria-labelledby="recurring-items-heading">
            <div className="mb-3">
              <h2 className="text-base font-bold text-ink" id="recurring-items-heading">Items and services / รายการสินค้าและบริการ</h2>
              <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted">ตรวจทานรายการที่จะถูกนำไปใช้กับ Draft ประจำปีทุกครั้ง</p>
              {state.fieldErrors.items ? <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{state.fieldErrors.items}</p> : null}
            </div>
            <PRItemEditor fieldNames={itemFieldNames} initialItems={initialValue.items} />
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Card className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-ink">Schedule readiness</h2>
                <Badge tone={readiness.ready ? "success" : "warning"}>{readiness.ready ? (mode === "create" ? "Ready to create" : "Ready to save") : `Complete ${readiness.missing.length} required fields`}</Badge>
              </div>
              {!readiness.ready ? (
                <ul className="mt-3 space-y-2 text-sm text-ink">
                  {readiness.missing.map((item) => <li className="flex items-center gap-2" key={item}><span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{item}</li>)}
                </ul>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 aria-hidden className="h-4 w-4" />ข้อมูลสำคัญพร้อมแล้ว</p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink"><CalendarClock aria-hidden className="h-4 w-4 text-primary" />Next occurrence</div>
              {preview.valid ? (
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4"><dt className="text-muted">Renewal</dt><dd className="text-right font-semibold text-ink">{formatDate(preview.occurrence.renewalDate.toISOString())}</dd></div>
                  <div className="flex items-start justify-between gap-4"><dt className="text-muted">{timingLabel}</dt><dd className="text-right font-semibold text-ink">{formatDate(preview.occurrence.scheduledDraftDate.toISOString())}</dd></div>
                </dl>
              ) : <p className="mt-3 text-sm font-semibold text-red-700" role="alert">Invalid renewal date. Choose a day from 1 to {preview.maximumDay || 31} for this month.</p>}
              {timingState === "overdue" ? <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-900"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Due immediately</strong><br />ระบบจะสร้าง Draft ชดเชยในการประมวลผลครั้งถัดไป</span></div> : null}
              {timingState === "dueToday" ? <p className="mt-3 flex gap-2 text-sm leading-5 text-blue-800"><Clock3 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />ระบบจะสร้าง Draft ในการประมวลผลครั้งถัดไป</p> : null}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink"><UserRound aria-hidden className="h-4 w-4 text-primary" />Responsible user</div>
              <p className="mt-2 text-sm font-semibold text-ink">{responsibleUserLabel}</p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Button className="w-full" disabled={!readiness.ready || isPending} type="submit"><Save aria-hidden className="h-4 w-4" />{isPending ? "Saving..." : mode === "create" ? "Create Schedule" : "Save Schedule"}</Button>
              <Link className="inline-flex min-h-10 w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href={cancelHref}>{mode === "create" ? "Back to source PR" : "Cancel"}</Link>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
