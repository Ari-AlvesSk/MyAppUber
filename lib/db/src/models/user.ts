import mongoose, { Schema } from "mongoose";

export interface IUser {
  _id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  avatarColor?: string;
  driverStatus?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    role: { type: String, default: "passenger" },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String },
    avatarColor: { type: String },
    driverStatus: { type: String },
    vehicleType: { type: String },
    vehicleModel: { type: String },
    vehiclePlate: { type: String },
  },
  {
    _id: false,
    timestamps: true,
    collection: "usuarios",
  },
);

export const UserModel =
  (mongoose.models["User"] as mongoose.Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", userSchema);
