import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion extends Document {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  createdAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const questionSchema = new Schema<IQuestion>({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },
  topics: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, required: false },
});

export default mongoose.model<IQuestion>("Question", questionSchema);
