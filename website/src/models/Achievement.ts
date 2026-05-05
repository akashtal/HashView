import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAchievement extends Document {
  title: string;
  award?: string;
  description: string;
  logoUrl: string;
  storyLink: string;
  winner?: string;
  quote?: string;
  quoteAuthor?: string;
  date?: string;
  featured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    award: { type: String },
    description: { type: String, required: true },
    logoUrl: { type: String, required: true },
    storyLink: { type: String, required: true },
    winner: { type: String },
    quote: { type: String },
    quoteAuthor: { type: String },
    date: { type: String },
    featured: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Achievement: Model<IAchievement> = mongoose.models.Achievement || mongoose.model<IAchievement>("Achievement", AchievementSchema);

export default Achievement;
