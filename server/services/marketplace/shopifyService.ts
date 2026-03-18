interface ShopifyCredentials {
  storeUrl: string;
  accessToken: string;
}

export class ShopifyService {
  private baseUrl: string;
  private accessToken: string;

  constructor(credentials: ShopifyCredentials) {
    let store = credentials.storeUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    store = store.split("/")[0].split("@").pop() || store;
    if (!store.endsWith(".myshopify.com")) {
      store = `${store}.myshopify.com`;
    }
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(store)) {
      throw new Error("Geçersiz Shopify mağaza URL'si");
    }
    this.baseUrl = `https://${store}/admin/api/2024-01`;
    this.accessToken = credentials.accessToken;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-Shopify-Access-Token": this.accessToken,
      "Content-Type": "application/json",
    };

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Shopify API ${res.status}: ${text.substring(0, 300)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.request("GET", "/shop.json");
      return { success: true, message: "Shopify bağlantısı başarılı" };
    } catch (err: any) {
      return { success: false, message: `Bağlantı hatası: ${err.message}` };
    }
  }

  async getProducts(limit: number = 50, search?: string): Promise<any> {
    let qs = `?limit=${limit}`;
    if (search) qs += `&title=${encodeURIComponent(search)}`;
    return this.request("GET", `/products.json${qs}`);
  }

  async getOrders(params: { status?: string; limit?: number } = {}): Promise<any> {
    const qs = new URLSearchParams();
    qs.set("limit", String(params.limit || 50));
    if (params.status && params.status !== "all") qs.set("status", params.status);
    return this.request("GET", `/orders.json?${qs.toString()}`);
  }

  async getOrderDetail(orderId: string): Promise<any> {
    return this.request("GET", `/orders/${orderId}.json`);
  }

  async updateInventory(inventoryItemId: string, locationId: string, quantity: number): Promise<any> {
    return this.request("POST", "/inventory_levels/set.json", {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      available: quantity,
    });
  }

  async fulfillOrder(orderId: string, trackingNumber: string, trackingCompany: string): Promise<any> {
    return this.request("POST", `/orders/${orderId}/fulfillments.json`, {
      fulfillment: {
        tracking_number: trackingNumber,
        tracking_company: trackingCompany,
        notify_customer: true,
      },
    });
  }

  async getLocations(): Promise<any> {
    return this.request("GET", "/locations.json");
  }
}
