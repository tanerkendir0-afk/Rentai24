/**
 * ERP Entegrasyon Servisi
 *
 * Desteklenen ERP/Muhasebe Yazılımları:
 * - Logo (Tiger, Go, J-Platform)
 * - Mikro (Mikro Yazılım)
 * - Luca (Luca Muhasebe)
 * - Paraşüt (parasut.com API)
 * - Bizim Hesap
 * - Özel DB bağlantısı (PostgreSQL, MySQL)
 */

export type ErpProvider = "logo" | "mikro" | "luca" | "parasut" | "bizimhesap" | "custom-db";

export interface ErpCredentials {
  provider: ErpProvider;
  apiUrl?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  companyId?: string;
  // Custom DB
  dbType?: "postgresql" | "mysql" | "mssql";
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  dbQuery?: string;  // Fatura çekme SQL sorgusu
}

export interface ErpInvoice {
  invoiceNo: string;
  issueDate: string;
  vendorName: string;
  vendorVkn: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  invoiceType: string;
}

export interface ErpTestResult {
  success: boolean;
  message: string;
  version?: string;
}

export interface ErpSyncResult {
  provider: ErpProvider;
  fetched: number;
  imported: number;
  errors: string[];
}

// ============================================================
// ADAPTER INTERFACE
// ============================================================

export interface ErpAdapter {
  provider: ErpProvider;
  testConnection(creds: ErpCredentials): Promise<ErpTestResult>;
  fetchInvoices(creds: ErpCredentials, startDate: string, endDate: string): Promise<ErpInvoice[]>;
}

// ============================================================
// PARASUT ADAPTER
// ============================================================

class ParasutAdapter implements ErpAdapter {
  provider: ErpProvider = "parasut";

  async testConnection(creds: ErpCredentials): Promise<ErpTestResult> {
    try {
      // OAuth2 token al
      const tokenRes = await fetch("https://api.parasut.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
        }),
      });
      if (tokenRes.ok) return { success: true, message: "Paraşüt bağlantısı başarılı" };
      return { success: false, message: `Paraşüt auth hatası: ${tokenRes.status}` };
    } catch (err: any) {
      return { success: false, message: `Bağlantı hatası: ${err.message}` };
    }
  }

  async fetchInvoices(creds: ErpCredentials, startDate: string, endDate: string): Promise<ErpInvoice[]> {
    // OAuth2 token
    const tokenRes = await fetch("https://api.parasut.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }),
    });
    if (!tokenRes.ok) throw new Error("Paraşüt auth hatası");
    const { access_token } = await tokenRes.json();

    // Alış faturaları çek
    const res = await fetch(
      `https://api.parasut.com/v4/${creds.companyId}/purchase_bills?filter[issue_date]=${startDate}..${endDate}&page[size]=250`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!res.ok) throw new Error(`Paraşüt API hatası: ${res.status}`);
    const data = await res.json();

    return (data.data || []).map((inv: any) => ({
      invoiceNo: inv.attributes?.invoice_no || inv.id,
      issueDate: inv.attributes?.issue_date || "",
      vendorName: inv.attributes?.contact_name || "",
      vendorVkn: inv.attributes?.contact_tax_number || "",
      netAmount: parseFloat(inv.attributes?.net_total || "0"),
      vatRate: 0,
      vatAmount: parseFloat(inv.attributes?.total_vat || "0"),
      totalAmount: parseFloat(inv.attributes?.gross_total || "0"),
      currency: inv.attributes?.currency || "TRY",
      invoiceType: "SATIS",
    }));
  }
}

// ============================================================
// LOGO ADAPTER
// ============================================================

class LogoAdapter implements ErpAdapter {
  provider: ErpProvider = "logo";

  async testConnection(creds: ErpCredentials): Promise<ErpTestResult> {
    try {
      const res = await fetch(`${creds.apiUrl}/api/v1/status`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (res.ok) return { success: true, message: "Logo bağlantısı başarılı" };
      return { success: false, message: `Logo API hatası: ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async fetchInvoices(creds: ErpCredentials, startDate: string, endDate: string): Promise<ErpInvoice[]> {
    const res = await fetch(
      `${creds.apiUrl}/api/v1/invoices?type=purchase&startDate=${startDate}&endDate=${endDate}`,
      { headers: { Authorization: `Bearer ${creds.apiKey}` } }
    );
    if (!res.ok) throw new Error(`Logo API hatası: ${res.status}`);
    const data = await res.json();
    return (data.items || data.data || []).map((inv: any) => ({
      invoiceNo: inv.invoiceNumber || inv.number || "",
      issueDate: inv.date || inv.issueDate || "",
      vendorName: inv.vendorName || inv.customerName || "",
      vendorVkn: inv.vendorTaxNumber || inv.taxNumber || "",
      netAmount: parseFloat(inv.netTotal || inv.subtotal || "0"),
      vatRate: parseFloat(inv.vatRate || "0"),
      vatAmount: parseFloat(inv.vatTotal || inv.taxTotal || "0"),
      totalAmount: parseFloat(inv.grossTotal || inv.total || "0"),
      currency: inv.currency || "TRY",
      invoiceType: inv.type || "SATIS",
    }));
  }
}

// ============================================================
// CUSTOM DB ADAPTER
// ============================================================

class CustomDbAdapter implements ErpAdapter {
  provider: ErpProvider = "custom-db";

  async testConnection(creds: ErpCredentials): Promise<ErpTestResult> {
    try {
      if (creds.dbType === "postgresql") {
        const { Pool } = await import("pg");
        const pool = new Pool({
          host: creds.dbHost,
          port: creds.dbPort || 5432,
          database: creds.dbName,
          user: creds.dbUser,
          password: creds.dbPassword,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        });
        const res = await pool.query("SELECT 1 as ok");
        await pool.end();
        return { success: true, message: `PostgreSQL bağlantısı başarılı — ${creds.dbName}` };
      }
      return { success: false, message: `${creds.dbType} henüz desteklenmiyor` };
    } catch (err: any) {
      return { success: false, message: `DB bağlantı hatası: ${err.message}` };
    }
  }

  async fetchInvoices(creds: ErpCredentials, startDate: string, endDate: string): Promise<ErpInvoice[]> {
    if (creds.dbType !== "postgresql") throw new Error("Şimdilik sadece PostgreSQL destekleniyor");
    if (!creds.dbQuery) throw new Error("SQL sorgusu belirtilmedi");

    const { Pool } = await import("pg");
    const pool = new Pool({
      host: creds.dbHost,
      port: creds.dbPort || 5432,
      database: creds.dbName,
      user: creds.dbUser,
      password: creds.dbPassword,
      ssl: { rejectUnauthorized: false },
    });

    // SQL'de $1 ve $2 placeholders: startDate, endDate
    const query = creds.dbQuery
      .replace(/\$1/g, `'${startDate}'`)
      .replace(/\$2/g, `'${endDate}'`);

    const res = await pool.query(query);
    await pool.end();

    return res.rows.map((row: any) => ({
      invoiceNo: row.invoice_no || row.fatura_no || row.belge_no || "",
      issueDate: row.issue_date || row.fatura_tarihi || row.tarih || "",
      vendorName: row.vendor_name || row.satici_unvani || row.unvan || "",
      vendorVkn: row.vendor_vkn || row.satici_vkn || row.vkn || "",
      netAmount: parseFloat(row.net_amount || row.matrah || row.net_tutar || "0"),
      vatRate: parseFloat(row.vat_rate || row.kdv_orani || "0"),
      vatAmount: parseFloat(row.vat_amount || row.kdv_tutari || row.kdv || "0"),
      totalAmount: parseFloat(row.total_amount || row.toplam || row.brut_tutar || "0"),
      currency: row.currency || row.para_birimi || "TRY",
      invoiceType: row.invoice_type || row.fatura_tipi || "SATIS",
    }));
  }
}

// ============================================================
// GENERIC REST API ADAPTER (Mikro, Luca, BizimHesap)
// ============================================================

class GenericErpAdapter implements ErpAdapter {
  provider: ErpProvider;

  constructor(provider: ErpProvider) {
    this.provider = provider;
  }

  async testConnection(creds: ErpCredentials): Promise<ErpTestResult> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (creds.apiKey) headers["Authorization"] = `Bearer ${creds.apiKey}`;
      if (creds.username && creds.password) {
        headers["Authorization"] = `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString("base64")}`;
      }
      const res = await fetch(creds.apiUrl || "", { headers });
      return { success: res.ok, message: res.ok ? "Bağlantı başarılı" : `Hata: ${res.status}` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  async fetchInvoices(): Promise<ErpInvoice[]> {
    return [];
  }
}

// ============================================================
// FACTORY
// ============================================================

const adapters: Record<ErpProvider, ErpAdapter> = {
  parasut: new ParasutAdapter(),
  logo: new LogoAdapter(),
  mikro: new GenericErpAdapter("mikro"),
  luca: new GenericErpAdapter("luca"),
  bizimhesap: new GenericErpAdapter("bizimhesap"),
  "custom-db": new CustomDbAdapter(),
};

export function getErpAdapter(provider: ErpProvider): ErpAdapter {
  return adapters[provider] || adapters["custom-db"];
}

// ============================================================
// SYNC
// ============================================================

export async function syncFromErp(
  creds: ErpCredentials,
  startDate: string,
  endDate: string,
  saveInvoice: (inv: ErpInvoice) => Promise<boolean>
): Promise<ErpSyncResult> {
  const adapter = getErpAdapter(creds.provider);
  const result: ErpSyncResult = { provider: creds.provider, fetched: 0, imported: 0, errors: [] };

  try {
    const invoices = await adapter.fetchInvoices(creds, startDate, endDate);
    result.fetched = invoices.length;

    for (const inv of invoices) {
      try {
        const saved = await saveInvoice(inv);
        if (saved) result.imported++;
      } catch (err: any) {
        result.errors.push(`${inv.invoiceNo}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(err.message);
  }

  return result;
}

// ============================================================
// PROVIDER INFO
// ============================================================

export const ERP_PROVIDERS: Record<ErpProvider, { name: string; icon: string; fields: string[]; docs: string }> = {
  parasut: {
    name: "Paraşüt",
    icon: "💰",
    fields: ["clientId", "clientSecret", "companyId"],
    docs: "Paraşüt API ayarlarından Client ID, Client Secret ve Company ID alabilirsiniz.",
  },
  logo: {
    name: "Logo",
    icon: "🔵",
    fields: ["apiUrl", "apiKey"],
    docs: "Logo Tiger/Go/J-Platform REST API endpoint ve API Key bilgilerinizi girin.",
  },
  mikro: {
    name: "Mikro",
    icon: "🟢",
    fields: ["apiUrl", "username", "password"],
    docs: "Mikro Yazılım web servis URL ve kullanıcı bilgilerinizi girin.",
  },
  luca: {
    name: "Luca",
    icon: "🟡",
    fields: ["apiUrl", "apiKey"],
    docs: "Luca Muhasebe API bilgilerinizi girin.",
  },
  bizimhesap: {
    name: "Bizim Hesap",
    icon: "🔴",
    fields: ["apiUrl", "apiKey"],
    docs: "Bizim Hesap entegrasyon bilgilerinizi girin.",
  },
  "custom-db": {
    name: "Veritabanı Bağlantısı",
    icon: "🗄️",
    fields: ["dbType", "dbHost", "dbPort", "dbName", "dbUser", "dbPassword", "dbQuery"],
    docs: "Kendi veritabanınıza doğrudan bağlanarak fatura verilerini çekebilirsiniz. SQL sorgusunda tarih filtresi için $1 (başlangıç) ve $2 (bitiş) placeholder kullanın.",
  },
};
