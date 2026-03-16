import ExcelJS from "exceljs";
import type { Invoice, InvoiceItem } from "@shared/schema";
import { numberToWords } from "./invoiceGenerator";

function num(v: string | null | undefined): number {
  return parseFloat(v || "0");
}

export async function generateInvoiceExcel(invoice: Invoice, items: InvoiceItem[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RentAI 24 — Finn";
  const ws = wb.addWorksheet("Fatura", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });

  const blue = "2563EB";
  const lightBlue = "F0F5FF";

  ws.columns = [
    { width: 6 }, { width: 35 }, { width: 10 }, { width: 10 },
    { width: 16 }, { width: 8 }, { width: 16 },
  ];

  const typeLabel = invoice.invoiceType === "iade" ? "İADE FATURASI" : invoice.invoiceType === "tevkifat" ? "TEVKİFATLI FATURA" : "SATIŞ FATURASI";
  const titleRow = ws.addRow([typeLabel]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, 7);
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: blue } };
  titleRow.getCell(1).alignment = { horizontal: "center" };

  ws.addRow([]);

  const metaData = [
    ["Fatura No:", invoice.invoiceNo, "", "", "Fatura Tarihi:", invoice.invoiceDate],
    ...(invoice.dueDate ? [["", "", "", "", "Vade Tarihi:", invoice.dueDate]] : []),
  ];
  metaData.forEach(row => {
    const r = ws.addRow(row);
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(5).font = { bold: true, size: 10 };
  });

  ws.addRow([]);

  const sellerHeader = ws.addRow(["", "SATICI", "", "", "ALICI"]);
  sellerHeader.getCell(2).font = { bold: true, color: { argb: blue }, size: 11 };
  sellerHeader.getCell(5).font = { bold: true, color: { argb: blue }, size: 11 };

  const partyRows = [
    [invoice.sellerName || "—", invoice.buyerName],
    [invoice.sellerTaxOffice ? `VD: ${invoice.sellerTaxOffice}` : "", invoice.buyerTaxOffice ? `VD: ${invoice.buyerTaxOffice}` : ""],
    [invoice.sellerTaxNo ? `VKN: ${invoice.sellerTaxNo}` : "", invoice.buyerTaxNo ? `VKN: ${invoice.buyerTaxNo}` : ""],
    [invoice.sellerAddress || "", invoice.buyerAddress || ""],
  ];
  partyRows.forEach(([s, b]) => {
    const r = ws.addRow(["", s, "", "", b]);
    r.getCell(2).font = { size: 10 };
    r.getCell(5).font = { size: 10 };
  });

  ws.addRow([]);

  const headers = ["#", "Açıklama", "Miktar", "Birim", "Birim Fiyat", "KDV %", "Tutar"];
  const headerRow = ws.addRow(headers);
  headerRow.eachCell(c => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } };
    c.font = { bold: true, color: { argb: "FFFFFF" }, size: 10 };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = { bottom: { style: "thin" } };
  });

  const moneyFmt = '#,##0.00 "₺"';

  items.forEach((item, i) => {
    const r = ws.addRow([
      i + 1,
      item.description,
      num(item.quantity),
      item.unit || "Adet",
      num(item.unitPrice),
      item.kdvRate || 20,
      num(item.amount),
    ]);
    if (i % 2 === 1) {
      r.eachCell(c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      });
    }
    r.getCell(5).numFmt = moneyFmt;
    r.getCell(7).numFmt = moneyFmt;
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(4).alignment = { horizontal: "center" };
    r.getCell(6).alignment = { horizontal: "center" };
  });

  ws.addRow([]);

  const totals = [
    ["Ara Toplam", num(invoice.subtotal)],
    [`KDV (%${invoice.kdvRate || 20})`, num(invoice.kdvAmount)],
  ];
  if (num(invoice.tevkifatAmount) > 0) {
    totals.push([`Tevkifat (${invoice.tevkifatRate})`, -num(invoice.tevkifatAmount)]);
  }
  totals.push(["GENEL TOPLAM", num(invoice.total)]);

  totals.forEach((row, i) => {
    const r = ws.addRow(["", "", "", "", "", row[0], row[1]]);
    r.getCell(6).font = { bold: true, size: 10 };
    r.getCell(7).numFmt = moneyFmt;
    r.getCell(7).font = { bold: true, size: 10 };
    if (i === totals.length - 1) {
      r.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } };
      r.getCell(6).font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
      r.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: blue } };
      r.getCell(7).font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    }
  });

  ws.addRow([]);
  const wordsRow = ws.addRow(["", `Yalnız: ${numberToWords(num(invoice.total))}`]);
  ws.mergeCells(wordsRow.number, 2, wordsRow.number, 7);
  wordsRow.getCell(2).font = { italic: true, size: 10, color: { argb: "555555" } };

  if (invoice.notes) {
    ws.addRow([]);
    const notesRow = ws.addRow(["", `Not: ${invoice.notes}`]);
    ws.mergeCells(notesRow.number, 2, notesRow.number, 7);
    notesRow.getCell(2).font = { size: 9, color: { argb: "888888" } };
  }

  ws.addRow([]);
  const disclaimerRow = ws.addRow(["", "Bu fatura bilgilendirme amaçlıdır. E-Fatura mükellefiyetiniz varsa GİB portalı üzerinden resmi e-fatura düzenlemeniz gerekmektedir."]);
  ws.mergeCells(disclaimerRow.number, 2, disclaimerRow.number, 7);
  disclaimerRow.getCell(2).font = { size: 8, color: { argb: "AAAAAA" }, italic: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
