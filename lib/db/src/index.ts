import mongoose from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected || mongoose.connection.readyState === 1) return;

  const uri = process.env["MONGODB_URI"];
  const dbName = process.env["MONGODB_DB"] ?? "DbSistemaCaronaParaunaMobi";

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  await mongoose.connect(uri, { dbName });
  connected = true;
}

export * from "./models/user";
export * from "./models/ride";
export * from "./models/payment";
export * from "./models/withdrawal";
export * from "./models/coupon";
