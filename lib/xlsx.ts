import JSZip from "jszip";

export type XlsxCell = string | number | boolean | null | undefined;

export type XlsxSheet = {
  name: string;
  rows: XlsxCell[][];
};

export type XlsxWorkbook = {
  sheets: XlsxSheet[];
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = "";
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }

  return value;
}

function cleanSheetName(name: string, index: number) {
  const cleaned = name.replace(/[\[\]:*?/\\]/g, " ").trim() || `Sheet ${index}`;
  return cleaned.slice(0, 31);
}

function cellXml(value: XlsxCell, cellRef: string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${cellRef}"><v>${value}</v></c>`;
  }

  if (typeof value === "boolean") {
    return `<c r="${cellRef}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  const text = value === null || value === undefined ? "" : String(value);
  return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`;
}

function worksheetXml(sheet: XlsxSheet) {
  const rows = sheet.rows
    .map((row, rowIndex) => {
      const rowNo = rowIndex + 1;
      const cells = row.map((cell, cellIndex) => cellXml(cell, `${columnName(cellIndex + 1)}${rowNo}`)).join("");
      return `<row r="${rowNo}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows}</sheetData>
</worksheet>`;
}

function workbookXml(sheets: XlsxSheet[]) {
  const sheetEntries = sheets
    .map((sheet, index) => `<sheet name="${escapeXml(cleanSheetName(sheet.name, index + 1))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEntries}</sheets>
</workbook>`;
}

function workbookRelationshipsXml(sheets: XlsxSheet[]) {
  const worksheetRelationships = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${worksheetRelationships}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesXml(sheets: XlsxSheet[]) {
  const worksheetOverrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${worksheetOverrides}
</Types>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`;
}

export async function buildXlsxWorkbook(workbook: XlsxWorkbook) {
  const sheets = workbook.sheets.length ? workbook.sheets : [{ name: "Sheet 1", rows: [] }];
  const zip = new JSZip();

  zip.file("[Content_Types].xml", contentTypesXml(sheets));
  zip.folder("_rels")?.file(".rels", rootRelationshipsXml());
  zip.folder("xl")?.file("workbook.xml", workbookXml(sheets));
  zip.folder("xl")?.file("styles.xml", stylesXml());
  zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", workbookRelationshipsXml(sheets));

  const worksheets = zip.folder("xl")?.folder("worksheets");
  sheets.forEach((sheet, index) => {
    worksheets?.file(`sheet${index + 1}.xml`, worksheetXml(sheet));
  });

  return zip.generateAsync({ type: "uint8array" });
}
