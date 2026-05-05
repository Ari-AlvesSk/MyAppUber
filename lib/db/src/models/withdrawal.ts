import mongoose, { Schema } from "mongoose";

export interface IWithdrawal {
  _id: string;
  driverId: string;
  driverName: string;
  pixKey: string;
  amountCents: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt?: Date;
  processedAt?: Date | null;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    _id: { type: String, required: true },
    driverId: { type: String, required: true, index: true },
    driverName: { type: String, required: true },
    pixKey: { type: String, required: true },
    amountCents: { type: Number, required: true },
    status: { type: String, default: "pending" },
    rejectionReason: { type: String },
    processedAt: { type: Date, default: null },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: "saques",
  },
);

export const WithdrawalModel =
  (mongoose.models["Withdrawal"] as mongoose.Model<IWithdrawal> | undefined) ??
  mongoose.model<IWithdrawal>("Withdrawal", withdrawalSchema);
