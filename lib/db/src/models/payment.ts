import mongoose, { Schema } from "mongoose";

export interface IPayment {
  _id: string;
  userId: string;
  type: string;
  label: string;
  detail: string;
  isDefault: boolean;
}

const paymentSchema = new Schema<IPayment>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    detail: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  {
    _id: false,
    timestamps: false,
    collection: "pagamentos",
  },
);

export const PaymentModel =
  (mongoose.models["Payment"] as mongoose.Model<IPayment> | undefined) ??
  mongoose.model<IPayment>("Payment", paymentSchema);
