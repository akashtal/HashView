import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQrInquiry extends Document {
  businessName?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  referralSource?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QrInquirySchema: Schema = new Schema(
  {
    businessName:   { type: String, trim: true },
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, trim: true, lowercase: true },
    phone:          { type: String, required: true, trim: true },
    address:        { type: String, trim: true },
    referralSource: { type: String, trim: true },
    read:           { type: Boolean, default: false },
  },
  { timestamps: true }
);

const QrInquiry: Model<IQrInquiry> =
  mongoose.models.QrInquiry ||
  mongoose.model<IQrInquiry>("QrInquiry", QrInquirySchema);

export default QrInquiry;
