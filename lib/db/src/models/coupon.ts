import mongoose, { Schema } from "mongoose";

export interface ICoupon {
  _id: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderCents: number;
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
  active: boolean;
  createdAt?: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    _id: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ["percent", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    minOrderCents: { type: Number, default: 0 },
    maxUses: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: "cupons",
  },
);

export const CouponModel =
  (mongoose.models["Coupon"] as mongoose.Model<ICoupon> | undefined) ??
  mongoose.model<ICoupon>("Coupon", couponSchema);
