"use client";

import Link from "next/link";
import { CalendarDays, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { PRItemEditor } from "@/components/pr/PRItemEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { getRenewalPreview, toBangkokDateOnly } from "@/lib/recurring-pr-date";
import { initialRecurringScheduleFormState, resetDivisionForDepartmentChange, type RecurringScheduleFormState } from "@/lib/recurring-pr-form";
import type { RecurringScheduleFormValue, RecurringScheduleOptions } from "@/lib/recurring-pr";
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
  const [renewalMonth, setRenewalMonth] = useState(initialValue.renewalMonth);
  const [renewalDay, setRenewalDay] = useState(initialValue.renewalDay);
  const [leadDays, setLeadDays] = useState(initialValue.leadDays);
  const [departmentId, setDepartmentId] = useState(initialValue.departmentId);
  const [divisionId, setDivisionId] = useState(initialValue.divisionId || "");
  const [state, formAction, isPending] = useActionState(action, initialRecurringScheduleFormState);
  const divisions = options.departments.find((department) => department.id === departmentId)?.divisions || [];
  const preview = getRenewalPreview({ leadDays, renewalDay, renewalMonth, today: toBangkokDateOnly(new Date()) });

  return (
    <form action={formAction} className="space-y-5">
      <input name="sourcePurchaseRequestId" type="hidden" value={initialValue.sourcePurchaseRequestId} />
      {state.message ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{state.message}</div> : null}
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">Schedule name and responsible user</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Name the annual renewal clearly and keep one accountable owner on the schedule.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={state.fieldErrors.name} label="Schedule name *"><input aria-invalid={Boolean(state.fieldErrors.name)} className={inputClass()} defaultValue={initialValue.name} name="name" required /></Field>
          <Field error={state.fieldErrors.responsibleUserId} label="Responsible user *">
            <select aria-invalid={Boolean(state.fieldErrors.responsibleUserId)} className={inputClass()} defaultValue={initialValue.responsibleUserId} name="responsibleUserId" required>
              <option value="">Select responsible user</option>
              {options.responsibleUsers.map((user) => <option disabled={user.disabled} key={user.id} value={user.id}>{user.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">Renewal month/day and lead days</h2>
          <p className="mt-1 text-sm leading-6 text-muted">A Draft is created ahead of the annual renewal date for review.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Renewal month *">
            <select aria-invalid={Boolean(state.fieldErrors.renewalMonth)} className={inputClass()} name="renewalMonth" onChange={(event) => setRenewalMonth(Number(event.target.value))} required value={renewalMonth}>
              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
          </Field>
          <Field error={state.fieldErrors.renewalDay} label="Renewal day *"><input aria-invalid={Boolean(state.fieldErrors.renewalDay) || !preview.valid} className={inputClass()} max={preview.maximumDay || undefined} min="1" name="renewalDay" onChange={(event) => setRenewalDay(Number(event.target.value))} required type="number" value={renewalDay} /></Field>
          <Field error={state.fieldErrors.leadDays} label="Lead days *"><input aria-invalid={Boolean(state.fieldErrors.leadDays)} className={inputClass()} max="365" min="1" name="leadDays" onChange={(event) => setLeadDays(Number(event.target.value))} required type="number" value={leadDays} /></Field>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">Company / Branch / Department / Division / Category</h2>
          <p className="mt-1 text-sm leading-6 text-muted">This is the controlled document snapshot used when the next Draft is prepared.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Company / Branch *">
            <select aria-invalid={Boolean(state.fieldErrors.branchId)} className={inputClass()} defaultValue={initialValue.branchId} name="branchId" required>
              <option value="">Select company / branch</option>
              {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.companyDisplayName} / {branch.name}</option>)}
            </select>
          </Field>
          <Field label="Department *">
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
          <Field label="PR Category *">
            <select aria-invalid={Boolean(state.fieldErrors.categoryId)} className={inputClass()} defaultValue={initialValue.categoryId} name="categoryId" required>
              <option value="">Select category</option>
              {options.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </Field>
          <Field error={state.fieldErrors.purpose} label="Purpose *"><input aria-invalid={Boolean(state.fieldErrors.purpose)} className={inputClass()} defaultValue={initialValue.purpose} name="purpose" required /></Field>
          <Field error={state.fieldErrors.purchaseMethod} label="Purchase method *"><input aria-invalid={Boolean(state.fieldErrors.purchaseMethod)} className={inputClass()} defaultValue={initialValue.purchaseMethod} name="purchaseMethod" required /></Field>
          <Field label="Remark"><textarea className={inputClass("min-h-24 resize-y")} defaultValue={initialValue.remark || ""} name="remark" /></Field>
        </div>
      </Card>

      <section aria-labelledby="recurring-items-heading">
        <div className="mb-3">
          <h2 className="text-base font-bold text-ink" id="recurring-items-heading">Items and services</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Maintain the reusable PR lines used for each annual Draft.</p>
          {state.fieldErrors.items ? <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{state.fieldErrors.items}</p> : null}
        </div>
        <PRItemEditor fieldNames={itemFieldNames} initialItems={initialValue.items} />
      </section>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Next renewal and next Draft preview</h2>
            {preview.valid ? <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"><span><strong className="text-ink">Renewal:</strong> {formatDate(preview.occurrence.renewalDate.toISOString())}</span><span><strong className="text-ink">Next Draft:</strong> {formatDate(preview.occurrence.scheduledDraftDate.toISOString())}</span></div> : <p className="mt-2 text-sm font-semibold text-red-700" role="alert">Invalid renewal date. Choose a day from 1 to {preview.maximumDay || 31} for this month.</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={cancelHref}>Cancel</Link>
            <Button disabled={isPending} type="submit"><Save aria-hidden className="h-4 w-4" />{mode === "create" ? "Create Schedule" : "Save Schedule"}</Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
