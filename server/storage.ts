import { eq, and, or } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  books,
  bookMembers,
  cloudTransactions,
  cloudDebts,
  type User,
  type InsertUser,
  type Book,
  type BookMember,
  type CloudTransaction,
  type CloudDebt,
} from "@shared/schema";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const test = scryptSync(password, salt, 64).toString("hex");
  return hash === test;
}

export const storage = {
  async createUser(data: InsertUser): Promise<User> {
    const hashed = hashPassword(data.password);
    const [user] = await db
      .insert(users)
      .values({ ...data, password: hashed })
      .returning();
    return user;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  },

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },

  async verifyLogin(
    username: string,
    password: string
  ): Promise<User | null> {
    const user = await storage.getUserByUsername(username);
    if (!user) return null;
    if (!verifyPassword(password, user.password)) return null;
    return user;
  },

  async createBook(name: string, description: string, ownerId: string): Promise<Book> {
    const [book] = await db
      .insert(books)
      .values({ name, description, ownerId })
      .returning();
    await db.insert(bookMembers).values({
      bookId: book.id,
      userId: ownerId,
      role: "owner",
    });
    return book;
  },

  async getBook(bookId: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, bookId));
    return book;
  },

  async getUserBooks(userId: string): Promise<(Book & { role: string })[]> {
    const memberships = await db
      .select()
      .from(bookMembers)
      .where(eq(bookMembers.userId, userId));
    const result: (Book & { role: string })[] = [];
    for (const m of memberships) {
      const book = await storage.getBook(m.bookId);
      if (book) result.push({ ...book, role: m.role });
    }
    return result;
  },

  async updateBook(bookId: string, data: { name?: string; description?: string }): Promise<Book | undefined> {
    const [book] = await db
      .update(books)
      .set(data)
      .where(eq(books.id, bookId))
      .returning();
    return book;
  },

  async deleteBook(bookId: string): Promise<void> {
    await db.delete(books).where(eq(books.id, bookId));
  },

  async getBookMembers(bookId: string): Promise<(BookMember & { username: string; displayName: string })[]> {
    const members = await db
      .select()
      .from(bookMembers)
      .where(eq(bookMembers.bookId, bookId));
    const result: (BookMember & { username: string; displayName: string })[] = [];
    for (const m of members) {
      const user = await storage.getUserById(m.userId);
      if (user) {
        result.push({ ...m, username: user.username, displayName: user.displayName });
      }
    }
    return result;
  },

  async getUserMembership(bookId: string, userId: string): Promise<BookMember | undefined> {
    const [m] = await db
      .select()
      .from(bookMembers)
      .where(and(eq(bookMembers.bookId, bookId), eq(bookMembers.userId, userId)));
    return m;
  },

  async addBookMember(bookId: string, userId: string, role: string): Promise<BookMember> {
    const [m] = await db
      .insert(bookMembers)
      .values({ bookId, userId, role })
      .returning();
    return m;
  },

  async updateMemberRole(memberId: string, bookId: string, role: string): Promise<BookMember | undefined> {
    const [m] = await db
      .update(bookMembers)
      .set({ role })
      .where(and(eq(bookMembers.id, memberId), eq(bookMembers.bookId, bookId)))
      .returning();
    return m;
  },

  async removeMember(memberId: string, bookId: string): Promise<void> {
    await db.delete(bookMembers).where(and(eq(bookMembers.id, memberId), eq(bookMembers.bookId, bookId)));
  },

  async getBookTransactions(bookId: string): Promise<CloudTransaction[]> {
    return db
      .select()
      .from(cloudTransactions)
      .where(eq(cloudTransactions.bookId, bookId))
      .orderBy(cloudTransactions.createdAt);
  },

  async addTransaction(bookId: string, data: any, userId: string): Promise<CloudTransaction> {
    const [tx] = await db
      .insert(cloudTransactions)
      .values({ ...data, bookId, createdBy: userId })
      .returning();
    return tx;
  },

  async updateTransaction(txId: string, bookId: string, data: any): Promise<CloudTransaction | undefined> {
    const [tx] = await db
      .update(cloudTransactions)
      .set(data)
      .where(and(eq(cloudTransactions.id, txId), eq(cloudTransactions.bookId, bookId)))
      .returning();
    return tx;
  },

  async deleteTransaction(txId: string, bookId: string): Promise<void> {
    await db
      .delete(cloudTransactions)
      .where(and(eq(cloudTransactions.id, txId), eq(cloudTransactions.bookId, bookId)));
  },

  async getBookDebts(bookId: string): Promise<CloudDebt[]> {
    return db
      .select()
      .from(cloudDebts)
      .where(eq(cloudDebts.bookId, bookId))
      .orderBy(cloudDebts.createdAt);
  },

  async addDebt(bookId: string, data: any, userId: string): Promise<CloudDebt> {
    const [debt] = await db
      .insert(cloudDebts)
      .values({ ...data, bookId, createdBy: userId })
      .returning();
    return debt;
  },

  async updateDebt(debtId: string, bookId: string, data: any): Promise<CloudDebt | undefined> {
    const [debt] = await db
      .update(cloudDebts)
      .set(data)
      .where(and(eq(cloudDebts.id, debtId), eq(cloudDebts.bookId, bookId)))
      .returning();
    return debt;
  },

  async deleteDebt(debtId: string, bookId: string): Promise<void> {
    await db
      .delete(cloudDebts)
      .where(and(eq(cloudDebts.id, debtId), eq(cloudDebts.bookId, bookId)));
  },
};
