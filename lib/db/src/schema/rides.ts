import { integer, jsonb, pgTable, text, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ridesTable = pgTable("rides", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  pickupLabel: text("pickup_label").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  dropoffLabel: text("dropoff_label").notNull(),
  dropoffAddress: text("dropoff_address").notNull(),
  tier: varchar("tier", { length: 10 }).notNull(),
  tierName: text("tier_name").notNull(),
  priceCents: integer("price_cents").notNull(),
  distanceKm: real("distance_km").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("searching"),
  driver: jsonb("driver"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertRideSchema = createInsertSchema(ridesTable).omit({ createdAt: true });
export const selectRideSchema = createSelectSchema(ridesTable);

export type InsertRide = z.infer<typeof insertRideSchema>;
export type RideRow = typeof ridesTable.$inferSelect;
