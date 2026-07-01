import Link from "next/link";
import { Fragment } from "react";
import { Building2, FileImage, Plus, Save, Settings2, Trash2, Upload, X } from "lucide-react";
import { AppFrame } from "@/components/app/AppFrame";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { TableWrap, tableCellClass, tableHeaderClass } from "@/components/ui/Table";
import { getCompanyMasterItems, groupCompanyMasterItems, type CompanyMasterItem } from "@/lib/company-master";
import { createCompanyAction, removeBranchAction, updateBranchDocumentProfileAction, uploadCompanyAssetAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type CompanyMasterBranch = CompanyMasterItem & { officeLabel: string };
type CompanyMasterFilter = "inactive" | "incomplete" | "missingFooter" | "missingHeader";

const companyMasterFilters = ["incomplete", "missingHeader", "missingFooter", "inactive"] as const;

function searchValue(params: SearchParams | undefined, key: string) {
  const value = params?.[key];

  return Array.isArray(value) ? value[0] : value;
}

function profileTone(status: string) {
  return status === "Complete" ? "success" : "warning";
}

function activeTone(status: string) {
  return status === "Active" ? "active" : "neutral";
}

function assetUrl(branchId: string, type: "footer" | "header", updatedAt: string | null) {
  const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : "";

  return `/masters/companies/assets/${encodeURIComponent(branchId)}/${type}${version}`;
}

function linkButtonClass(tone: "danger" | "primary" | "secondary" = "secondary") {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    primary: "border-primary bg-primary text-white hover:bg-primary/90",
    secondary: "border-border bg-panel text-ink hover:bg-surface",
  };

  return `inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${tones[tone]}`;
}

function companiesHref({
  create,
  filter,
  includeInactive,
  view,
}: {
  create?: boolean;
  filter?: CompanyMasterFilter;
  includeInactive: boolean;
  view?: string;
}) {
  const params = new URLSearchParams();

  if (includeInactive) {
    params.set("includeInactive", "1");
  }

  if (create) {
    params.set("add", "company");
  }

  if (view) {
    params.set("view", view);
  }

  if (filter) {
    params.set("filter", filter);
  }

  const query = params.toString();
  const hash = create ? "#add-company" : view ? `#branch-workspace-${view}` : "";

  return `/masters/companies${query ? `?${query}` : ""}${hash}`;
}

function companyListHref({ filter, includeInactive }: { filter?: CompanyMasterFilter; includeInactive: boolean }) {
  return companiesHref({ filter, includeInactive });
}

function validCompanyMasterFilter(value: string | undefined): CompanyMasterFilter | undefined {
  return companyMasterFilters.includes(value as CompanyMasterFilter) ? (value as CompanyMasterFilter) : undefined;
}

function filterCompanyBranch(item: CompanyMasterItem, filter: CompanyMasterFilter | undefined) {
  if (!filter) return true;
  if (filter === "inactive") return item.status === "Inactive";
  if (filter === "incomplete") return item.profileStatus !== "Complete";
  if (filter === "missingHeader") return !item.headerAssetPath;
  if (filter === "missingFooter") return !item.footerAssetPath;

  return true;
}

function uploadAssetForm({ branchId, includeInactive, type }: { branchId: string; includeInactive: boolean; type: "FOOTER" | "HEADER" }) {
  const label = type === "HEADER" ? "Upload Header" : "Upload Footer";

  return (
    <form action={uploadCompanyAssetAction} className="grid gap-3 rounded-lg border border-border bg-slate-50 p-3">
      <input name="branchId" type="hidden" value={branchId} />
      <input name="includeInactive" type="hidden" value={includeInactive ? "1" : "0"} />
      <input name="assetType" type="hidden" value={type} />
      <label className="grid gap-1.5 text-xs font-bold text-ink">
        {label}
        <input
          className={inputClass(
            "min-h-11 bg-white pt-2 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-primary hover:file:bg-blue-100",
          )}
          name="assetFile"
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          required
        />
      </label>
      <p className="text-xs leading-5 text-muted">Recommended: PNG or JPG, 5 MB max. ใช้กับ Carbone tag {type === "HEADER" ? "d.companyHeaderImage" : "d.companyFooterImage"}</p>
      <Button className="min-h-11" type="submit" variant="secondary">
        <Upload aria-hidden className="h-4 w-4" />Upload {type === "HEADER" ? "header" : "footer"}
      </Button>
    </form>
  );
}

function assetStatusRow({ label, path }: { label: "Footer" | "Header"; path: string | null }) {
  const isUploaded = Boolean(path);

  return (
    <Badge tone={isUploaded ? "success" : "warning"}>{label}: {isUploaded ? "Uploaded" : "Missing"}</Badge>
  );
}

function companyCodesSummary(codes: string[]) {
  if (codes.length <= 3) return codes.join(", ");

  return `${codes.slice(0, 3).join(", ")} +${codes.length - 3} more`;
}

function filterStatLink({
  active,
  count,
  detail,
  href,
  label,
  tone = "blue",
}: {
  active: boolean;
  count: number;
  detail: string;
  href: string;
  label: string;
  tone?: "blue" | "emerald" | "slate";
}) {
  const tones = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    slate: "text-ink",
  };

  return (
    <Link className={`rounded-lg border bg-panel p-5 transition-colors hover:border-primary hover:bg-blue-50/40 ${active ? "border-primary ring-2 ring-blue-100" : "border-border"}`} href={href}>
      <div className={`text-2xl font-bold ${tones[tone]}`}>{count}</div>
      <div className="text-sm font-semibold text-ink">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{detail}</div>
    </Link>
  );
}

function assetPreviewCard({
  branchId,
  label,
  path,
  type,
  updatedAt,
}: {
  branchId: string;
  label: "Footer" | "Header";
  path: string | null;
  type: "footer" | "header";
  updatedAt: string | null;
}) {
  const isUploaded = Boolean(path);

  return (
    <section className="grid gap-3 rounded-lg border border-border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-ink">{label} image</h3>
        <Badge tone={isUploaded ? "success" : "warning"}>{isUploaded ? "Uploaded" : "Missing"}</Badge>
      </div>
      <div className="grid min-h-32 place-items-center overflow-hidden rounded-md border border-border bg-slate-50">
        {path ? (
          <img alt={`${label} preview`} className="max-h-44 w-full object-contain" src={assetUrl(branchId, type, updatedAt)} />
        ) : (
          <div className="px-4 text-center text-sm font-semibold text-muted">No {label.toLowerCase()} image uploaded</div>
        )}
      </div>
      <details className="text-xs font-semibold text-muted">
        <summary className="cursor-pointer text-primary">Storage path</summary>
        <p className="mt-1 break-all">{path || "storage path not set"}</p>
      </details>
    </section>
  );
}

function branchWorkspace({
  includeInactive,
  item,
}: {
  includeInactive: boolean;
  item: CompanyMasterBranch | undefined;
}) {
  if (!item) {
    return (
      <Card className="sticky top-20 scroll-mt-20 border-blue-100 bg-blue-50/60 shadow-none" id="branch-workspace">
        <div className="grid gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-primary">
            <Settings2 aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-primary">Branch workspace</p>
            <h2 className="mt-1 text-lg font-bold text-ink">Select a branch to manage</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              เลือก Manage branch จากตารางเพื่อแก้ไข document profile, ดูและอัปโหลด Header/Footer, หรือ deactivate branch จากพื้นที่เดียว
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="sticky top-20 scroll-mt-20 p-0 shadow-panel" id={`branch-workspace-${item.branchId}`}>
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Branch workspace</p>
            <h2 className="mt-1 text-lg font-bold text-ink">{item.displayName}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              {item.officeLabel} · Code {item.branchCode} · Company code {item.companyCode}
            </p>
          </div>
          <Link className={linkButtonClass()} href={companyListHref({ includeInactive })}>
            <X aria-hidden className="h-4 w-4" />Close
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={profileTone(item.profileStatus)}>{item.profileStatus}</Badge>
          <Badge tone={activeTone(item.status)}>{item.status}</Badge>
          <Badge tone={item.headerAssetPath ? "success" : "warning"}>Header {item.headerAssetPath ? "uploaded" : "missing"}</Badge>
          <Badge tone={item.footerAssetPath ? "success" : "warning"}>Footer {item.footerAssetPath ? "uploaded" : "missing"}</Badge>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <section className="grid gap-3">
          <div>
            <h3 className="text-sm font-bold text-ink">Document profile</h3>
            <p className="mt-1 text-xs leading-5 text-muted">ข้อมูลนี้จะถูกใช้ตอนสร้าง PR และส่งเข้า template rendering</p>
          </div>
          <form action={updateBranchDocumentProfileAction} className="grid gap-3">
            <input name="branchId" type="hidden" value={item.branchId} />
            <input name="includeInactive" type="hidden" value={includeInactive ? "1" : "0"} />
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Display Name
                <input className={inputClass()} defaultValue={item.rawDocumentDisplayName} name="displayName" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Ref No.
                <input className={inputClass()} defaultValue={item.rawDocumentRefNo} name="documentRefNo" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-ink">
                Tax ID
                <input className={inputClass()} defaultValue={item.rawDocumentTaxId} name="documentTaxId" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Legal Name
              <input className={inputClass()} defaultValue={item.rawDocumentLegalName} name="documentLegalName" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Address
              <textarea className={inputClass("min-h-24 resize-y leading-6")} defaultValue={item.rawDocumentAddress} name="documentAddress" />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink">
                <input className="h-4 w-4 rounded border-border" defaultChecked={item.branchIsActive} name="isActive" type="checkbox" />
                Active branch
              </label>
              <Button className="min-h-11" type="submit">
                <Save aria-hidden className="h-4 w-4" />Save Changes
              </Button>
            </div>
          </form>
        </section>

        <section className="grid gap-3 border-t border-border pt-5">
          <div>
            <h3 className="text-sm font-bold text-ink">Header & Footer assets</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              รูปที่อัปโหลดตรงนี้คือรูปเดียวกับที่ส่งให้ Carbone ผ่าน d.companyHeaderImage และ d.companyFooterImage
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {assetPreviewCard({ branchId: item.branchId, label: "Header", path: item.headerAssetPath, type: "header", updatedAt: item.updatedAt })}
            {assetPreviewCard({ branchId: item.branchId, label: "Footer", path: item.footerAssetPath, type: "footer", updatedAt: item.updatedAt })}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {uploadAssetForm({ branchId: item.branchId, includeInactive, type: "HEADER" })}
            {uploadAssetForm({ branchId: item.branchId, includeInactive, type: "FOOTER" })}
          </div>
        </section>

        <section className="grid gap-3 border-t border-border pt-5">
          <div>
            <h3 className="text-sm font-bold text-red-800">Deactivate branch</h3>
            <p className="mt-1 text-xs leading-5 text-red-700">
              This will hide the branch from active PR creation. If the branch has no dependent PR or budget records, the system can remove the unused branch safely.
            </p>
          </div>
          <form action={removeBranchAction} className="grid gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <input name="branchId" type="hidden" value={item.branchId} />
            <input name="includeInactive" type="hidden" value={includeInactive ? "1" : "0"} />
            <label className="inline-flex min-h-11 items-start gap-2 text-sm font-semibold text-red-900">
              <input className="mt-1 h-4 w-4 rounded border-red-300" name="confirmBranchRemoval" required type="checkbox" />
              I understand this branch will be deactivated or removed according to existing PR/budget references.
            </label>
            <Button className="min-h-11 justify-self-start" type="submit" variant="danger">
              <Trash2 aria-hidden className="h-4 w-4" />Deactivate branch
            </Button>
          </form>
        </section>
      </div>
    </Card>
  );
}

function addCompanyForm({ includeInactive }: { includeInactive: boolean }) {
  return (
    <Card className="border-blue-200 bg-white shadow-none" id="add-company">
      <form action={createCompanyAction} className="grid gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Create Company</h2>
            <p className="mt-1 text-sm leading-6 text-muted">เพิ่มบริษัทพร้อม branch แรกสำหรับใช้งานใน PR document</p>
          </div>
          <Link className={linkButtonClass()} href={companiesHref({ includeInactive })}>
            <X aria-hidden className="h-4 w-4" />Cancel
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Company Code
            <input className={inputClass()} name="companyCode" placeholder="SONIC07" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink lg:col-span-1">
            Display Name
            <input className={inputClass()} name="companyDisplayName" placeholder="Sonic 00007" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink lg:col-span-2">
            Legal Name
            <input className={inputClass()} name="companyLegalName" placeholder="บริษัท ..." required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Tax ID
            <input className={inputClass()} name="companyTaxId" placeholder="0100000000000" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Branch Code
            <input className={inputClass()} name="branchCode" placeholder="HQ" required />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-ink lg:col-span-2">
            Branch Name
            <input className={inputClass()} name="branchName" placeholder="Sonic HQ" required />
          </label>
        </div>

        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          Branch Address
          <textarea className={inputClass("min-h-20 resize-y leading-6")} name="branchAddress" placeholder="ที่อยู่บริษัท/สาขา" />
        </label>

        <div className="grid gap-4 rounded-lg border border-border bg-slate-50 p-4">
          <div className="text-sm font-bold text-ink">Document profile</div>
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Ref No.
              <input className={inputClass("bg-white")} name="documentRefNo" placeholder="SN17-DOCSA011" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Document Display Name
              <input className={inputClass("bg-white")} name="documentDisplayName" placeholder="Sonic HQ" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink lg:col-span-2">
              Document Legal Name
              <input className={inputClass("bg-white")} name="documentLegalName" placeholder="บริษัท ..." />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Document Tax ID
              <input className={inputClass("bg-white")} name="documentTaxId" placeholder="0100000000000" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink lg:col-span-3">
              Document Address
              <textarea className={inputClass("min-h-20 resize-y bg-white leading-6")} name="documentAddress" placeholder="ที่อยู่สำหรับออกเอกสาร PR" />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            <Save aria-hidden className="h-4 w-4" />Create Company
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const includeInactive = searchValue(params, "includeInactive") === "1";
  const isCreating = searchValue(params, "add") === "company";
  const viewBranchId = searchValue(params, "view");
  const activeFilter = validCompanyMasterFilter(searchValue(params, "filter"));
  const companyItems = await getCompanyMasterItems({ includeInactive });
  const filteredCompanyItems = companyItems.filter((item) => filterCompanyBranch(item, activeFilter));
  const companyGroups = groupCompanyMasterItems(filteredCompanyItems);
  const allCompanyGroups = groupCompanyMasterItems(companyItems);
  const selectedBranch = allCompanyGroups.flatMap((group) => group.branches).find((item) => item.branchId === viewBranchId);
  const completed = companyItems.filter((item) => item.profileStatus === "Complete").length;
  const headers = companyItems.filter((item) => item.headerAssetPath).length;
  const footers = companyItems.filter((item) => item.footerAssetPath).length;
  const incomplete = companyItems.length - completed;
  const missingHeaders = companyItems.length - headers;
  const missingFooters = companyItems.length - footers;
  const inactive = companyItems.filter((item) => item.status === "Inactive").length;

  return (
    <AppFrame>
      <div className="space-y-5">
        <SectionHeader
          title="Company / Branch Master"
          description="แก้ไขข้อมูลเอกสารประจำสาขา ดูรูป header/footer และจัดการสถานะ branch สำหรับ PR template"
          action={
            <Link className={linkButtonClass("primary")} href={companiesHref({ create: true, includeInactive })}>
              <Plus aria-hidden className="h-4 w-4" />Add Company
            </Link>
          }
        />

        {isCreating ? addCompanyForm({ includeInactive }) : null}

        <div className="grid gap-4 lg:grid-cols-4">
          {filterStatLink({
            active: !activeFilter,
            count: allCompanyGroups.length,
            detail: `${companyItems.length} offices / branches`,
            href: companyListHref({ includeInactive }),
            label: "Company groups",
            tone: "slate",
          })}
          {filterStatLink({
            active: activeFilter === "incomplete",
            count: incomplete,
            detail: `${completed}/${companyItems.length} profiles complete`,
            href: companyListHref({ filter: "incomplete", includeInactive }),
            label: "Missing profiles",
            tone: incomplete ? "blue" : "emerald",
          })}
          {filterStatLink({
            active: activeFilter === "missingHeader",
            count: missingHeaders,
            detail: `${headers}/${companyItems.length} headers uploaded`,
            href: companyListHref({ filter: "missingHeader", includeInactive }),
            label: "Missing headers",
            tone: missingHeaders ? "blue" : "emerald",
          })}
          {filterStatLink({
            active: activeFilter === "missingFooter",
            count: missingFooters,
            detail: `${footers}/${companyItems.length} footers uploaded`,
            href: companyListHref({ filter: "missingFooter", includeInactive }),
            label: "Missing footers",
            tone: missingFooters ? "blue" : "emerald",
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-blue-950">
              {includeInactive ? "Showing active + inactive branches" : "Showing active branches only"}
            </div>
            <p className="mt-1 text-sm leading-6 text-blue-900">
              Deactivate จะซ่อน branch จากการสร้าง PR ใหม่ และเก็บประวัติเอกสารเดิมไว้ครบถ้วน
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {includeInactive ? (
              <Link className={linkButtonClass(activeFilter === "inactive" ? "primary" : "secondary")} href={companyListHref({ filter: "inactive", includeInactive })}>
                {inactive} inactive
              </Link>
            ) : null}
            <Link className={linkButtonClass(includeInactive ? "secondary" : "primary")} href={companiesHref({ includeInactive: !includeInactive })}>
              {includeInactive ? "Hide inactive" : "Show inactive"}
            </Link>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
          <TableWrap>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] table-fixed border-collapse">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[34%]" />
                  <col className="w-[23%]" />
                  <col className="w-[15%]" />
                </colgroup>
                <thead>
                  <tr>
                    {["Company / Office", "Document Profile", "Header / Footer", "Actions"].map((head) => (
                      <th className={`${tableHeaderClass} px-4 py-3`} key={head}>{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companyGroups.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm font-semibold text-muted" colSpan={4}>
                        No branches match this view. Clear the filter or show inactive branches.
                      </td>
                    </tr>
                  ) : (
                    companyGroups.map((group) => (
                      <Fragment key={group.key}>
                        <tr className="border-t border-border bg-slate-100/80">
                          <td className="px-4 py-3" colSpan={4}>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-blue-100 bg-white text-primary">
                                  <Building2 aria-hidden className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="font-bold text-ink">{group.companyName}</div>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                                    <span>Tax ID: {group.taxId}</span>
                                    <span>Codes: {companyCodesSummary(group.companyCodes)}</span>
                                    <span>{group.branchCount} office / branch records</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge tone="neutral">{group.completedCount}/{group.branchCount} profiles complete</Badge>
                                <Badge tone={group.headerCount === group.branchCount ? "success" : "warning"}>{group.headerCount}/{group.branchCount} headers</Badge>
                                <Badge tone={group.footerCount === group.branchCount ? "success" : "warning"}>{group.footerCount}/{group.branchCount} footers</Badge>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {group.branches.map((item) => {
                          const isSelected = selectedBranch?.branchId === item.branchId;

                          return (
                            <tr className={`align-top hover:bg-slate-50 ${isSelected ? "bg-blue-50/70" : ""}`} id={`branch-${item.branchId}`} key={item.branchId}>
                              <td className={`${tableCellClass} min-w-56`}>
                                <div className="flex gap-3 pl-5">
                                  <div className="mt-1 h-10 w-px bg-border" aria-hidden />
                                  <div>
                                    <div className="inline-flex flex-wrap items-center gap-2">
                                      <span className="whitespace-nowrap rounded-md border border-border bg-white px-2 py-1 text-xs font-bold text-primary">{item.officeLabel}</span>
                                      <span className="text-xs font-semibold text-muted">Code {item.branchCode}</span>
                                      <Badge tone={activeTone(item.status)}>{item.status}</Badge>
                                    </div>
                                    <div className="mt-2 text-sm font-bold text-ink">{item.displayName}</div>
                                    <div className="mt-1 text-xs font-semibold text-muted">Company code {item.companyCode}</div>
                                  </div>
                                </div>
                              </td>
                              <td className={`${tableCellClass} min-w-72`}>
                                <div className="font-bold text-ink">{item.documentRefNo}</div>
                                <div className="mt-1 text-sm leading-6 text-ink">{item.documentLegalName}</div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-muted">Tax ID: {item.documentTaxId}</span>
                                  <Badge tone={profileTone(item.profileStatus)}>{item.profileStatus}</Badge>
                                </div>
                              </td>
                              <td className={tableCellClass}>
                                <div className="flex flex-wrap gap-2">
                                  {assetStatusRow({ label: "Header", path: item.headerAssetPath })}
                                  {assetStatusRow({ label: "Footer", path: item.footerAssetPath })}
                                </div>
                              </td>
                              <td className={tableCellClass}>
                                <Link
                                  aria-current={isSelected ? "true" : undefined}
                                  aria-label={`Manage branch ${item.displayName}`}
                                  className={`${linkButtonClass(isSelected ? "primary" : "secondary")} px-2`}
                                  href={companiesHref({ filter: activeFilter, includeInactive, view: item.branchId })}
                                >
                                  <Settings2 aria-hidden className="h-4 w-4" />Manage
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TableWrap>

          <aside>{branchWorkspace({ includeInactive, item: selectedBranch })}</aside>
        </div>

        <Card className="border-blue-200 bg-blue-50/70 shadow-none">
          <div className="flex items-start gap-3">
            <FileImage aria-hidden className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-sm leading-6 text-blue-900">
              Header/Footer preview ใช้รูปเดียวกับที่ส่งให้ Carbone ผ่าน
              <span className="font-bold"> d.companyHeaderImage </span>
              และ
              <span className="font-bold"> d.companyFooterImage </span>
              ส่วน Deactivate branch จะลบเฉพาะ branch ที่ไม่มีเอกสารอ้างอิง หากมี PR หรือ budget อยู่แล้วระบบจะเปลี่ยนเป็น inactive แทน
            </p>
          </div>
        </Card>
      </div>
    </AppFrame>
  );
}
