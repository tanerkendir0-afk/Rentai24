const BASE_URL = "https://apigw.trendyol.com/integration";

interface TrendyolCredentials {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
}

export class TrendyolService {
  private sellerId: string;
  private authHeader: string;

  constructor(credentials: TrendyolCredentials) {
    this.sellerId = credentials.sellerId;
    const token = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      "Authorization": this.authHeader,
      "Content-Type": "application/json",
      "User-Agent": "RentAI24-Integration/1.0",
    };

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Trendyol API ${res.status}: ${text.substring(0, 300)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getProducts(0, 1);
      return { success: true, message: "Trendyol bağlantısı başarılı" };
    } catch (err: any) {
      return { success: false, message: `Bağlantı hatası: ${err.message}` };
    }
  }

  async getProducts(page: number = 0, size: number = 50): Promise<any> {
    return this.request("GET", `/product/sellers/${this.sellerId}/products?page=${page}&size=${size}`);
  }

  async updateStockAndPrice(items: Array<{ barcode: string; quantity?: number; salePrice?: number; listPrice?: number }>): Promise<any> {
    return this.request("PUT", `/product/sellers/${this.sellerId}/products/price-and-inventory`, { items });
  }

  async getOrders(params: { startDate?: number; endDate?: number; status?: string; page?: number; size?: number } = {}): Promise<any> {
    const qs = new URLSearchParams();
    if (params.startDate) qs.set("startDate", String(params.startDate));
    if (params.endDate) qs.set("endDate", String(params.endDate));
    if (params.status) qs.set("status", params.status);
    qs.set("page", String(params.page || 0));
    qs.set("size", String(params.size || 50));
    return this.request("GET", `/order/sellers/${this.sellerId}/orders?${qs.toString()}`);
  }

  async getOrderDetail(shipmentPackageId: string): Promise<any> {
    return this.request("GET", `/order/sellers/${this.sellerId}/orders?shipmentPackageId=${shipmentPackageId}`);
  }

  async updateTrackingNumber(packageId: string, trackingNumber: string, cargoProvider: string): Promise<any> {
    return this.request("PUT", `/order/sellers/${this.sellerId}/shipment-packages/${packageId}/tracking-number`, {
      trackingNumber,
      cargoProvider,
    });
  }

  async getCategories(): Promise<any> {
    return this.request("GET", `/product/sellers/${this.sellerId}/category-tree`);
  }

  async getBrands(name?: string): Promise<any> {
    const qs = name ? `?name=${encodeURIComponent(name)}` : "";
    return this.request("GET", `/product/sellers/${this.sellerId}/brands${qs}`);
  }

  async getCustomerQuestions(status?: string): Promise<any> {
    const qs = status ? `?status=${status}` : "";
    return this.request("GET", `/product/sellers/${this.sellerId}/questions${qs}`);
  }

  async answerQuestion(questionId: string, answer: string): Promise<any> {
    return this.request("POST", `/product/sellers/${this.sellerId}/questions/${questionId}/answers`, { text: answer });
  }
}
