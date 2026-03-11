import { db } from "./db";
import { users, rentals, type User, type InsertUser, type Rental, type InsertRental } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined>;

  createRental(rental: InsertRental): Promise<Rental>;
  getRentalsByUser(userId: number): Promise<Rental[]>;
  getActiveRental(userId: number, agentType: string): Promise<Rental | undefined>;
  incrementUsage(rentalId: number): Promise<void>;

  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean): Promise<any[]>;
  listProductsWithPrices(active?: boolean): Promise<any[]>;
  getPrice(priceId: string): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createRental(rental: InsertRental): Promise<Rental> {
    const [created] = await db.insert(rentals).values(rental).returning();
    return created;
  }

  async getRentalsByUser(userId: number): Promise<Rental[]> {
    return db.select().from(rentals).where(eq(rentals.userId, userId));
  }

  async getActiveRental(userId: number, agentType: string): Promise<Rental | undefined> {
    const [rental] = await db
      .select()
      .from(rentals)
      .where(and(eq(rentals.userId, userId), eq(rentals.agentType, agentType), eq(rentals.status, "active")));
    return rental;
  }

  async incrementUsage(rentalId: number): Promise<void> {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId));
    if (rental) {
      await db
        .update(rentals)
        .set({ messagesUsed: rental.messagesUsed + 1 })
        .where(eq(rentals.id, rentalId));
    }
  }

  async updateUserStripeInfo(userId: number, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(info).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }
}

export const storage = new DatabaseStorage();
