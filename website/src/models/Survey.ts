import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISurvey extends Document {
  type: "customer" | "partner";
  answers: Record<string, string>;
  contactDetails: {
    name: string;
    email: string;
    phone: string;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SurveySchema: Schema = new Schema(
  {
    type: { type: String, enum: ["customer", "partner"], required: true },
    answers: { type: Map, of: String, required: true },
    contactDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Survey: Model<ISurvey> = mongoose.models.Survey || mongoose.model<ISurvey>("Survey", SurveySchema);

export default Survey;

