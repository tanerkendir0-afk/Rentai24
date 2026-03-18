import { db } from "../../db";
import { marketplaceConnections } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { decryptCredentials } from "../encryption";
import { TrendyolService } from "./trendyolService";
import { ShopifyService } from "./shopifyService";

export type Platform = "trendyol" | "shopify";

export async function getConnections(userId: number) {
  return db.select().from(marketplaceConnections)
    .where(and(eq(marketplaceConnections.userId, userId), eq(marketplaceConnections.isActive, true)));
}

export async function getConnectionById(id: number, userId: number) {
  const [conn] = await db.select().from(marketplaceConnections)
    .where(and(eq(marketplaceConnections.id, id), eq(marketplaceConnections.userId, userId)));
  return conn;
}

export async function getConnectionByPlatform(userId: number, platform: string) {
  const [conn] = await db.select().from(marketplaceConnections)
    .where(and(
      eq(marketplaceConnections.userId, userId),
      eq(marketplaceConnections.platform, platform),
      eq(marketplaceConnections.isActive, true),
    ));
  return conn;
}

export function createTrendyolService(encryptedCreds: string): TrendyolService {
  const creds = decryptCredentials(encryptedCreds);
  return new TrendyolService({
    sellerId: creds.sellerId || creds.supplier_id || "",
    apiKey: creds.apiKey || creds.api_key || "",
    apiSecret: creds.apiSecret || creds.api_secret || "",
  });
}

export function createShopifyService(encryptedCreds: string): ShopifyService {
  const creds = decryptCredentials(encryptedCreds);
  return new ShopifyService({
    storeUrl: creds.storeUrl || creds.store_url || "",
    accessToken: creds.accessToken || creds.access_token || "",
  });
}

export async function getMarketplaceService(userId: number, platform: Platform): Promise<TrendyolService | ShopifyService | null> {
  const conn = await getConnectionByPlatform(userId, platform);
  if (!conn) return null;

  if (platform === "trendyol") {
    return createTrendyolService(conn.credentialsEncrypted);
  } else if (platform === "shopify") {
    return createShopifyService(conn.credentialsEncrypted);
  }
  return null;
}

export async function getAllOrders(userId: number, days: number = 7): Promise<any[]> {
  const connections = await getConnections(userId);
  const allOrders: any[] = [];
  const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

  for (const conn of connections) {
    try {
      if (conn.platform === "trendyol") {
        const svc = createTrendyolService(conn.credentialsEncrypted);
        const result = await svc.getOrders({ startDate, endDate: Date.now() });
        const orders = result?.content || [];
        allOrders.push(...orders.map((o: any) => ({ ...o, _platform: "trendyol" })));
      } else if (conn.platform === "shopify") {
        const svc = createShopifyService(conn.credentialsEncrypted);
        const result = await svc.getOrders({});
        const orders = result?.orders || [];
        allOrders.push(...orders.map((o: any) => ({ ...o, _platform: "shopify" })));
      }
    } catch (err: any) {
      console.error(`[Marketplace] ${conn.platform} orders error:`, err.message);
    }
  }
  return allOrders;
}

export async function getAllProducts(userId: number): Promise<any[]> {
  const connections = await getConnections(userId);
  const allProducts: any[] = [];

  for (const conn of connections) {
    try {
      if (conn.platform === "trendyol") {
        const svc = createTrendyolService(conn.credentialsEncrypted);
        const result = await svc.getProducts(0, 100);
        const products = result?.content || [];
        allProducts.push(...products.map((p: any) => ({ ...p, _platform: "trendyol" })));
      } else if (conn.platform === "shopify") {
        const svc = createShopifyService(conn.credentialsEncrypted);
        const result = await svc.getProducts(100);
        const products = result?.products || [];
        allProducts.push(...products.map((p: any) => ({ ...p, _platform: "shopify" })));
      }
    } catch (err: any) {
      console.error(`[Marketplace] ${conn.platform} products error:`, err.message);
    }
  }
  return allProducts;
}
