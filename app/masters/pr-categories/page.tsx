import Link from "next/link";
import { Filter, Plus, Power, RotateCcw, Save } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { MasterDataNav } from "@/components/masters/MasterDataNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { getPrCategoryPageData, type PrCategoryFilters, type PrCategoryRow } from "@/lib/pr-category-master";
import { createPrCategoryAction, setPrCategoryActiveAction, updatePrCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function categoryHref(filters: Partial<PrCategoryFilters> = {}) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.includeInactive) params.set("includeInactive", "1");

  const query = params.toString();

  return `/masters/pr-categories${query ? `?${query}` : ""}`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function filterForm({ filters }: { filters: PrCategoryFilters }) {
  return (
    <form className="flex flex-col gap-3 rounded-lg border border-border bg-panel p-4 sm:flex-row sm:items-end" method="get">
      <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold text-ink">
        Search categories
        <input className={inputClass()} defaultValue={filters.q} name="q" placeholder="Code, name, or description" />
      </label>
      <label className="inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-bold text-ink">
        <input className="h-4 w-4 rounded border-border" defaultChecked={filters.includeInactive} name="includeInactive" type="checkbox" value="1" />
        Include inactive
      </label>
      <div className="flex shrink-0 gap-2">
        <Button type="submit" variant="secondary">
          <Filter aria-hidden className="h-4 w-4" />Apply
        </Button>
        <Link className="inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface" href="/masters/pr-categories">
          Reset
        </Link>
      </div>
    </form>
  );
}

function createCategoryForm() {
  return (
    <Card className="border-blue-200 bg-white shadow-none">
      <form action={createPrCategoryAction} className="grid gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">Create Category</h2>
          <p className="mt-1 text-sm leading-6 text-muted">เพิ่มหมวดหมู่สำหรับ Purchase Request โดยใช้ code ที่อ่านง่ายและเรียงลำดับสำหรับผู้ใช้งาน</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[12rem_minmax(14rem,1fr)_minmax(16rem,1fr)_9rem]">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Code
            <input className={inputClass()} name="code" placeholder="IT_HARDWARE" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Name
            <input className={inputClass()} name="name" placeholder="IT Hardware" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Description
            <input className={inputClass()} name="description" placeholder="Optional guidance" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Sort Order
            <input className={inputClass()} defaultValue="0" min="0" name="sortOrder" required type="number" />
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            <Plus aria-hidden className="h-4 w-4" />Create Category
          </Button>
        </div>
      </form>
    </Card>
  );
}

function categoryRow({ row }: { row: PrCategoryRow }) {
  const formId = `category-edit-${row.id}`;

  return (
    <tr className="align-top hover:bg-slate-50" key={row.id}>
      <td className={`${tableCellClass} min-w-[20rem]`}>
        <form action={updatePrCategoryAction} className="grid gap-2" id={formId}>
          <input name="categoryId" type="hidden" value={row.id} />
          <label className="grid gap-1 text-xs font-bold text-ink">
            Code
            <input className={inputClass("min-h-9")} defaultValue={row.code} name="code" required />
          </label>
          <label className="grid gap-1 text-xs font-bold text-ink">
            Category
            <input className={inputClass("min-h-9")} defaultValue={row.name} name="name" required />
          </label>
          <label className="grid max-w-28 gap-1 text-xs font-bold text-ink">
            Sort Order
            <input className={inputClass("min-h-9")} defaultValue={row.sortOrder} min="0" name="sortOrder" required type="number" />
          </label>
        </form>
      </td>
      <td className={`${tableCellClass} min-w-64`}>
        <label className="grid gap-1 text-xs font-bold text-ink">
          Description
          <textarea className={inputClass("min-h-20 resize-y")} defaultValue={row.description || ""} form={formId} name="description" placeholder="Optional guidance" />
        </label>
      </td>
      <td className={`${tableCellClass} min-w-28`}>
        <div className="font-bold text-ink">{row.referenceCount}</div>
        <div className="mt-1 text-xs font-semibold text-muted">PR references</div>
      </td>
      <td className={`${tableCellClass} min-w-40 text-xs font-semibold leading-5 text-muted`}>{formatUpdatedAt(row.updatedAt)}</td>
      <td className={`${tableCellClass} min-w-28`}>
        <Badge tone={row.isActive ? "active" : "neutral"}>{row.status}</Badge>
      </td>
      <td className={`${tableCellClass} min-w-44`}>
        <div className="grid gap-2">
          <Button className="min-h-9 px-3" form={formId} type="submit" variant="secondary">
            <Save aria-hidden className="h-4 w-4" />Save
          </Button>
          {row.isActive ? (
            <form action={setPrCategoryActiveAction.bind(null, false)} className="grid gap-2">
              <input name="categoryId" type="hidden" value={row.id} />
              <Button className="min-h-9 px-3" type="submit" variant="danger">
                <Power aria-hidden className="h-4 w-4" />Deactivate
              </Button>
              <p className="text-xs leading-5 text-muted">Deactivate hides this category from new PR requests. Existing PR history stays unchanged.</p>
            </form>
          ) : (
            <form action={setPrCategoryActiveAction.bind(null, true)} className="grid gap-2">
              <input name="categoryId" type="hidden" value={row.id} />
              <Button className="min-h-9 px-3" type="submit" variant="success">
                <RotateCcw aria-hidden className="h-4 w-4" />Activate
              </Button>
              <p className="text-xs leading-5 text-muted">Activate makes this category available for new PR requests again.</p>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function categoryTable({ rows }: { rows: PrCategoryRow[] }) {
  return (
    <TableWrap>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] border-collapse">
          <thead>
            <tr>
              {["Category", "Description", "Usage", "Updated", "State", "Actions"].map((head) => (
                <th className={`${tableHeaderClass} px-4 py-3`} key={head}>
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-sm font-semibold text-muted" colSpan={6}>
                  No categories match this view. Use Create Category above to add the first category.
                </td>
              </tr>
            ) : (
              rows.map((row) => categoryRow({ row }))
            )}
          </tbody>
        </table>
      </div>
    </TableWrap>
  );
}

export default async function PrCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const { filters, rows } = await getPrCategoryPageData(params);

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="PR Categories"
          description="จัดการหมวดหมู่ Purchase Request สำหรับการเลือกใช้งานอย่างสม่ำเสมอ โดยเก็บประวัติ PR เดิมไว้ครบถ้วน"
          action={
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90" href={categoryHref({ ...filters, includeInactive: true })}>
              Show active + inactive
            </Link>
          }
        />
        <MasterDataNav />
        {filterForm({ filters })}
        {createCategoryForm()}
        {categoryTable({ rows })}
      </div>
    </AppFrame>
  );
}
