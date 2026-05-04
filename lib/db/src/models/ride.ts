import mongoose, { Schema } from "mongoose";

export interface IRide {
  _id: string;
  userId: string;
  pickupLabel: string;
  pickupAddress: string;
  dropoffLabel: string;
  dropoffAddress: string;
  tier: string;
  tierName: string;
  priceCents: number;
  distanceKm: number;
  durationMinutes: number;
  status: string;
  driver?: Record<string, unknown> | null;
  driverId?: string | null;
  createdAt?: Date;
  completedAt?: Date | null;
}

const rideSchema = new Schema<IRide>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    pickupLabel: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    dropoffLabel: { type: String, required: true },
    dropoffAddress: { type: String, required: true },
    tier: { type: String, required: true },
    tierName: { type: String, required: true },
    priceCents: { type: Number, required: true },
    distanceKm: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    status: { type: String, default: "searching" },
    driver: { type: Schema.Types.Mixed, default: null },
    driverId: { type: String, index: true, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: "corridas",
  },
);

export const RideModel =
  (mongoose.models["Ride"] as mongoose.Model<IRide> | undefined) ??
  mongoose.model<IRide>("Ride", rideSchema);
