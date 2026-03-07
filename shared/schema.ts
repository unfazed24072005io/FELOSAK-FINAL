import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const books = pgTable("books", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookMembers = pgTable("book_members", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cloudTransactions = pgTable("cloud_transactions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  category: text("category").notNull(),
  note: text("note").default(""),
  date: text("date").notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cloudDebts = pgTable("cloud_debts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  note: text("note").default(""),
  dueDate: text("due_date").default(""),
  settled: boolean("settled").default(false),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
});

export const insertBookSchema = createInsertSchema(books).pick({
  name: true,
  description: true,
});

export const insertTransactionSchema = createInsertSchema(cloudTransactions).pick({
  type: true,
  amount: true,
  category: true,
  note: true,
  date: true,
});

export const insertDebtSchema = createInsertSchema(cloudDebts).pick({
  direction: true,
  name: true,
  amount: true,
  note: true,
  dueDate: true,
  settled: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Book = typeof books.$inferSelect;
export type BookMember = typeof bookMembers.$inferSelect;
export type CloudTransaction = typeof cloudTransactions.$inferSelect;
export type CloudDebt = typeof cloudDebts.$inferSelect;
