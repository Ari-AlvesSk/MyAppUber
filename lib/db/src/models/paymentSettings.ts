import mongoose, { Schema } from "mongoose";

export interface IPaymentSettings {
  _id: string;
  pixKey: string;
  pixKeyType: "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";
  pixEnabled: boolean;
  cardEnabled: boolean;
  cashEnabled: boolean;
  cardFeePercent: number;
  commissionPercent: number;
  pricePerKmCar: number;
  pricePerKmMoto: number;
  minPriceCar: number;
  minPriceMoto: number;
  stripePublishableKey: string;
  stripeSecretKey: string;
  mercadoPagoAccessToken: string;
  updatedAt: number;
}

const paymentSettingsSchema = new Schema<IPaymentSettings>(
  {
    _id: { type: String, default: "singleton" },
    pixKey: { type: String, default: "" },
    pixKeyType: { type: String, default: "cpf" },
    pixEnabled: { type: Boolean, default: true },
    cardEnabled: { type: Boolean, default: true },
    cashEnabled: { type: Boolean, default: true },
    cardFeePercent: { type: Number, default: 3.5 },
    commissionPercent: { type: Number, default: 20 },
    pricePerKmCar: { type: Number, default: 2.5 },
    pricePerKmMoto: { type: Number, default: 1.8 },
    minPriceCar: { type: Number, default: 8.0 },
    minPriceMoto: { type: Number, default: 5.0 },
    stripePublishableKey: { type: String, default: "" },
    stripeSecretKey: { type: String, default: "" },
    mercadoPagoAccessToken: { type: String, default: "" },
    updatedAt: { type: Number, default: () => Date.now() },
  },
  { _id: false, collection: "configuracoes_pagamento" },
);

export const PaymentSettingsModel =
  (mongoose.models["PaymentSettings"] as mongoose.Model<IPaymentSettings> | undefined) ??
  mongoose.model<IPaymentSettings>("PaymentSettings", paymentSettingsSchema);
