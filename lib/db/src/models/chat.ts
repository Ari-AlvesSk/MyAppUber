import mongoose, { Schema } from "mongoose";

export interface IChatMessage {
  rideId: string;
  senderId: string;
  senderRole: "passenger" | "driver";
  text: string;
  createdAt: Date;
}

const chatSchema = new Schema<IChatMessage>(
  {
    rideId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ["passenger", "driver"], required: true },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: true,
    collection: "mensagens_chat",
  },
);

export const ChatModel =
  (mongoose.models["ChatMessage"] as mongoose.Model<IChatMessage> | undefined) ??
  mongoose.model<IChatMessage>("ChatMessage", chatSchema);
