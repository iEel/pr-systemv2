import { describe, expect, test } from "vitest";
import {
  buildCompanyAssetDeliveryHeaders,
  buildCompanyMasterPanelHref,
  buildCompanyWithBranchCreateData,
  buildCompanyAssetStoragePath,
  buildBranchDocumentProfileUpdateData,
  determineBranchRemovalMode,
  groupCompanyMasterItems,
  mapCompanyMasterItems,
  validateCompanyAssetUploadFile,
} from "../lib/company-master";

describe("company master helpers", () => {
  test("validates header and footer image uploads", () => {
    expect(validateCompanyAssetUploadFile({ name: "Sonic_04_header.png", size: 1024, type: "image/png" })).toMatchObject({
      extension: ".png",
      mimeType: "image/png",
    });
    expect(validateCompanyAssetUploadFile({ name: "Sonic_04_footer.JPG", size: 1024, type: "image/jpeg" })).toMatchObject({
      extension: ".jpg",
      mimeType: "image/jpeg",
    });
    expect(() => validateCompanyAssetUploadFile(null)).toThrow("Header/Footer image is required");
    expect(() => validateCompanyAssetUploadFile({ name: "bad.pdf", size: 1024, type: "application/pdf" })).toThrow(
      "Header/Footer file must be a PNG or JPG image",
    );
    expect(() => validateCompanyAssetUploadFile({ name: "large.png", size: 6 * 1024 * 1024, type: "image/png" })).toThrow(
      "Header/Footer image must be 5 MB or smaller",
    );
  });

  test("builds deterministic branch asset paths", () => {
    expect(buildCompanyAssetStoragePath({ branchId: "br_sonic04", assetType: "HEADER", fileName: "my header.PNG" })).toBe(
      "company-assets/br_sonic04/header.png",
    );
    expect(buildCompanyAssetStoragePath({ branchId: "br_sonic_auto_hq", assetType: "FOOTER", fileName: "footer.jpeg" })).toBe(
      "company-assets/br_sonic_auto_hq/footer.jpg",
    );
  });

  test("builds the upload return URL that keeps the branch workspace open", () => {
    expect(buildCompanyMasterPanelHref({ branchId: "br_sonic04" })).toBe("/masters/companies?view=br_sonic04#branch-workspace-br_sonic04");
    expect(buildCompanyMasterPanelHref({ branchId: "br_itcity", includeInactive: true })).toBe(
      "/masters/companies?includeInactive=1&view=br_itcity#branch-workspace-br_itcity",
    );
  });

  test("builds company and first branch create data with document fallbacks", () => {
    expect(
      buildCompanyWithBranchCreateData({
        branchAddress: " 79/345 Bangkok ",
        branchCode: " hq ",
        branchName: " Sonic HQ ",
        companyCode: " sonic ",
        companyDisplayName: " Sonic ",
        companyLegalName: " บริษัท โซนิค จำกัด ",
        companyTaxId: " 0100000000000 ",
        documentRefNo: " SN17-DOCSA011 ",
      }),
    ).toEqual({
      branch: {
        address: "79/345 Bangkok",
        code: "HQ",
        documentAddress: "79/345 Bangkok",
        documentDisplayName: "Sonic HQ",
        documentLegalName: "บริษัท โซนิค จำกัด",
        documentRefNo: "SN17-DOCSA011",
        documentTaxId: "0100000000000",
        isActive: true,
        name: "Sonic HQ",
      },
      company: {
        code: "SONIC",
        displayName: "Sonic",
        isActive: true,
        legalName: "บริษัท โซนิค จำกัด",
        taxId: "0100000000000",
      },
    });

    expect(() => buildCompanyWithBranchCreateData({ companyCode: "NEW" })).toThrow("Company display name is required");
  });

  test("builds safe document profile update data from form values", () => {
    expect(
      buildBranchDocumentProfileUpdateData({
        displayName: " Sonic 00004 (PT) ",
        documentAddress: " 509/10 Chonburi ",
        documentLegalName: " บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) ",
        documentRefNo: " SN17-DOCSA011 ",
        documentTaxId: " 0107560000427 ",
        isActive: "on",
      }),
    ).toEqual({
      documentAddress: "509/10 Chonburi",
      documentDisplayName: "Sonic 00004 (PT)",
      documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน)",
      documentRefNo: "SN17-DOCSA011",
      documentTaxId: "0107560000427",
      isActive: true,
    });

    expect(buildBranchDocumentProfileUpdateData({ displayName: "", isActive: "" })).toMatchObject({
      documentDisplayName: null,
      isActive: false,
    });
  });

  test("chooses deactivate for referenced branches and delete for unused branches", () => {
    expect(determineBranchRemovalMode({ budgets: 0, purchaseRequests: 0 })).toBe("DELETE");
    expect(determineBranchRemovalMode({ budgets: 1, purchaseRequests: 0 })).toBe("DEACTIVATE");
    expect(determineBranchRemovalMode({ budgets: 0, purchaseRequests: 3 })).toBe("DEACTIVATE");
  });

  test("builds no-store delivery headers for image previews", () => {
    expect(buildCompanyAssetDeliveryHeaders("company-assets/br_sonic04/header.png")).toMatchObject({
      "cache-control": "private, no-store",
      "content-type": "image/png",
      "x-content-type-options": "nosniff",
    });
    expect(buildCompanyAssetDeliveryHeaders("company-assets/br_sonic04/footer.jpg")["content-type"]).toBe("image/jpeg");
  });

  test("maps branch-level document profile values with company fallbacks", () => {
    const rows = mapCompanyMasterItems([
      {
        id: "co_sonic04",
        code: "SONIC04",
        displayName: "Sonic_04",
        legalName: "Sonic Branch 04",
        taxId: "0100000000000",
        isActive: true,
        branches: [
          {
            id: "br_sonic04",
            code: "SONIC04",
            name: "Sonic_04",
            address: null,
            documentAddress: "509/10 Chonburi",
            documentDisplayName: "Sonic 00004 (PT)",
            documentFooterAssetPath: "company-assets/br_sonic04/footer.png",
            documentHeaderAssetPath: null,
            documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
            documentRefNo: "SN17-DOCSA011",
            documentTaxId: "0107560000427",
            isActive: true,
          },
        ],
      },
      {
        id: "co_itcity",
        code: "ITCITY",
        displayName: "IT City",
        legalName: "IT City Public Co., Ltd.",
        taxId: null,
        isActive: true,
        branches: [
          {
            id: "br_itcity",
            code: "ITCITY",
            name: "IT City",
            address: null,
            documentAddress: null,
            documentDisplayName: null,
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: null,
            documentRefNo: null,
            documentTaxId: null,
            isActive: true,
          },
        ],
      },
    ]);

    expect(rows[0]).toMatchObject({
      branchId: "br_sonic04",
      displayName: "Sonic 00004 (PT)",
      documentAddress: "509/10 Chonburi",
      documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
      documentRefNo: "SN17-DOCSA011",
      documentTaxId: "0107560000427",
      footerAssetPath: "company-assets/br_sonic04/footer.png",
      headerAssetPath: null,
      status: "Active",
    });
    expect(rows[1]).toMatchObject({
      displayName: "IT City",
      documentLegalName: "IT City Public Co., Ltd.",
      documentTaxId: "-",
      documentRefNo: "-",
      profileStatus: "Incomplete",
    });
  });

  test("groups headquarters and branches by document tax id", () => {
    const rows = mapCompanyMasterItems([
      {
        id: "co_sonic_hq",
        code: "SONICHQ",
        displayName: "Sonic HQ",
        legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สำนักงานใหญ่)",
        taxId: "0107560000427",
        isActive: true,
        branches: [
          {
            id: "br_sonic_hq",
            code: "HQ",
            name: "Sonic HQ",
            address: "Bangkok",
            documentAddress: "Bangkok",
            documentDisplayName: "Sonic HQ",
            documentFooterAssetPath: "company-assets/br_sonic_hq/footer.png",
            documentHeaderAssetPath: "company-assets/br_sonic_hq/header.png",
            documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สำนักงานใหญ่)",
            documentRefNo: "SN17-DOCSA011",
            documentTaxId: "0107560000427",
            isActive: true,
          },
        ],
      },
      {
        id: "co_sonic04",
        code: "SONIC04",
        displayName: "Sonic 00004 (PT)",
        legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
        taxId: "0107560000427",
        isActive: true,
        branches: [
          {
            id: "br_sonic04",
            code: "00004",
            name: "Sonic 00004 (PT)",
            address: "Chonburi",
            documentAddress: "Chonburi",
            documentDisplayName: "Sonic 00004 (PT)",
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
            documentRefNo: "SN17-DOCSA011",
            documentTaxId: "0107560000427",
            isActive: true,
          },
        ],
      },
    ]);

    expect(groupCompanyMasterItems(rows)).toEqual([
      expect.objectContaining({
        branchCount: 2,
        companyName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน)",
        footerCount: 1,
        headerCount: 1,
        taxId: "0107560000427",
        branches: [
          expect.objectContaining({ branchId: "br_sonic_hq", officeLabel: "สำนักงานใหญ่" }),
          expect.objectContaining({ branchId: "br_sonic04", officeLabel: "สาขา 00004" }),
        ],
      }),
    ]);
  });

  test("orders headquarters before branch offices inside a company group", () => {
    const rows = mapCompanyMasterItems([
      {
        id: "co_sonic04",
        code: "SONIC04",
        displayName: "Sonic 00004 (PT)",
        legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
        taxId: "0107560000427",
        isActive: true,
        branches: [
          {
            id: "br_sonic04",
            code: "00004",
            name: "Sonic 00004 (PT)",
            address: null,
            documentAddress: "Chonburi",
            documentDisplayName: "Sonic 00004 (PT)",
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สาขา: 00004)",
            documentRefNo: "SN17-DOCSA011",
            documentTaxId: "0107560000427",
            isActive: true,
          },
        ],
      },
      {
        id: "co_sonic_hq",
        code: "SONICHQ",
        displayName: "Sonic HQ",
        legalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สำนักงานใหญ่)",
        taxId: "0107560000427",
        isActive: true,
        branches: [
          {
            id: "br_sonic_hq",
            code: "HQ",
            name: "Sonic HQ",
            address: null,
            documentAddress: "Bangkok",
            documentDisplayName: "Sonic HQ",
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: "บริษัท โซนิค อินเตอร์เฟรท จำกัด (มหาชน) (สำนักงานใหญ่)",
            documentRefNo: "SN17-DOCSA011",
            documentTaxId: "0107560000427",
            isActive: true,
          },
        ],
      },
    ]);

    expect(groupCompanyMasterItems(rows)[0].branches.map((branch) => branch.officeLabel)).toEqual(["สำนักงานใหญ่", "สาขา 00004"]);
  });

  test("hides inactive company or branch records unless requested", () => {
    const companies = [
      {
        id: "co_active",
        code: "ACTIVE",
        displayName: "Active Co",
        legalName: "Active Company",
        taxId: null,
        isActive: true,
        branches: [
          {
            id: "br_active",
            code: "HQ",
            name: "HQ",
            address: null,
            documentAddress: "Bangkok",
            documentDisplayName: "Active HQ",
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: "Active Company",
            documentRefNo: "AC01",
            documentTaxId: "0100000000000",
            isActive: true,
          },
          {
            id: "br_inactive",
            code: "OLD",
            name: "Old",
            address: null,
            documentAddress: "Bangkok",
            documentDisplayName: "Inactive Branch",
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: "Inactive Branch",
            documentRefNo: "AC02",
            documentTaxId: "0100000000000",
            isActive: false,
          },
        ],
      },
      {
        id: "co_inactive",
        code: "INACTIVE",
        displayName: "Inactive Co",
        legalName: "Inactive Company",
        taxId: null,
        isActive: false,
        branches: [
          {
            id: "br_inactive_company",
            code: "HQ",
            name: "HQ",
            address: null,
            documentAddress: "Bangkok",
            documentDisplayName: "Inactive Company Branch",
            documentFooterAssetPath: null,
            documentHeaderAssetPath: null,
            documentLegalName: "Inactive Company Branch",
            documentRefNo: "IC01",
            documentTaxId: "0100000000001",
            isActive: true,
          },
        ],
      },
    ];

    expect(mapCompanyMasterItems(companies).map((item) => item.branchId)).toEqual(["br_active"]);
    expect(mapCompanyMasterItems(companies, { includeInactive: true }).map((item) => item.branchId)).toEqual([
      "br_active",
      "br_inactive",
      "br_inactive_company",
    ]);
  });
});
