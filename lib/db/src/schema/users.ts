import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  role: varchar("role", { length: 20 }).notNull().default("passenger"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash"),
  avatarColor: text("avatar_color"),
  driverStatus: varchar("driver_status", { length: 20 }),
  vehicleType: varchar("vehicle_type", { length: 10 }),
  vehicleModel: text("vehicle_model"),
  vehiclePlate: text("vehicle_plate"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export const selectUserSchema = createSelectSchema(usersTable);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
