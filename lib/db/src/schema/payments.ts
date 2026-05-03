import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  label: text("label").notNull(),
  detail: text("detail").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable);
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
