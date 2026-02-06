import fs from "fs";
import path from "path";

interface FrxField {
  name: string;
  type: string;
  length: number;
  decimals: number;
}

interface FrxRecord {
  OBJTYPE: number;
  OBJCODE: number;
  NAME: string | null;
  EXPR: string | null;
  VPOS: number;
  HPOS: number;
  HEIGHT: number;
  WIDTH: number;
  FONTFACE: string | null;
  FONTSIZE: number;
  FONTSTYLE: number;
  PICTURE: string | null;
  ORDER: string | null;
  TAG: string | null;
  TAG2: string | null;
  TOTALTYPE: number;
  RESETTOTAL: number;
  PENRED: number;
  PENGREEN: number;
  PENBLUE: number;
  FILLRED: number;
  FILLGREEN: number;
  FILLBLUE: number;
  PENSIZE: number;
}

export interface ReportBand {
  type: string;
  objcode: number;
  height: number;
  width: number;
  expr: string | null;
  objects: ReportObject[];
}

export interface ReportObject {
  type: "label" | "field" | "line" | "variable";
  expr: string | null;
  vpos: number;
  hpos: number;
  height: number;
  width: number;
  fontFace: string | null;
  fontSize: number;
  fontStyle: number;
  picture: string | null;
  totalType: number;
  resetTotal: number;
  name: string | null;
  tag: string | null;
}

export interface ReportVariable {
  name: string;
  expr: string;
  totalType: number;
  resetTotal: number;
  initialValue: string | null;
}

export interface ParsedReport {
  orientation: number;
  paperSize: number;
  defaultFont: string;
  defaultFontSize: number;
  dataSource: string | null;
  orderBy: string | null;
  groupExpr: string | null;
  bands: ReportBand[];
  variables: ReportVariable[];
  fontResources: Array<{ fontFace: string; fontSize: number; fontStyle: number }>;
}

const BAND_NAMES: Record<number, string> = {
  0: "title",
  1: "pageHeader",
  2: "columnHeader",
  3: "groupHeader",
  4: "detail",
  5: "groupFooter",
  6: "columnFooter",
  7: "pageFooter",
  8: "summary",
};

function readMemoFromFpt(fptBuf: Buffer, blockNum: number): string | null {
  if (!blockNum || blockNum === 0) return null;
  const blockSize = fptBuf.readUInt16BE(6) || 64;
  const offset = blockNum * blockSize;
  if (offset + 8 > fptBuf.length) return null;
  const dataLen = fptBuf.readUInt32BE(offset + 4);
  if (dataLen <= 0 || dataLen > 65536) return null;
  const data = fptBuf.slice(offset + 8, offset + 8 + dataLen);
  return data.toString("latin1").replace(/\x00/g, "").trim();
}

export function parseFrxFile(frxPath: string, frtPath: string): ParsedReport {
  const dbfBuf = fs.readFileSync(frxPath);
  const fptBuf = fs.readFileSync(frtPath);

  const numRecords = dbfBuf.readUInt32LE(4);
  const headerSize = dbfBuf.readUInt16LE(8);
  const recordSize = dbfBuf.readUInt16LE(10);

  const fields: FrxField[] = [];
  let offset = 32;
  while (dbfBuf[offset] !== 0x0d && offset < headerSize) {
    const name = dbfBuf.slice(offset, offset + 11).toString("ascii").replace(/\x00/g, "");
    const type = String.fromCharCode(dbfBuf[offset + 11]);
    const fieldLen = dbfBuf[offset + 16];
    const decimalCount = dbfBuf[offset + 17];
    fields.push({ name, type, length: fieldLen, decimals: decimalCount });
    offset += 32;
  }

  const records: FrxRecord[] = [];
  for (let i = 0; i < numRecords; i++) {
    const recOffset = headerSize + i * recordSize;
    if (dbfBuf[recOffset] === 0x2a) continue;

    const rawRecord: Record<string, any> = {};
    let fOffset = recOffset + 1;
    for (const f of fields) {
      if (f.type === "M") {
        const blockNum = dbfBuf.readUInt32LE(fOffset);
        rawRecord[f.name] = readMemoFromFpt(fptBuf, blockNum);
      } else if (f.type === "N") {
        const val = dbfBuf.slice(fOffset, fOffset + f.length).toString("latin1").trim();
        rawRecord[f.name] = val ? parseFloat(val) : 0;
      } else if (f.type === "L") {
        const ch = String.fromCharCode(dbfBuf[fOffset]);
        rawRecord[f.name] = ch === "T" || ch === "t" || ch === "Y" || ch === "y";
      } else {
        rawRecord[f.name] = dbfBuf.slice(fOffset, fOffset + f.length).toString("latin1").trim() || null;
      }
      fOffset += f.length;
    }

    records.push({
      OBJTYPE: rawRecord.OBJTYPE || 0,
      OBJCODE: rawRecord.OBJCODE || 0,
      NAME: rawRecord.NAME || null,
      EXPR: rawRecord.EXPR || null,
      VPOS: rawRecord.VPOS || 0,
      HPOS: rawRecord.HPOS || 0,
      HEIGHT: rawRecord.HEIGHT || 0,
      WIDTH: rawRecord.WIDTH || 0,
      FONTFACE: rawRecord.FONTFACE || null,
      FONTSIZE: rawRecord.FONTSIZE || 0,
      FONTSTYLE: rawRecord.FONTSTYLE || 0,
      PICTURE: rawRecord.PICTURE || null,
      ORDER: rawRecord.ORDER || null,
      TAG: rawRecord.TAG || null,
      TAG2: rawRecord.TAG2 || null,
      TOTALTYPE: rawRecord.TOTALTYPE || 0,
      RESETTOTAL: rawRecord.RESETTOTAL || 0,
      PENRED: rawRecord.PENRED || 0,
      PENGREEN: rawRecord.PENGREEN || 0,
      PENBLUE: rawRecord.PENBLUE || 0,
      FILLRED: rawRecord.FILLRED || 0,
      FILLGREEN: rawRecord.FILLGREEN || 0,
      FILLBLUE: rawRecord.FILLBLUE || 0,
      PENSIZE: rawRecord.PENSIZE || 0,
    });
  }

  let orientation = 0;
  let paperSize = 9;
  let defaultFont = "Arial";
  let defaultFontSize = 10;
  let dataSource: string | null = null;
  let orderBy: string | null = null;
  let groupExpr: string | null = null;

  const reportConfig = records.find((r) => r.OBJTYPE === 1);
  if (reportConfig) {
    if (reportConfig.EXPR) {
      const lines = reportConfig.EXPR.split(/\r?\n/);
      for (const line of lines) {
        const [key, val] = line.split("=");
        if (key === "ORIENTATION") orientation = parseInt(val) || 0;
        if (key === "PAPERSIZE") paperSize = parseInt(val) || 9;
      }
    }
    if (reportConfig.FONTFACE) defaultFont = reportConfig.FONTFACE;
    if (reportConfig.FONTSIZE) defaultFontSize = reportConfig.FONTSIZE;
  }

  const cursorRec = records.find((r) => r.OBJTYPE === 26);
  if (cursorRec && cursorRec.EXPR) {
    const lines = cursorRec.EXPR.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^(\w+)\s*=\s*"?([^"]*)"?/);
      if (match) {
        if (match[1].toLowerCase() === "alias" || match[1].toLowerCase() === "cursorsource") {
          dataSource = match[2];
        }
        if (match[1].toLowerCase() === "order") {
          orderBy = match[2];
        }
      }
    }
  }

  const bandRecords = records.filter((r) => r.OBJTYPE === 9);
  const bands: ReportBand[] = [];
  const bandBoundaries: Array<{ band: ReportBand; startVpos: number; endVpos: number }> = [];

  let cumulativeVpos = 0;
  for (const br of bandRecords) {
    const bandType = BAND_NAMES[br.OBJCODE] || `band_${br.OBJCODE}`;
    const band: ReportBand = {
      type: bandType,
      objcode: br.OBJCODE,
      height: br.HEIGHT,
      width: br.WIDTH,
      expr: br.EXPR,
      objects: [],
    };
    if (bandType === "groupHeader" && br.EXPR) {
      groupExpr = br.EXPR;
    }
    bands.push(band);
    bandBoundaries.push({
      band,
      startVpos: cumulativeVpos,
      endVpos: cumulativeVpos + br.HEIGHT,
    });
    cumulativeVpos += br.HEIGHT;
  }

  const objectRecords = records.filter((r) => [5, 6, 7, 8].includes(r.OBJTYPE));
  for (const obj of objectRecords) {
    let objType: "label" | "field" | "line" = "field";
    if (obj.OBJTYPE === 5) objType = "label";
    else if (obj.OBJTYPE === 6) objType = "line";
    else if (obj.OBJTYPE === 8) objType = "field";

    const reportObj: ReportObject = {
      type: objType,
      expr: obj.EXPR,
      vpos: obj.VPOS,
      hpos: obj.HPOS,
      height: obj.HEIGHT,
      width: obj.WIDTH,
      fontFace: obj.FONTFACE || defaultFont,
      fontSize: obj.FONTSIZE || defaultFontSize,
      fontStyle: obj.FONTSTYLE,
      picture: obj.PICTURE,
      totalType: obj.TOTALTYPE,
      resetTotal: obj.RESETTOTAL,
      name: obj.NAME,
      tag: obj.TAG,
    };

    let assigned = false;
    for (let i = bandBoundaries.length - 1; i >= 0; i--) {
      const bb = bandBoundaries[i];
      if (obj.VPOS >= bb.startVpos && obj.VPOS < bb.endVpos) {
        reportObj.vpos = obj.VPOS - bb.startVpos;
        bb.band.objects.push(reportObj);
        assigned = true;
        break;
      }
    }
    if (!assigned && bandBoundaries.length > 0) {
      const lastBand = bandBoundaries[bandBoundaries.length - 1];
      reportObj.vpos = obj.VPOS - lastBand.startVpos;
      lastBand.band.objects.push(reportObj);
    }
  }

  const variables: ReportVariable[] = [];
  const variableRecords = records.filter((r) => r.OBJTYPE === 18);
  for (const vr of variableRecords) {
    variables.push({
      name: vr.NAME || "",
      expr: vr.EXPR || "",
      totalType: vr.TOTALTYPE,
      resetTotal: vr.RESETTOTAL,
      initialValue: vr.TAG,
    });
  }

  const fontResources: ParsedReport["fontResources"] = [];
  const fontRecords = records.filter((r) => r.OBJTYPE === 23);
  for (const fr of fontRecords) {
    fontResources.push({
      fontFace: fr.FONTFACE || defaultFont,
      fontSize: fr.FONTSIZE || defaultFontSize,
      fontStyle: fr.FONTSTYLE,
    });
  }

  return {
    orientation,
    paperSize,
    defaultFont,
    defaultFontSize,
    dataSource,
    orderBy,
    groupExpr,
    bands,
    variables,
    fontResources,
  };
}
