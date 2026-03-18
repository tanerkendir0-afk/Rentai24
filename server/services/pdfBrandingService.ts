import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { UserBranding } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONT_DIR = path.join(__dirname, "..", "fonts");

const DEFAULT_THEME = {
  primary: "#2C3E50",
  accent: "#3498DB",
  light: "#ECF0F1",
  text: "#1B1B1B",
};

function fontsAvailable(): boolean {
  return fs.existsSync(path.join(FONT_DIR, "DejaVuSans.ttf"));
}

function registerFonts(doc: PDFKit.PDFDocument): boolean {
  if (!fontsAvailable()) return false;
  doc.registerFont("DejaVu", path.join(FONT_DIR, "DejaVuSans.ttf"));
  doc.registerFont("DejaVu-Bold", path.join(FONT_DIR, "DejaVuSans-Bold.ttf"));
  doc.registerFont("DejaVu-Oblique", path.join(FONT_DIR, "DejaVuSans-Oblique.ttf"));
  doc.registerFont("DejaVu-BoldOblique", path.join(FONT_DIR, "DejaVuSans-BoldOblique.ttf"));
  return true;
}

function formatCurrency(amount: number, currency: string = "₺"): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const intStr = parseInt(intPart).toLocaleString("tr-TR");
  return `${intStr},${decPart} ${currency}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  vat_rate: number;
  withholding_rate?: string;
}

interface PartyInfo {
  name: string;
  address?: string;
  tax_office?: string;
  tax_no?: string;
  phone?: string;
  email?: string;
}

interface InvoiceData {
  invoice_no?: string;
  date?: string;
  due_date?: string;
  seller?: PartyInfo;
  buyer?: PartyInfo;
  items?: InvoiceItem[];
  payment_terms?: string;
  bank_info?: {
    bank_name?: string;
    iban?: string;
    account_holder?: string;
  };
  notes?: string;
  currency?: string;
}

interface ReportSection {
  heading?: string;
  content?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

interface ReportData {
  title?: string;
  subtitle?: string;
  author?: string;
  sections?: ReportSection[];
  date?: string;
}

export function generateBrandedInvoicePDF(data: InvoiceData, branding?: UserBranding): Buffer {
  const theme = branding?.theme || DEFAULT_THEME;
  const currency = data.currency || "₺";

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const hasFont = registerFonts(doc);
  const FONT = hasFont ? "DejaVu" : "Helvetica";
  const FONT_BOLD = hasFont ? "DejaVu-Bold" : "Helvetica-Bold";

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width;
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const primary = hexToRgb(theme.primary || DEFAULT_THEME.primary);
  const accent = hexToRgb(theme.accent || DEFAULT_THEME.accent);
  const light = hexToRgb(theme.light || DEFAULT_THEME.light);

  doc.rect(0, 0, pageWidth, 70).fill(theme.primary || DEFAULT_THEME.primary);
  doc.rect(0, 70, pageWidth, 3).fill(theme.accent || DEFAULT_THEME.accent);

  if (branding?.logo_base64) {
    try {
      const logoBuffer = Buffer.from(branding.logo_base64, "base64");
      doc.image(logoBuffer, marginLeft, 15, { width: 40, height: 40 });
    } catch {}
  }

  if (branding?.company_name) {
    const logoOffset = branding?.logo_base64 ? 100 : marginLeft;
    doc.font(FONT_BOLD).fontSize(14).fillColor("white")
      .text(branding.company_name, logoOffset, 28, { width: pageWidth - logoOffset - marginRight });
  }

  doc.moveDown(2);
  let y = 90;

  doc.font(FONT_BOLD).fontSize(22).fillColor(theme.primary || DEFAULT_THEME.primary)
    .text("FATURA", marginLeft, y);
  y += 35;

  const metaItems = [
    { label: "Fatura No:", value: data.invoice_no || "---" },
    { label: "Tarih:", value: data.date || new Date().toLocaleDateString("tr-TR") },
    { label: "Vade:", value: data.due_date || "---" },
  ];
  doc.fontSize(9);
  for (const item of metaItems) {
    doc.font(FONT_BOLD).fillColor("#666666").text(item.label, marginLeft, y, { continued: true });
    doc.font(FONT).fillColor(theme.text || "#1B1B1B").text("  " + item.value);
    y += 15;
  }
  y += 10;

  const drawParty = (label: string, party: PartyInfo | undefined, x: number, w: number) => {
    if (!party) return;
    const startY = y;
    doc.font(FONT_BOLD).fontSize(8).fillColor(theme.accent || DEFAULT_THEME.accent)
      .text(label, x, startY);
    doc.font(FONT_BOLD).fontSize(10).fillColor(theme.text || "#1B1B1B")
      .text(party.name || "---", x, startY + 14);
    let py = startY + 28;
    doc.fontSize(8).font(FONT).fillColor("#444444");
    if (party.address) { doc.text(party.address, x, py, { width: w }); py += 12; }
    if (party.tax_office) { doc.text(`VD: ${party.tax_office}`, x, py, { width: w }); py += 12; }
    if (party.tax_no) { doc.text(`VKN: ${party.tax_no}`, x, py, { width: w }); py += 12; }
    if (party.phone) { doc.text(`Tel: ${party.phone}`, x, py, { width: w }); py += 12; }
    if (party.email) { doc.text(`E-posta: ${party.email}`, x, py, { width: w }); py += 12; }
  };

  const halfWidth = contentWidth / 2 - 10;
  drawParty("SATICI", data.seller, marginLeft, halfWidth);
  drawParty("ALICI", data.buyer, marginLeft + halfWidth + 20, halfWidth);
  y += 90;

  doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y)
    .strokeColor(theme.primary || DEFAULT_THEME.primary).lineWidth(0.5).stroke();
  y += 8;

  const colWidths = [25, 160, 70, 80, 50, contentWidth - 385];
  const headers = ["#", "Ürün / Hizmet", "Miktar", "Birim Fiyat", "KDV %", "Tutar"];

  doc.rect(marginLeft, y, contentWidth, 22).fill(theme.primary || DEFAULT_THEME.primary);
  doc.font(FONT_BOLD).fontSize(8).fillColor("white");
  let hx = marginLeft + 4;
  for (let i = 0; i < headers.length; i++) {
    const align = i >= 2 ? "right" : "left";
    doc.text(headers[i], hx, y + 6, { width: colWidths[i] - 8, align });
    hx += colWidths[i];
  }
  y += 22;

  let subtotal = 0;
  let totalVat = 0;
  let totalWithholding = 0;
  const items = data.items || [];

  doc.font(FONT).fontSize(8);
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const lineTotal = item.quantity * item.unit_price;
    const lineVat = lineTotal * item.vat_rate / 100;
    subtotal += lineTotal;
    totalVat += lineVat;

    if (item.withholding_rate) {
      const parts = item.withholding_rate.split("/");
      if (parts.length === 2) {
        totalWithholding += lineVat * parseInt(parts[0]) / parseInt(parts[1]);
      }
    }

    if (idx % 2 === 1) {
      doc.rect(marginLeft, y, contentWidth, 20).fill(theme.light || DEFAULT_THEME.light);
    }

    doc.fillColor(theme.text || "#1B1B1B");
    let cx = marginLeft + 4;
    const rowData = [
      String(idx + 1),
      item.description,
      `${item.quantity.toLocaleString("tr-TR")} ${item.unit || "adet"}`,
      formatCurrency(item.unit_price, currency),
      `%${item.vat_rate}`,
      formatCurrency(lineTotal, currency),
    ];
    for (let i = 0; i < rowData.length; i++) {
      const align = i >= 2 ? "right" : "left";
      doc.text(rowData[i], cx, y + 5, { width: colWidths[i] - 8, align });
      cx += colWidths[i];
    }
    y += 20;
  }

  doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y)
    .strokeColor("#CCCCCC").lineWidth(0.5).stroke();
  y += 12;

  const grandTotal = subtotal + totalVat - totalWithholding;
  const summaryX = pageWidth - marginRight - 200;
  const summaryLabelW = 110;
  const summaryValW = 90;

  const summaryRows: [string, string, boolean][] = [
    ["Ara Toplam:", formatCurrency(subtotal, currency), false],
    ["KDV Toplam:", formatCurrency(totalVat, currency), false],
  ];
  if (totalWithholding > 0) {
    summaryRows.push(["Tevkifat Kesintisi:", `-${formatCurrency(totalWithholding, currency)}`, false]);
  }
  summaryRows.push(["GENEL TOPLAM:", formatCurrency(grandTotal, currency), true]);

  for (const [label, value, isTotal] of summaryRows) {
    if (isTotal) {
      doc.moveTo(summaryX, y).lineTo(pageWidth - marginRight, y)
        .strokeColor(theme.primary || DEFAULT_THEME.primary).lineWidth(1).stroke();
      y += 4;
    }
    doc.font(isTotal ? FONT_BOLD : FONT).fontSize(isTotal ? 11 : 9)
      .fillColor(isTotal ? (theme.primary || DEFAULT_THEME.primary) : "#666666")
      .text(label, summaryX, y, { width: summaryLabelW, align: "right" });
    doc.fillColor(isTotal ? (theme.primary || DEFAULT_THEME.primary) : (theme.text || "#1B1B1B"))
      .text(value, summaryX + summaryLabelW, y, { width: summaryValW, align: "right" });
    y += isTotal ? 18 : 14;
  }
  y += 10;

  if (data.bank_info && (data.bank_info.bank_name || data.bank_info.iban)) {
    doc.font(FONT_BOLD).fontSize(10).fillColor(theme.primary || DEFAULT_THEME.primary)
      .text("BANKA BİLGİLERİ", marginLeft, y);
    y += 16;
    doc.font(FONT).fontSize(9).fillColor(theme.text || "#1B1B1B");
    if (data.bank_info.bank_name) { doc.text(`Banka: ${data.bank_info.bank_name}`, marginLeft, y); y += 14; }
    if (data.bank_info.iban) { doc.font(FONT_BOLD).text(`IBAN: ${data.bank_info.iban}`, marginLeft, y); y += 14; }
    if (data.bank_info.account_holder) { doc.font(FONT).text(`Hesap Sahibi: ${data.bank_info.account_holder}`, marginLeft, y); y += 14; }
    y += 6;
  }

  if (data.payment_terms) {
    doc.font(FONT_BOLD).fontSize(10).fillColor(theme.primary || DEFAULT_THEME.primary)
      .text("ÖDEME KOŞULLARI", marginLeft, y);
    y += 16;
    doc.font(FONT).fontSize(9).fillColor(theme.text || "#1B1B1B")
      .text(`Vade: ${data.payment_terms}`, marginLeft, y);
    y += 16;
  }

  if (data.notes) {
    doc.font(FONT_BOLD).fontSize(10).fillColor(theme.primary || DEFAULT_THEME.primary)
      .text("NOTLAR", marginLeft, y);
    y += 16;
    doc.font(FONT).fontSize(9).fillColor(theme.text || "#1B1B1B")
      .text(data.notes, marginLeft, y, { width: contentWidth });
  }

  const footerY = doc.page.height - 35;
  doc.rect(0, footerY, pageWidth, 35).fill(theme.primary || DEFAULT_THEME.primary);

  if (branding?.footer_text) {
    doc.font(FONT).fontSize(7).fillColor("white")
      .text(branding.footer_text, 0, footerY + 12, { width: pageWidth, align: "center" });
  }

  if (branding?.show_powered_by) {
    doc.font(FONT).fontSize(5).fillColor("#FFFFFF80")
      .text("Powered by RentAI24", pageWidth - 120, footerY + 25, { width: 100, align: "right" });
  }

  doc.end();

  return Buffer.concat(chunks);
}

export function generateBrandedReportPDF(data: ReportData, branding?: UserBranding): Buffer {
  const theme = branding?.theme || DEFAULT_THEME;

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const hasFont = registerFonts(doc);
  const FONT = hasFont ? "DejaVu" : "Helvetica";
  const FONT_BOLD = hasFont ? "DejaVu-Bold" : "Helvetica-Bold";
  const FONT_OBLIQUE = hasFont ? "DejaVu-Oblique" : "Helvetica-Oblique";

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth = doc.page.width;
  const marginLeft = 50;
  const marginRight = 50;
  const contentWidth = pageWidth - marginLeft - marginRight;

  if (branding?.company_name) {
    doc.rect(0, 0, pageWidth, 55).fill(theme.primary || DEFAULT_THEME.primary);
    doc.rect(0, 55, pageWidth, 2).fill(theme.accent || DEFAULT_THEME.accent);

    if (branding.logo_base64) {
      try {
        const logoBuffer = Buffer.from(branding.logo_base64, "base64");
        doc.image(logoBuffer, marginLeft, 10, { width: 35, height: 35 });
      } catch {}
    }
    const logoOff = branding.logo_base64 ? 95 : marginLeft;
    doc.font(FONT_BOLD).fontSize(12).fillColor("white")
      .text(branding.company_name, logoOff, 22, { width: pageWidth - logoOff - marginRight });
  }

  let y = branding?.company_name ? 75 : 50;

  doc.font(FONT_BOLD).fontSize(20).fillColor(theme.primary || DEFAULT_THEME.primary)
    .text(data.title || "Rapor", marginLeft, y);
  y += 28;

  if (data.subtitle) {
    doc.font(FONT).fontSize(11).fillColor("#888888")
      .text(data.subtitle, marginLeft, y);
    y += 18;
  }

  if (data.author) {
    doc.font(FONT_OBLIQUE).fontSize(9).fillColor(theme.accent || DEFAULT_THEME.accent)
      .text(`Hazırlayan: ${data.author}`, marginLeft, y);
    y += 16;
  }

  if (data.date) {
    doc.font(FONT).fontSize(9).fillColor("#888888")
      .text(`Tarih: ${data.date}`, marginLeft, y);
    y += 16;
  }

  y += 4;
  doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y)
    .strokeColor(theme.primary || DEFAULT_THEME.primary).lineWidth(1).stroke();
  y += 12;

  for (const section of (data.sections || [])) {
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 50;
    }

    if (section.heading) {
      doc.font(FONT_BOLD).fontSize(13).fillColor(theme.primary || DEFAULT_THEME.primary)
        .text(section.heading, marginLeft, y);
      y += 20;
    }

    if (section.content) {
      doc.font(FONT).fontSize(10).fillColor(theme.text || "#1B1B1B")
        .text(section.content, marginLeft, y, { width: contentWidth, lineGap: 4 });
      y = (doc as any).y + 12;
    }

    if (section.table) {
      const { headers, rows } = section.table;
      if (headers.length > 0) {
        const colW = contentWidth / headers.length;

        doc.rect(marginLeft, y, contentWidth, 20).fill(theme.primary || DEFAULT_THEME.primary);
        doc.font(FONT_BOLD).fontSize(8).fillColor("white");
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], marginLeft + i * colW + 4, y + 5, { width: colW - 8 });
        }
        y += 20;

        doc.font(FONT).fontSize(8);
        for (let ri = 0; ri < rows.length; ri++) {
          if (ri % 2 === 1) {
            doc.rect(marginLeft, y, contentWidth, 18).fill(theme.light || DEFAULT_THEME.light);
          }
          doc.fillColor(theme.text || "#1B1B1B");
          for (let ci = 0; ci < rows[ri].length; ci++) {
            doc.text(rows[ri][ci], marginLeft + ci * colW + 4, y + 4, { width: colW - 8 });
          }
          y += 18;
        }

        doc.moveTo(marginLeft, y).lineTo(pageWidth - marginRight, y)
          .strokeColor("#CCCCCC").lineWidth(0.5).stroke();
        y += 10;
      }
    }
  }

  const footerY = doc.page.height - 30;
  doc.rect(0, footerY, pageWidth, 30).fill(theme.primary || DEFAULT_THEME.primary);
  if (branding?.footer_text) {
    doc.font(FONT).fontSize(7).fillColor("white")
      .text(branding.footer_text, 0, footerY + 10, { width: pageWidth, align: "center" });
  }
  if (branding?.show_powered_by) {
    doc.font(FONT).fontSize(5).fillColor("#FFFFFF80")
      .text("Powered by RentAI24", pageWidth - 120, footerY + 20, { width: 100, align: "right" });
  }

  doc.end();
  return Buffer.concat(chunks);
}

export interface GeneratePdfInput {
  document_type: "invoice" | "report" | "proposal" | "receipt";
  data: Record<string, any>;
  filename?: string;
}

export function handleGeneratePdf(input: GeneratePdfInput, branding?: UserBranding): {
  success: boolean;
  filename?: string;
  base64_pdf?: string;
  error?: string;
  message?: string;
} {
  const docType = input.document_type;
  const data = input.data;
  const filename = input.filename || `${docType}_${Date.now()}.pdf`;

  try {
    let pdfBuffer: Buffer;

    if (docType === "invoice" || docType === "receipt") {
      pdfBuffer = generateBrandedInvoicePDF(data as InvoiceData, branding);
    } else if (docType === "report" || docType === "proposal") {
      pdfBuffer = generateBrandedReportPDF(data as ReportData, branding);
    } else {
      return { success: false, error: `Desteklenmeyen belge tipi: ${docType}` };
    }

    const base64Pdf = pdfBuffer.toString("base64");

    return {
      success: true,
      filename,
      base64_pdf: base64Pdf,
      message: `PDF oluşturuldu: ${filename} (${Math.round(pdfBuffer.length / 1024)} KB)`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
