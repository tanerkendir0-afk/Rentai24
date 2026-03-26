import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

function findFontDir(): string {
  const candidates = [
    path.join(process.cwd(), "server", "fonts"),
    path.join(process.cwd(), "fonts"),
  ];
  try { if (typeof __dirname !== "undefined") candidates.unshift(path.join(__dirname, "..", "fonts")); } catch {}
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "DejaVuSans.ttf"))) return dir;
  }
  return candidates[0];
}

const FONT_DIR = findFontDir();
const EMERALD = "#059669";
const DARK = "#1B1B1B";
const HEADER_BG = "#065F46";
const LIGHT_BG = "#F0FDF4";
const BORDER = "#D1D5DB";

function formatTL(n: number): string {
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const intStr = parseInt(intPart).toLocaleString("tr-TR");
  return `${intStr},${decPart}`;
}

interface FaturaRow {
  sira_no: number;
  fatura_tarihi: string;
  belge_no: string;
  satici_unvani: string;
  satici_vkn: string;
  belge_turu: string;
  matrah: string | number;
  kdv_orani: string | number;
  kdv_tutari: string | number;
  hesap_kodu: string;
}

interface OzetRow {
  kdv_orani: number;
  adet: number;
  matrah: string | number;
  kdv: string | number;
}

export async function generateKdvListesiPdf(data: {
  donem: string;
  faturalar: FaturaRow[];
  ozet: OzetRow[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc: any = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Register Turkish-compatible fonts
      let fontName = "Helvetica";
      let fontBold = "Helvetica-Bold";
      if (fs.existsSync(path.join(FONT_DIR, "DejaVuSans.ttf"))) {
        doc.registerFont("DejaVu", path.join(FONT_DIR, "DejaVuSans.ttf"));
        doc.registerFont("DejaVu-Bold", path.join(FONT_DIR, "DejaVuSans-Bold.ttf"));
        fontName = "DejaVu";
        fontBold = "DejaVu-Bold";
      }

      const pageW = doc.page.width - 60;
      const startX = 30;

      // === TITLE ===
      doc.font(fontBold).fontSize(14).fillColor(HEADER_BG)
        .text("INDIRILECEK KDV LISTESI", startX, 25, { align: "center", width: pageW });
      doc.font(fontName).fontSize(9).fillColor("#6B7280")
        .text(`Donem: ${data.donem} | Olusturma: ${new Date().toLocaleDateString("tr-TR")}`, startX, 42, { align: "center", width: pageW });

      // === TABLE HEADERS ===
      const cols = [
        { label: "#", w: 25, align: "center" as const },
        { label: "Tarih", w: 62, align: "center" as const },
        { label: "Belge No", w: 110, align: "left" as const },
        { label: "Satici Unvani", w: 195, align: "left" as const },
        { label: "VKN/TCKN", w: 72, align: "center" as const },
        { label: "Tur", w: 58, align: "center" as const },
        { label: "Matrah (TL)", w: 80, align: "right" as const },
        { label: "KDV %", w: 40, align: "center" as const },
        { label: "KDV (TL)", w: 80, align: "right" as const },
        { label: "Hesap", w: 50, align: "center" as const },
      ];

      let y = 60;
      const rowH = 16;

      // Header row
      doc.rect(startX, y, pageW, rowH + 2).fill(HEADER_BG);
      let cx = startX + 3;
      for (const col of cols) {
        doc.font(fontBold).fontSize(7).fillColor("#FFFFFF")
          .text(col.label, cx, y + 4, { width: col.w - 6, align: col.align });
        cx += col.w;
      }
      y += rowH + 2;

      // === DATA ROWS ===
      let toplamMatrah = 0;
      let toplamKdv = 0;

      for (let i = 0; i < data.faturalar.length; i++) {
        const f = data.faturalar[i];
        const matrah = Number(f.matrah);
        const kdv = Number(f.kdv_tutari);
        toplamMatrah += matrah;
        toplamKdv += kdv;

        // New page check
        if (y + rowH > doc.page.height - 80) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
          y = 30;
          // Re-draw header
          doc.rect(startX, y, pageW, rowH + 2).fill(HEADER_BG);
          cx = startX + 3;
          for (const col of cols) {
            doc.font(fontBold).fontSize(7).fillColor("#FFFFFF")
              .text(col.label, cx, y + 4, { width: col.w - 6, align: col.align });
            cx += col.w;
          }
          y += rowH + 2;
        }

        // Zebra stripe
        if (i % 2 === 0) {
          doc.rect(startX, y, pageW, rowH).fill(LIGHT_BG);
        }

        const tarih = f.fatura_tarihi ? new Date(f.fatura_tarihi).toLocaleDateString("tr-TR") : "";
        const unvan = f.satici_unvani.length > 35 ? f.satici_unvani.substring(0, 35) + "..." : f.satici_unvani;

        const values = [
          String(f.sira_no),
          tarih,
          f.belge_no,
          unvan,
          f.satici_vkn,
          f.belge_turu.replace("e-", "e"),
          formatTL(matrah),
          `%${f.kdv_orani}`,
          formatTL(kdv),
          f.hesap_kodu,
        ];

        cx = startX + 3;
        for (let j = 0; j < cols.length; j++) {
          doc.font(fontName).fontSize(6.5).fillColor(DARK)
            .text(values[j], cx, y + 4, { width: cols[j].w - 6, align: cols[j].align });
          cx += cols[j].w;
        }

        // Bottom border
        doc.moveTo(startX, y + rowH).lineTo(startX + pageW, y + rowH)
          .strokeColor(BORDER).lineWidth(0.3).stroke();

        y += rowH;
      }

      // === TOTAL ROW ===
      y += 4;
      doc.rect(startX, y, pageW, rowH + 4).fill(HEADER_BG);
      cx = startX + 3;
      const totalVals = ["", "", "", "", "", `TOPLAM (${data.faturalar.length})`, formatTL(toplamMatrah), "", formatTL(toplamKdv), ""];
      for (let j = 0; j < cols.length; j++) {
        doc.font(fontBold).fontSize(7.5).fillColor("#FFFFFF")
          .text(totalVals[j], cx, y + 5, { width: cols[j].w - 6, align: cols[j].align });
        cx += cols[j].w;
      }
      y += rowH + 12;

      // === ORAN OZET ===
      if (data.ozet.length > 0) {
        doc.font(fontBold).fontSize(9).fillColor(HEADER_BG)
          .text("KDV ORAN OZETI", startX, y);
        y += 14;

        const ozetCols = [
          { label: "KDV Orani", w: 80 },
          { label: "Hesap Kodu", w: 80 },
          { label: "Fatura Adedi", w: 80 },
          { label: "Matrah (TL)", w: 100 },
          { label: "KDV Tutari (TL)", w: 100 },
        ];

        doc.rect(startX, y, 440, rowH).fill(HEADER_BG);
        cx = startX + 3;
        for (const col of ozetCols) {
          doc.font(fontBold).fontSize(7).fillColor("#FFFFFF")
            .text(col.label, cx, y + 4, { width: col.w - 6, align: "center" });
          cx += col.w;
        }
        y += rowH;

        for (const o of data.ozet) {
          const hesap = Number(o.kdv_orani) === 1 ? "191.01" : Number(o.kdv_orani) === 10 ? "191.02" : Number(o.kdv_orani) === 20 ? "191.03" : "191.XX";
          const vals = [`%${o.kdv_orani}`, hesap, String(o.adet), formatTL(Number(o.matrah)), formatTL(Number(o.kdv))];
          cx = startX + 3;
          for (let j = 0; j < ozetCols.length; j++) {
            doc.font(fontName).fontSize(7).fillColor(DARK)
              .text(vals[j], cx, y + 4, { width: ozetCols[j].w - 6, align: "center" });
            cx += ozetCols[j].w;
          }
          y += rowH;
        }
      }

      // Footer
      const footerY = doc.page.height - 25;
      doc.font(fontName).fontSize(6).fillColor("#9CA3AF")
        .text("Finn Muhasebe Asistani - RentAI 24 | Bu belge bilgi amaclidir, resmi belge niteliginde degildir.", startX, footerY, { align: "center", width: pageW });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
