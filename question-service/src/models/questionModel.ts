import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion extends Document {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  createdAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IQuestion>("Question", questionSchema);
