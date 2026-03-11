import { db } from "./db";
import { users, rentals, type User, type InsertUser, type Rental, type InsertRental } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;

  createRental(rental: InsertRental): Promise<Rental>;
  getRentalsByUser(userId: number): Promise<Rental[]>;
  getActiveRental(userId: number, agentType: string): Promise<Rental | undefined>;
  incrementUsage(rentalId: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
