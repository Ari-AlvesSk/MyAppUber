import mongoose, { Schema } from "mongoose";

export interface IUser {
  _id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  passwordHash?: string;
  avatarColor?: string;
  driverStatus?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  pushToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    role: { type: String, default: "passenger" },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true, unique: true },
    phone: { type: String, required: true, index: true, unique: true },
    cpf: { type: String, required: true, index: true, unique: true },
    passwordHash: { type: String },
    avatarColor: { type: String },
    driverStatus: { type: String },
    vehicleType: { type: String },
    vehicleModel: { type: String },
    vehiclePlate: { type: String },
    pushToken: { type: String },
  },
  {
    _id: false,
    timestamps: true,
    collection: "usuarios",
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ cpf: 1 }, { unique: true });

export const UserModel =
  (mongoose.models["User"] as mongoose.Model<IUser> | undefined) ??
  mongoose.model<IUser>("User", userSchema);
