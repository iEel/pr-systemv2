"use client";

import Link from "next/link";
import { CalendarDays, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { PRItemEditor } from "@/components/pr/PRItemEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { buildAnnualOccurrence, chooseInitialOccurrenceYear, toBangkokDateOnly } from "@/lib/recurring-pr-date";
import type { RecurringScheduleFormValue, RecurringScheduleOptions } from "@/lib/recurring-pr";
import { formatDate } from "@/lib/utils";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
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
  const divisions = options.departments.find((department) => department.id === departmentId)?.divisions || [];
  const preview = useMemo(() => {
    const today = toBangkokDateOnly(new Date());
    const safeMonth = Math.min(12, Math.max(1, renewalMonth || 1));
    const safeDay = Math.min(31, Math.max(1, renewalDay || 1));
    const safeLeadDays = Math.min(365, Math.max(1, leadDays || 1));
    const year = chooseInitialOccurrenceYear({ renewalDay: safeDay, renewalMonth: safeMonth, today });
    return buildAnnualOccurrence({ leadDays: safeLeadDays, renewalDay: safeDay, renewalMonth: safeMonth, year });
  }, [leadDays, renewalDay, renewalMonth]);

  return (
    <form action={action} className="space-y-5">
      <input name="sourcePurchaseRequestId" type="hidden" value={initialValue.sourcePurchaseRequestId} />
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">Schedule name and responsible user</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Name the annual renewal clearly and keep one accountable owner on the schedule.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Schedule name *"><input className={inputClass()} defaultValue={initialValue.name} name="name" required /></Field>
          <Field label="Responsible user *">
            <select className={inputClass()} defaultValue={initialValue.responsibleUserId} name="responsibleUserId" required>
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
            <select className={inputClass()} defaultValue={initialValue.renewalMonth} name="renewalMonth" onChange={(event) => setRenewalMonth(Number(event.target.value))} required>
              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
          </Field>
          <Field label="Renewal day *"><input className={inputClass()} defaultValue={initialValue.renewalDay} max="31" min="1" name="renewalDay" onChange={(event) => setRenewalDay(Number(event.target.value))} required type="number" /></Field>
          <Field label="Lead days *"><input className={inputClass()} defaultValue={initialValue.leadDays} max="365" min="1" name="leadDays" onChange={(event) => setLeadDays(Number(event.target.value))} required type="number" /></Field>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-base font-bold text-ink">Company / Branch / Department / Division / Category</h2>
          <p className="mt-1 text-sm leading-6 text-muted">This is the controlled document snapshot used when the next Draft is prepared.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Company / Branch *">
            <select className={inputClass()} defaultValue={initialValue.branchId} name="branchId" required>
              <option value="">Select company / branch</option>
              {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.companyDisplayName} / {branch.name}</option>)}
            </select>
          </Field>
          <Field label="Department *">
            <select className={inputClass()} defaultValue={initialValue.departmentId} name="departmentId" onChange={(event) => setDepartmentId(event.target.value)} required>
              <option value="">Select department</option>
              {options.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          <Field label="Division">
            <select className={inputClass()} defaultValue={initialValue.divisionId || ""} name="divisionId">
              <option value="">No division</option>
              {divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
            </select>
          </Field>
          <Field label="PR Category *">
            <select className={inputClass()} defaultValue={initialValue.categoryId} name="categoryId" required>
              <option value="">Select category</option>
              {options.categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </Field>
          <Field label="Purpose *"><input className={inputClass()} defaultValue={initialValue.purpose} name="purpose" required /></Field>
          <Field label="Purchase method *"><input className={inputClass()} defaultValue={initialValue.purchaseMethod} name="purchaseMethod" required /></Field>
          <Field label="Remark"><textarea className={inputClass("min-h-24 resize-y")} defaultValue={initialValue.remark || ""} name="remark" /></Field>
        </div>
      </Card>

      <section aria-labelledby="recurring-items-heading">
        <div className="mb-3">
          <h2 className="text-base font-bold text-ink" id="recurring-items-heading">Items and services</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Maintain the reusable PR lines used for each annual Draft.</p>
        </div>
        <PRItemEditor fieldNames={itemFieldNames} initialItems={initialValue.items} />
      </section>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Next renewal and next Draft preview</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <span><strong className="text-ink">Renewal:</strong> {formatDate(preview.renewalDate.toISOString())}</span>
              <span><strong className="text-ink">Next Draft:</strong> {formatDate(preview.scheduledDraftDate.toISOString())}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-ink hover:bg-surface" href={cancelHref}>Cancel</Link>
            <Button type="submit"><Save aria-hidden className="h-4 w-4" />{mode === "create" ? "Create Schedule" : "Save Schedule"}</Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
