import "dotenv/config";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";

const scrypt = promisify(crypto.scrypt);

function createPrisma() {
  const adapter = new PrismaMssql({
    server: process.env.SQLSERVER_HOST,
    port: process.env.SQLSERVER_INSTANCE ? undefined : Number(process.env.SQLSERVER_PORT || 1433),
    database: process.env.SQLSERVER_DATABASE,
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    options: {
      instanceName: process.env.SQLSERVER_INSTANCE || undefined,
      encrypt: true,
      trustServerCertificate: process.env.SQLSERVER_TRUST_CERT !== "false",
    },
  });

  return new PrismaClient({ adapter });
}

const prisma = createPrisma();
const userId = "user_admin_seed";
const templateId = "tpl_pr_standard_v1";

async function hashPassword(password) {
  const salt = "phase4devadminsalt";
  const key = await scrypt(password, salt, 64);

  return `scrypt$1$${salt}$${Buffer.from(key).toString("hex")}`;
}

const companies = [
  {
    id: "co_grandlink",
    code: "GRANDLINK",
    displayName: "Grandlink",
    legalName: "บริษัท แกรนด์ลิงค์ ลอจิสติคส์ จำกัด (สำนักงานใหญ่)",
    taxId: "0105558158599",
    branchId: "br_grandlink_hq",
    branchCode: "GRANDLINK",
    branchName: "Grandlink",
    documentRefNo: "GL17-DOCSA011",
    documentLegalName: "บริษัท แกรนด์ลิงค์ ลอจิสติคส์ จำกัด (สำนักงานใหญ่)",
    documentTaxId: "0105558158599",
    documentAddress: "79/345-350 ถนนสาธุประดิษฐ์ แขวงช่องนนทรี เขตยานนาวา กรุงเทพมหานคร 10120",
    documentDisplayName: "Grandlink",
  },
  {
    id: "co_sonichq",
    code: "SONICHQ",
    displayName: "Sonic HQ",
    legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สำนักงานใหญ่)",
    taxId: "0107560000427",
    branchId: "br_sonichq",
    branchCode: "HQ",
    branchName: "Sonic HQ",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สำนักงานใหญ่)",
    documentTaxId: "0107560000427",
    documentAddress: "79/349,350 ชั้นที่ 1,2 ถนนสาธุประดิษฐ์ แขวงช่องนนทรี เขตยานนาวา กรุงเทพมหานคร 10120",
    documentDisplayName: "Sonic HQ",
  },
  {
    id: "co_sonic01",
    code: "SONIC01",
    displayName: "Sonic 00001 (DC)",
    legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00001)",
    taxId: "0107560000427",
    branchId: "br_sonic01",
    branchCode: "00001",
    branchName: "Sonic 00001 (DC)",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00001)",
    documentTaxId: "0107560000427",
    documentAddress: "84 หมู่ที่15 ซอยกิ่งแกว้ 21 ถนนกิ่งแก้ว ตำบลบางพลีใหญ่ อำเภอบางพลี สมุทรปราการ 10540",
    documentDisplayName: "Sonic 00001 (DC)",
  },
  {
    id: "co_sonic02",
    code: "SONIC02",
    displayName: "Sonic 00002 (TR)",
    legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00002)",
    taxId: "0107560000427",
    branchId: "br_sonic02",
    branchCode: "00002",
    branchName: "Sonic 00002 (TR)",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00002)",
    documentTaxId: "0107560000427",
    documentAddress: "84/1 หมู่ที่15 ถนนกิ่งแก้ว ตำบลบางพลีใหญ่ อำเภอบางพลี สมุทรปราการ 10540",
    documentDisplayName: "Sonic 00002 (TR)",
  },
  {
    id: "co_sonic03",
    code: "SONIC03",
    displayName: "Sonic 00003 (LCB)",
    legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00003)",
    taxId: "0107560000427",
    branchId: "br_sonic03",
    branchCode: "00003",
    branchName: "Sonic 00003 (LCB)",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00003)",
    documentTaxId: "0107560000427",
    documentAddress: "106/45-46 หมู่ที่ 9 ตำบลทุ่งสุขลา อำเภอศรีราชา ชลบุรี 20230",
    documentDisplayName: "Sonic 00003 (LCB)",
  },
  {
    id: "co_sonic04",
    code: "SONIC04",
    displayName: "Sonic 00004 (PT)",
    legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
    taxId: "0107560000427",
    branchId: "br_sonic04",
    branchCode: "00004",
    branchName: "Sonic 00004 (PT)",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
    documentTaxId: "0107560000427",
    documentAddress: "509/10 หมู่ 3 ตำบลหนองขาม อำเภอศรีราชา จังหวัดชลบุรี 20110",
    documentDisplayName: "Sonic 00004 (PT)",
  },
  {
    id: "co_sonic06",
    code: "SONIC06",
    displayName: "Sonic Tip7 00006",
    legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00006)",
    taxId: "0107560000427",
    branchId: "br_sonic06",
    branchCode: "00006",
    branchName: "Sonic Tip7 00006",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00006)",
    documentTaxId: "0107560000427",
    documentAddress: "789/3 หมู่ที่ 9 ตำบลบางปลา อำเภอบางพลี จังหวัดสมุทรปราการ 10540",
    documentDisplayName: "Sonic Tip7 00006",
  },
  {
    id: "co_sonic_auto_hq",
    code: "SONICAUTOHQ",
    displayName: "Sonic Autologis HQ",
    legalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สำนักงานใหญ่)",
    taxId: "0105568017319",
    branchId: "br_sonic_auto_hq",
    branchCode: "HQ",
    branchName: "Sonic Autologis HQ",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สำนักงานใหญ่)",
    documentTaxId: "0105568017319",
    documentAddress: "79/345-350 ถนนสาธุประดิษฐ์ แขวงช่องนนทรี เขตยานนาวา กรุงเทพมหานคร 10120",
    documentDisplayName: "Sonic Autologis HQ",
  },
  {
    id: "co_sonic_auto_01",
    code: "SONICAUTO01",
    displayName: "Sonic Autologis 00001",
    legalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สาขา: 00001)",
    taxId: "0105568017319",
    branchId: "br_sonic_auto_01",
    branchCode: "00001",
    branchName: "Sonic Autologis 00001",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สาขา: 00001)",
    documentTaxId: "0105568017319",
    documentAddress: "84 หมู่ที่15 ซอยกิ่งแกว้ 21 ถนนกิ่งแก้ว ตำบลบางพลีใหญ่ อำเภอบางพลี สมุทรปราการ 10540",
    documentDisplayName: "Sonic Autologis 00001",
  },
  {
    id: "co_sonic_auto_02",
    code: "SONICAUTO02",
    displayName: "Sonic Autologis 00002",
    legalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สาขา: 00002)",
    taxId: "0105568017319",
    branchId: "br_sonic_auto_02",
    branchCode: "00002",
    branchName: "Sonic Autologis 00002",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สาขา: 00002)",
    documentTaxId: "0105568017319",
    documentAddress: "84/1 หมู่ที่15 ถนนกิ่งแก้ว ตำบลบางพลีใหญ่ อำเภอบางพลี สมุทรปราการ 10540",
    documentDisplayName: "Sonic Autologis 00002",
  },
  {
    id: "co_sonic_auto_03",
    code: "SONICAUTO03",
    displayName: "Sonic Autologis 00003",
    legalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สาขา: 00003)",
    taxId: "0105568017319",
    branchId: "br_sonic_auto_03",
    branchCode: "00003",
    branchName: "Sonic Autologis 00003",
    documentRefNo: "SN17-DOCSA011",
    documentLegalName: "บริษัท โซนิค ออโตโลจิส จำกัด (สาขา: 00003)",
    documentTaxId: "0105568017319",
    documentAddress: "789/3 หมู่ที่ 9 ตำบลบางปลา อำเภอบางพลี จังหวัดสมุทรปราการ 10540",
    documentDisplayName: "Sonic Autologis 00003",
  },
  {
    id: "co_sonic_ins",
    code: "SONICINS",
    displayName: "SONIC INSURANCE",
    legalName: "SONIC INSURANCE",
    branchId: "br_sonic_ins",
    branchCode: "SONICINS",
    branchName: "SONIC INSURANCE",
    documentRefNo: "SN17-DOCSA011",
    documentDisplayName: "SONIC INSURANCE",
    isActive: false,
  },
  { id: "co_itcity", code: "ITCITY", displayName: "IT City", legalName: "IT City Public Co., Ltd.", branchId: "br_itcity", branchCode: "ITCITY", branchName: "IT City" },
];

const departments = [
  { id: "dep_it", name: "IT" },
  { id: "dep_it_operation", name: "IT Operation" },
  { id: "dep_infra", name: "Infrastructure" },
  { id: "dep_helpdesk", name: "Helpdesk" },
];

const divisions = [
  { id: "div_it", departmentId: "dep_it", name: "IT" },
  { id: "div_it_infra", departmentId: "dep_it_operation", name: "Infrastructure" },
  { id: "div_network", departmentId: "dep_infra", name: "Network" },
  { id: "div_server", departmentId: "dep_infra", name: "Server Platform" },
  { id: "div_service_desk", departmentId: "dep_helpdesk", name: "Service Desk" },
  { id: "div_endpoint", departmentId: "dep_it_operation", name: "Endpoint" },
];

const prCategories = [
  { id: "cat_hardware", code: "HARDWARE", name: "Hardware & Equipment", description: null, sortOrder: 10, isActive: true },
  { id: "cat_software_license", code: "SOFTWARE_LICENSE", name: "Software & Licenses", description: null, sortOrder: 20, isActive: true },
  { id: "cat_subscription_renewal", code: "SUBSCRIPTION_RENEWAL", name: "Subscription & Renewal", description: null, sortOrder: 30, isActive: true },
  { id: "cat_service_maintenance", code: "SERVICE_MAINTENANCE", name: "Service & Maintenance", description: null, sortOrder: 40, isActive: true },
  { id: "cat_network_infra", code: "NETWORK_INFRASTRUCTURE", name: "Network & Infrastructure", description: null, sortOrder: 50, isActive: true },
  { id: "cat_cloud_hosting", code: "CLOUD_HOSTING", name: "Cloud & Hosting", description: null, sortOrder: 60, isActive: true },
  { id: "cat_other", code: "OTHER", name: "Other", description: null, sortOrder: 70, isActive: true },
];

const purchaseRequests = [
  { id: "pr_seed_2606001", prNo: "ITPR_2606001", refNo: "REF-IT-2606-0044", companyId: "co_grandlink", branchId: "br_grandlink_hq", departmentId: "dep_it_operation", divisionId: "div_it_infra", categoryId: "cat_hardware", documentDate: "2026-06-20", status: "PRINTED", totalAmount: "116255.50", subtotal: "108650.00", vatAmount: "7605.50" },
  { id: "pr_seed_2606002", prNo: "ITPR_2606002", refNo: "REF-IT-2606-0045", companyId: "co_sonic04", branchId: "br_sonic04", departmentId: "dep_infra", divisionId: "div_network", categoryId: "cat_network_infra", documentDate: "2026-06-21", status: "GENERATED", totalAmount: "78950.00", subtotal: "73785.05", vatAmount: "5164.95" },
  { id: "pr_seed_2606003", prNo: "ITPR_2606003", refNo: "REF-IT-2606-0046", companyId: "co_itcity", branchId: "br_itcity", departmentId: "dep_helpdesk", divisionId: "div_service_desk", categoryId: "cat_subscription_renewal", documentDate: "2026-06-22", status: "DRAFT", totalAmount: "24500.00", subtotal: "22897.20", vatAmount: "1602.80" },
  { id: "pr_seed_2606004", prNo: "ITPR_2606004", refNo: "REF-IT-2606-0047", companyId: "co_sonichq", branchId: "br_sonichq", departmentId: "dep_infra", divisionId: "div_server", categoryId: "cat_software_license", documentDate: "2026-06-23", status: "SIGNED", totalAmount: "324210.35", subtotal: "302065.75", vatAmount: "22144.60" },
  { id: "pr_seed_2606005", prNo: "ITPR_2606005", refNo: "REF-IT-2606-0048", companyId: "co_sonic04", branchId: "br_sonic04", departmentId: "dep_it_operation", divisionId: "div_endpoint", categoryId: "cat_service_maintenance", documentDate: "2026-06-24", status: "CANCELLED", totalAmount: "12500.00", subtotal: "11682.24", vatAmount: "817.76" },
  { id: "pr_seed_2606006", prNo: "ITPR_2606006", refNo: "REF-IT-2606-0049", companyId: "co_sonic04", branchId: "br_sonic04", departmentId: "dep_infra", divisionId: "div_network", categoryId: "cat_cloud_hosting", documentDate: "2026-06-25", status: "REISSUED", totalAmount: "32421.00", subtotal: "30300.00", vatAmount: "2121.00" },
];

const firstPrItems = [
  { lineNo: 1, accountCode: "51510101", description: "Dell PowerEdge R750 Server", quantity: "1", unitCost: "78500.00", totalAmount: "78500.00" },
  { lineNo: 2, accountCode: "51520101", description: "Samsung SSD 1.92TB SATA", quantity: "2", unitCost: "12450.00", totalAmount: "24900.00" },
  { lineNo: 3, accountCode: "51530101", description: "UPS Battery Replacement Pack", quantity: "1", unitCost: "5250.50", totalAmount: "5250.50" },
];

async function seedUser() {
  const passwordHash = await hashPassword("admin123");

  return prisma.user.upsert({
    where: { username: "admin" },
    create: {
      id: userId,
      username: "admin",
      displayName: "Admin User",
      email: "admin@example.local",
      authProvider: "LOCAL",
      externalId: null,
      externalUsername: null,
      lastLoginAt: null,
      passwordHash,
      role: "ADMIN",
    },
    update: {
      authProvider: "LOCAL",
      displayName: "Admin User",
      externalId: null,
      externalUsername: null,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
}

async function seedMasters() {
  for (const company of companies) {
    await prisma.company.upsert({
      where: { code: company.code },
      create: {
        id: company.id,
        code: company.code,
        displayName: company.displayName,
        legalName: company.legalName,
        taxId: company.taxId || null,
        isActive: company.isActive !== false,
      },
      update: {
        displayName: company.displayName,
        legalName: company.legalName,
        taxId: company.taxId || null,
        isActive: company.isActive !== false,
      },
    });

    await prisma.branch.upsert({
      where: { id: company.branchId },
      create: {
        id: company.branchId,
        companyId: company.id,
        code: company.branchCode,
        name: company.branchName,
        address: company.documentAddress || null,
        documentAddress: company.documentAddress || null,
        documentDisplayName: company.documentDisplayName || null,
        documentLegalName: company.documentLegalName || null,
        documentRefNo: company.documentRefNo || null,
        documentTaxId: company.documentTaxId || null,
        isActive: company.isActive !== false,
      },
      update: {
        address: company.documentAddress || null,
        code: company.branchCode,
        companyId: company.id,
        documentAddress: company.documentAddress || null,
        documentDisplayName: company.documentDisplayName || null,
        documentLegalName: company.documentLegalName || null,
        documentRefNo: company.documentRefNo || null,
        documentTaxId: company.documentTaxId || null,
        name: company.branchName,
        isActive: company.isActive !== false,
      },
    });
  }

  for (const department of departments) {
    await prisma.department.upsert({
      where: { name: department.name },
      create: department,
      update: { isActive: true },
    });
  }

  for (const division of divisions) {
    await prisma.division.upsert({
      where: { departmentId_name: { departmentId: division.departmentId, name: division.name } },
      create: division,
      update: { isActive: true },
    });
  }

  for (const category of prCategories) {
    await prisma.purchaseRequestCategory.upsert({
      where: { code: category.code },
      create: category,
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      },
    });
  }
}

async function seedTemplateAndRunningNumber(adminId) {
  await prisma.documentTemplate.upsert({
    where: { name_version_templateType: { name: "PR_STANDARD", version: "V1", templateType: "DOCX" } },
    create: {
      id: templateId,
      name: "PR_STANDARD",
      version: "V1",
      templateType: "DOCX",
      contractName: "IT PR Contract",
      status: "ACTIVE",
      fileName: "PR_STANDARD_V1.docx",
      storagePath: "templates/PR_STANDARD_V1.docx",
      createdById: adminId,
      activatedAt: new Date("2026-06-25T10:20:00.000Z"),
      validationJson: JSON.stringify({ totalTagsFound: 28, missingRequiredTags: 0, unknownTags: 0 }),
    },
    update: {
      status: "ACTIVE",
      validationJson: JSON.stringify({ totalTagsFound: 28, missingRequiredTags: 0, unknownTags: 0 }),
    },
  });

  await prisma.runningNumberSetting.upsert({
    where: { id: "rn_itpr_global" },
    create: {
      id: "rn_itpr_global",
      documentType: "ITPR",
      prefix: "ITPR_",
      yearFormat: "YY",
      monthFormat: "MM",
      padding: 3,
      currentValue: 6,
    },
    update: {
      prefix: "ITPR_",
      yearFormat: "YY",
      monthFormat: "MM",
      padding: 3,
      currentValue: 6,
    },
  });
}

async function seedPurchaseRequests(adminId) {
  for (const pr of purchaseRequests) {
    await prisma.purchaseRequest.upsert({
      where: { id: pr.id },
      create: {
        id: pr.id,
        prNo: pr.prNo,
        refNo: pr.refNo,
        companyId: pr.companyId,
        branchId: pr.branchId,
        departmentId: pr.departmentId,
        divisionId: pr.divisionId,
        categoryId: pr.categoryId,
        documentDate: new Date(`${pr.documentDate}T00:00:00.000Z`),
        requiredDate: new Date("2026-07-02T00:00:00.000Z"),
        purpose: "ซื้อใหม่",
        purchaseMethod: "ฝ่ายจัดซื้อ",
        remark: "Seed data for Phase 2 DB-backed PR list",
        subtotal: pr.subtotal,
        vatRate: "7.00",
        vatAmount: pr.vatAmount,
        totalAmount: pr.totalAmount,
        status: pr.status,
        templateVersionId: templateId,
        generatedSnapshotJson: pr.status === "DRAFT" ? null : JSON.stringify({ prNo: pr.prNo, seeded: true }),
        createdById: adminId,
        generatedAt: pr.status === "DRAFT" ? null : new Date(`${pr.documentDate}T02:18:00.000Z`),
        printedAt: ["PRINTED", "SIGNED"].includes(pr.status) ? new Date(`${pr.documentDate}T03:05:00.000Z`) : null,
        signedAt: pr.status === "SIGNED" ? new Date(`${pr.documentDate}T09:45:00.000Z`) : null,
        cancelledAt: pr.status === "CANCELLED" ? new Date(`${pr.documentDate}T09:00:00.000Z`) : null,
      },
      update: {
        status: pr.status,
        categoryId: pr.categoryId,
        subtotal: pr.subtotal,
        vatAmount: pr.vatAmount,
        totalAmount: pr.totalAmount,
      },
    });
  }

  for (const item of firstPrItems) {
    await prisma.purchaseRequestItem.upsert({
      where: { purchaseRequestId_lineNo: { purchaseRequestId: "pr_seed_2606001", lineNo: item.lineNo } },
      create: {
        id: `pri_seed_2606001_${item.lineNo}`,
        purchaseRequestId: "pr_seed_2606001",
        ...item,
      },
      update: item,
    });
  }

  for (const pr of purchaseRequests.filter((item) => item.id !== "pr_seed_2606001")) {
    const suffix = pr.prNo.replace("ITPR_", "");
    const item = {
      lineNo: 1,
      accountCode: "51590101",
      description: `${pr.prNo} seeded IT service line`,
      quantity: "1",
      unitCost: pr.subtotal,
      totalAmount: pr.subtotal,
    };

    await prisma.purchaseRequestItem.upsert({
      where: { purchaseRequestId_lineNo: { purchaseRequestId: pr.id, lineNo: item.lineNo } },
      create: {
        id: `pri_${suffix}_1`,
        purchaseRequestId: pr.id,
        ...item,
      },
      update: item,
    });
  }

  for (const pr of purchaseRequests) {
    const suffix = pr.prNo.replace("ITPR_", "");

    await prisma.purchaseRequestAttachment.upsert({
      where: { purchaseRequestId_type_version: { purchaseRequestId: pr.id, type: "QUOTATION", version: 1 } },
      create: {
        id: `att_${suffix}_quo`,
        purchaseRequestId: pr.id,
        type: "QUOTATION",
        version: 1,
        fileName: `${pr.prNo}_quotation.pdf`,
        mimeType: "application/pdf",
        fileSize: 384000,
        storagePath: `attachments/${pr.prNo}/quotation.pdf`,
        sha256: `${suffix}`.padStart(64, "0"),
        uploadedById: adminId,
        uploadedAt: new Date(`${pr.documentDate}T01:30:00.000Z`),
      },
      update: {
        fileName: `${pr.prNo}_quotation.pdf`,
        storagePath: `attachments/${pr.prNo}/quotation.pdf`,
      },
    });

    if (pr.status !== "DRAFT") {
      await prisma.purchaseRequestAttachment.upsert({
        where: { purchaseRequestId_type_version: { purchaseRequestId: pr.id, type: "GENERATED_PDF", version: 1 } },
        create: {
          id: `att_${suffix}_gen`,
          purchaseRequestId: pr.id,
          type: "GENERATED_PDF",
          version: 1,
          fileName: `${pr.prNo}.pdf`,
          mimeType: "application/pdf",
          fileSize: 512000,
          storagePath: `generated/${pr.prNo}.pdf`,
          sha256: `${suffix}1`.padStart(64, "0"),
          uploadedById: adminId,
          uploadedAt: new Date(`${pr.documentDate}T02:18:00.000Z`),
        },
        update: {
          fileName: `${pr.prNo}.pdf`,
          storagePath: `generated/${pr.prNo}.pdf`,
        },
      });
    }

    if (pr.status === "SIGNED") {
      await prisma.purchaseRequestAttachment.upsert({
        where: { purchaseRequestId_type_version: { purchaseRequestId: pr.id, type: "SIGNED_PDF", version: 1 } },
        create: {
          id: `att_${suffix}_sig`,
          purchaseRequestId: pr.id,
          type: "SIGNED_PDF",
          version: 1,
          fileName: `${pr.prNo}_signed_v1.pdf`,
          mimeType: "application/pdf",
          fileSize: 612000,
          storagePath: `signed/${pr.prNo}_signed_v1.pdf`,
          sha256: `${suffix}2`.padStart(64, "0"),
          uploadedById: adminId,
          uploadedAt: new Date(`${pr.documentDate}T09:45:00.000Z`),
        },
        update: {
          fileName: `${pr.prNo}_signed_v1.pdf`,
          storagePath: `signed/${pr.prNo}_signed_v1.pdf`,
        },
      });
    }
  }

  await prisma.auditLog.deleteMany({ where: { id: "audit_pr2606001_gen" } });

  const auditEvents = purchaseRequests.flatMap((pr) => {
    const suffix = pr.prNo.replace("ITPR_", "");
    const events = [
      {
        id: `aud_${suffix}_draft`,
        entityId: pr.id,
        action: "Draft created",
        detail: "Created seed PR draft",
        createdAt: `${pr.documentDate}T01:15:00.000Z`,
      },
    ];

    if (pr.status !== "DRAFT") {
      events.push({
        id: `aud_${suffix}_gen`,
        entityId: pr.id,
        action: "Generated PDF",
        detail: "Rendered PR_STANDARD V1 and stored snapshot",
        createdAt: `${pr.documentDate}T02:18:00.000Z`,
      });
    }

    if (["PRINTED", "SIGNED"].includes(pr.status)) {
      events.push({
        id: `aud_${suffix}_print`,
        entityId: pr.id,
        action: "Marked printed",
        detail: "Document printed for physical signature",
        createdAt: `${pr.documentDate}T03:05:00.000Z`,
      });
    }

    if (pr.status === "SIGNED") {
      events.push({
        id: `aud_${suffix}_sign`,
        entityId: pr.id,
        action: "Uploaded signed document",
        detail: "Stored signed_v1 file without overwriting previous records",
        createdAt: `${pr.documentDate}T09:45:00.000Z`,
      });
    }

    if (pr.status === "CANCELLED") {
      events.push({
        id: `aud_${suffix}_cancel`,
        entityId: pr.id,
        action: "Cancelled",
        detail: "Cancelled seed PR for workflow visibility",
        createdAt: `${pr.documentDate}T09:00:00.000Z`,
      });
    }

    if (pr.status === "REISSUED") {
      events.push({
        id: `aud_${suffix}_reissue`,
        entityId: pr.id,
        action: "Reissued",
        detail: "Created replacement trace for controlled document flow",
        createdAt: `${pr.documentDate}T09:30:00.000Z`,
      });
    }

    return events;
  });

  for (const event of auditEvents) {
    await prisma.auditLog.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        entityType: "PurchaseRequest",
        entityId: event.entityId,
        action: event.action,
        actorId: adminId,
        metadataJson: JSON.stringify({ detail: event.detail, seeded: true }),
        createdAt: new Date(event.createdAt),
      },
      update: {
        metadataJson: JSON.stringify({ detail: event.detail, seeded: true }),
      },
    });
  }
}

async function main() {
  const admin = await seedUser();
  await seedMasters();
  await seedTemplateAndRunningNumber(admin.id);
  await seedPurchaseRequests(admin.id);

  console.log(
    JSON.stringify({
      ok: true,
      users: 1,
      companies: companies.length,
      departments: departments.length,
      divisions: divisions.length,
      purchaseRequests: purchaseRequests.length,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
