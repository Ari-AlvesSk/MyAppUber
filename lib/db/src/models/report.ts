import mongoose, { Schema } from "mongoose";

export interface IReport {
  _id: string;
  rideId: string;
  userId: string;
  driverId?: string | null;
  driverName?: string | null;
  reason: string;
  details?: string | null;
  status: "pending" | "reviewed" | "resolved";
  createdAt?: Date;
}

const reportSchema = new Schema<IReport>(
  {
    _id: { type: String, required: true },
    rideId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    driverId: { type: String, default: null },
    driverName: { type: String, default: null },
    reason: { type: String, required: true },
    details: { type: String, default: null },
    status: { type: String, default: "pending" },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: "denuncias",
  },
);

export const ReportModel =
  (mongoose.models["Report"] as mongoose.Model<IReport> | undefined) ??
  mongoose.model<IReport>("Report", reportSchema);
