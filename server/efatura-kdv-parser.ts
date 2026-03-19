/**
 * e-Fatura UBL-TR XML Parser - Finn İndirilecek KDV Pipeline
 * 
 * Parses Turkish e-Invoice (UBL-TR 1.2) XML files and extracts
 * structured data for İndirilecek KDV Listesi generation.
 * 
 * Stack: Node.js/TypeScript with fast-xml-parser
 * Cost: Zero (no external OCR/AI service needed for XML invoices)
 */

import { XMLParser } from 'fast-xml-parser';

// ============================================================
// TYPES
// ============================================================

interface ParsedInvoice {
  siraNo?: number;
  faturaTarihi: string;       // GG.AA.YYYY
  belgeNo: string;            // GIB e-Fatura numarası
  saticiUnvani: string;
  saticiVKN: string;          // 10 (VKN) veya 11 (TCKN) hane
  belgeTuru: 'e-Fatura' | 'e-Arşiv Fatura' | 'Serbest Meslek Makbuzu' | 'Gider Pusulası' | 'Fatura';
  matrah: number;             // KDV hariç tutar (₺)
  kdvOrani: number;           // 1 | 10 | 20
  kdvTutari: number;          // İndirilecek KDV (₺)
  hesapKodu: string;          // 191.01 | 191.02 | 191.03
  paraBirimi: string;
  profilId: string;           // TICARIFATURA, TEMELFATURA, EARSIVFATURA
  rawXmlHash?: string;        // Mükerrer kontrolü için
}

interface ParseResult {
  success: boolean;
  invoice?: ParsedInvoice;
  errors: string[];
  warnings: string[];
}

interface KDVSummary {
  oran: number;
  hesapKodu: string;
  toplamMatrah: number;
  toplamKDV: number;
  faturaAdedi: number;
}

interface KDVListeRaporu {
  donem: string;              // AA/YYYY
  mukellefUnvani: string;
  mukellefVKN: string;
  vergiDairesi: string;
  faturalar: ParsedInvoice[];
  ozetler: KDVSummary[];
  genelToplamMatrah: number;
  genelToplamKDV: number;
  toplamFaturaAdedi: number;
  olusturmaTarihi: string;
}

// ============================================================
// XML PARSER CONFIG
// ============================================================

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,        // UBL namespace'leri kaldır
  isArray: (name: string) => {
    // Birden fazla olabilecek elemanlar
    return ['InvoiceLine', 'TaxSubtotal', 'TaxTotal', 
            'AllowanceCharge', 'AdditionalDocumentReference'].includes(name);
  },
  parseTagValue: true,
  trimValues: true,
};

// ============================================================
// PARSER FUNCTIONS  
// ============================================================

/**
 * Tek bir e-Fatura XML dosyasını parse eder
 */
export function parseEFatura(xmlContent: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parser = new XMLParser(parserOptions);
    const doc = parser.parse(xmlContent);

    // Root element: Invoice (UBL-TR)
    const inv = doc.Invoice;
    if (!inv) {
      return { success: false, errors: ['XML dosyasında Invoice root elementi bulunamadı'], warnings };
    }

    // === Belge No ===
    const belgeNo = inv.ID?.toString() || '';
    if (!belgeNo) errors.push('Belge numarası (ID) bulunamadı');

    // === Profil ID ===
    const profilId = inv.ProfileID?.toString() || '';
    
    // === Belge Türü Tespiti ===
    let belgeTuru: ParsedInvoice['belgeTuru'] = 'e-Fatura';
    if (profilId.includes('EARSIV')) {
      belgeTuru = 'e-Arşiv Fatura';
    } else if (profilId.includes('TICARI')) {
      belgeTuru = 'e-Fatura';
    } else if (profilId.includes('TEMEL')) {
      belgeTuru = 'e-Fatura';
    }
    // InvoiceTypeCode: SATIS, IADE, TEVKIFAT, ISTISNA, OZELMATRAH, IHRACKAYITLI
    const invoiceTypeCode = inv.InvoiceTypeCode?.toString() || 'SATIS';

    // === Fatura Tarihi ===
    const rawDate = inv.IssueDate?.toString() || '';
    const faturaTarihi = formatTarih(rawDate);
    if (!faturaTarihi) errors.push(`Geçersiz tarih formatı: ${rawDate}`);

    // === Satıcı Bilgileri ===
    const supplier = inv.AccountingSupplierParty?.Party;
    let saticiUnvani = '';
    let saticiVKN = '';

    if (supplier) {
      // Unvan
      saticiUnvani = supplier.PartyName?.Name?.toString()
        || supplier.PartyLegalEntity?.RegistrationName?.toString()
        || '';

      // VKN/TCKN
      const partyId = supplier.PartyIdentification;
      if (partyId) {
        const ids = Array.isArray(partyId) ? partyId : [partyId];
        for (const id of ids) {
          const schemeId = id.ID?.['@_schemeID'] || '';
          if (schemeId === 'VKN' || schemeId === 'TCKN' || schemeId === 'VKN_TCKN') {
            saticiVKN = id.ID?.['#text']?.toString() || id.ID?.toString() || '';
            break;
          }
        }
        // Fallback: ilk ID'yi al
        if (!saticiVKN && ids.length > 0) {
          saticiVKN = ids[0].ID?.['#text']?.toString() || ids[0].ID?.toString() || '';
        }
      }
    }
    if (!saticiUnvani) warnings.push('Satıcı unvanı bulunamadı');
    if (!saticiVKN) warnings.push('Satıcı VKN/TCKN bulunamadı');

    // === KDV Hesaplama ===
    let matrah = 0;
    let kdvTutari = 0;
    let kdvOrani = 0;

    // TaxTotal > TaxSubtotal üzerinden KDV bilgileri
    const taxTotals = inv.TaxTotal;
    if (taxTotals) {
      const taxTotalArr = Array.isArray(taxTotals) ? taxTotals : [taxTotals];
      
      for (const taxTotal of taxTotalArr) {
        const subtotals = taxTotal.TaxSubtotal;
        if (!subtotals) continue;
        
        const subtotalArr = Array.isArray(subtotals) ? subtotals : [subtotals];
        
        for (const sub of subtotalArr) {
          const taxScheme = sub.TaxCategory?.TaxScheme;
          const taxName = taxScheme?.Name?.toString() || '';
          const taxCode = taxScheme?.TaxTypeCode?.toString() || '';
          
          // Sadece KDV (0015) işle
          if (taxCode === '0015' || taxName.includes('KDV') || taxName.includes('VAT')) {
            const subMatrah = parseFloat(sub.TaxableAmount?.toString() || '0');
            const subKDV = parseFloat(sub.TaxAmount?.toString() || '0');
            const subOran = parseFloat(sub.Percent?.toString() || '0');
            
            matrah += subMatrah;
            kdvTutari += subKDV;
            
            // En yüksek oranı ana oran olarak belirle (mixed rate durumu için)
            if (subOran > kdvOrani) kdvOrani = subOran;
          }
        }
      }
    }

    // Fallback: LegalMonetaryTotal'dan matrah
    if (matrah === 0) {
      const lmt = inv.LegalMonetaryTotal;
      if (lmt) {
        matrah = parseFloat(lmt.TaxExclusiveAmount?.toString() || '0');
        const payable = parseFloat(lmt.PayableAmount?.toString() || '0');
        if (kdvTutari === 0 && payable > matrah) {
          kdvTutari = payable - matrah;
        }
      }
    }

    // KDV Oranı doğrulama
    if (kdvOrani === 0 && matrah > 0 && kdvTutari > 0) {
      const calculatedRate = Math.round((kdvTutari / matrah) * 100);
      if ([1, 10, 20].includes(calculatedRate)) {
        kdvOrani = calculatedRate;
      } else {
        warnings.push(`Hesaplanan KDV oranı standart değil: %${calculatedRate}`);
        kdvOrani = calculatedRate;
      }
    }

    // === Hesap Kodu ===
    const hesapKodu = kdvOraniToHesapKodu(kdvOrani);

    // === Doğrulama ===
    const expectedKDV = Math.round(matrah * kdvOrani / 100 * 100) / 100;
    const kdvFarki = Math.abs(kdvTutari - expectedKDV);
    if (kdvFarki > 0.02) {
      warnings.push(`KDV tutarı doğrulanamadı: Beklenen ${expectedKDV}, Bulunan ${kdvTutari} (Fark: ${kdvFarki.toFixed(2)})`);
    }

    // === Para Birimi ===
    const paraBirimi = inv.DocumentCurrencyCode?.toString() || 'TRY';
    if (paraBirimi !== 'TRY') {
      warnings.push(`Yabancı para birimi: ${paraBirimi} - Döviz kuru dönüşümü gerekebilir`);
    }

    if (errors.length > 0) {
      return { success: false, errors, warnings };
    }

    const invoice: ParsedInvoice = {
      faturaTarihi: faturaTarihi!,
      belgeNo,
      saticiUnvani,
      saticiVKN,
      belgeTuru,
      matrah: Math.round(matrah * 100) / 100,
      kdvOrani,
      kdvTutari: Math.round(kdvTutari * 100) / 100,
      hesapKodu,
      paraBirimi,
      profilId,
    };

    return { success: true, invoice, errors, warnings };

  } catch (err: any) {
    return {
      success: false,
      errors: [`XML parse hatası: ${err.message}`],
      warnings,
    };
  }
}

/**
 * Birden fazla XML dosyasını toplu parse eder ve İndirilecek KDV Listesi oluşturur
 */
export function generateKDVListesi(
  xmlContents: { filename: string; content: string }[],
  meta: {
    donem: string;
    mukellefUnvani: string;
    mukellefVKN: string;
    vergiDairesi: string;
  }
): { rapor: KDVListeRaporu; parseResults: { filename: string; result: ParseResult }[] } {
  
  const parseResults: { filename: string; result: ParseResult }[] = [];
  const faturalar: ParsedInvoice[] = [];
  const seenBelgeNos = new Set<string>();

  for (const { filename, content } of xmlContents) {
    const result = parseEFatura(content);
    parseResults.push({ filename, result });

    if (result.success && result.invoice) {
      // Mükerrer kontrolü
      if (seenBelgeNos.has(result.invoice.belgeNo)) {
        result.warnings.push(`Mükerrer fatura: ${result.invoice.belgeNo}`);
        continue;
      }
      seenBelgeNos.add(result.invoice.belgeNo);

      result.invoice.siraNo = faturalar.length + 1;
      faturalar.push(result.invoice);
    }
  }

  // Tarihe göre sırala
  faturalar.sort((a, b) => {
    const [dA, mA, yA] = a.faturaTarihi.split('.');
    const [dB, mB, yB] = b.faturaTarihi.split('.');
    return new Date(`${yA}-${mA}-${dA}`).getTime() - new Date(`${yB}-${mB}-${dB}`).getTime();
  });

  // Sıra numaralarını güncelle
  faturalar.forEach((f, i) => f.siraNo = i + 1);

  // Oran bazlı özet
  const oranGruplari = new Map<number, { matrah: number; kdv: number; adet: number }>();
  for (const f of faturalar) {
    const existing = oranGruplari.get(f.kdvOrani) || { matrah: 0, kdv: 0, adet: 0 };
    existing.matrah += f.matrah;
    existing.kdv += f.kdvTutari;
    existing.adet += 1;
    oranGruplari.set(f.kdvOrani, existing);
  }

  const ozetler: KDVSummary[] = Array.from(oranGruplari.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([oran, data]) => ({
      oran,
      hesapKodu: kdvOraniToHesapKodu(oran),
      toplamMatrah: Math.round(data.matrah * 100) / 100,
      toplamKDV: Math.round(data.kdv * 100) / 100,
      faturaAdedi: data.adet,
    }));

  const genelToplamMatrah = ozetler.reduce((sum, o) => sum + o.toplamMatrah, 0);
  const genelToplamKDV = ozetler.reduce((sum, o) => sum + o.toplamKDV, 0);

  const rapor: KDVListeRaporu = {
    donem: meta.donem,
    mukellefUnvani: meta.mukellefUnvani,
    mukellefVKN: meta.mukellefVKN,
    vergiDairesi: meta.vergiDairesi,
    faturalar,
    ozetler,
    genelToplamMatrah: Math.round(genelToplamMatrah * 100) / 100,
    genelToplamKDV: Math.round(genelToplamKDV * 100) / 100,
    toplamFaturaAdedi: faturalar.length,
    olusturmaTarihi: new Date().toLocaleDateString('tr-TR'),
  };

  return { rapor, parseResults };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatTarih(isoDate: string): string | null {
  // Input: 2025-01-15 veya 2025-01-15T00:00:00
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function kdvOraniToHesapKodu(oran: number): string {
  switch (oran) {
    case 1: return '191.01';
    case 10: return '191.02';
    case 20: return '191.03';
    default: return `191.XX (${oran}%)`;
  }
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

export function validateVKN(vkn: string): { valid: boolean; type: 'VKN' | 'TCKN' | 'invalid' } {
  const cleaned = vkn.replace(/\s/g, '');
  if (/^\d{10}$/.test(cleaned)) return { valid: true, type: 'VKN' };
  if (/^\d{11}$/.test(cleaned)) {
    // TCKN algoritma kontrolü
    const digits = cleaned.split('').map(Number);
    if (digits[0] === 0) return { valid: false, type: 'invalid' };
    const check10 = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
    if (check10 !== digits[10]) return { valid: false, type: 'invalid' };
    return { valid: true, type: 'TCKN' };
  }
  return { valid: false, type: 'invalid' };
}

export function validateKDVTutari(matrah: number, oran: number, tutar: number, tolerans = 0.02): boolean {
  return Math.abs(matrah * oran / 100 - tutar) <= tolerans;
}

// ============================================================
// DRIZZLE SCHEMA (for PostgreSQL storage with RLS)
// ============================================================

/*
-- invoices tablosu (tenant_id ile RLS)
-- Finn'in mevcut Neon PostgreSQL yapısına uyumlu

CREATE TABLE IF NOT EXISTS indirilecek_kdv_faturalar (
  id              SERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  donem           VARCHAR(7) NOT NULL,           -- AA/YYYY
  sira_no         INTEGER NOT NULL,
  fatura_tarihi   DATE NOT NULL,
  belge_no        VARCHAR(50) NOT NULL,
  satici_unvani   VARCHAR(255) NOT NULL,
  satici_vkn      VARCHAR(11) NOT NULL,
  belge_turu      VARCHAR(30) NOT NULL,
  matrah          DECIMAL(15,2) NOT NULL,
  kdv_orani       DECIMAL(5,2) NOT NULL,
  kdv_tutari      DECIMAL(15,2) NOT NULL,
  hesap_kodu      VARCHAR(10) NOT NULL,
  para_birimi     VARCHAR(3) DEFAULT 'TRY',
  profil_id       VARCHAR(50),
  xml_hash        VARCHAR(64),                   -- Mükerrer kontrolü
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, belge_no),                   -- Aynı fatura 2 kez girilemesin
  CHECK (kdv_orani IN (1, 10, 20))
);

-- RLS politikası
ALTER TABLE indirilecek_kdv_faturalar ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON indirilecek_kdv_faturalar
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Performans indeksleri
CREATE INDEX idx_kdv_fatura_donem ON indirilecek_kdv_faturalar(tenant_id, donem);
CREATE INDEX idx_kdv_fatura_belge ON indirilecek_kdv_faturalar(tenant_id, belge_no);
CREATE INDEX idx_kdv_fatura_tarih ON indirilecek_kdv_faturalar(tenant_id, fatura_tarihi);

-- Özet view
CREATE VIEW v_indirilecek_kdv_ozet AS
SELECT 
  tenant_id,
  donem,
  kdv_orani,
  CASE kdv_orani 
    WHEN 1 THEN '191.01' 
    WHEN 10 THEN '191.02' 
    WHEN 20 THEN '191.03' 
  END as hesap_kodu,
  COUNT(*) as fatura_adedi,
  SUM(matrah) as toplam_matrah,
  SUM(kdv_tutari) as toplam_kdv
FROM indirilecek_kdv_faturalar
GROUP BY tenant_id, donem, kdv_orani;
*/
