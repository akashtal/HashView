import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  featuredImage?: string;
  published: boolean;
  publishedAt?: Date;
  tags: string[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    featuredImage: { type: String },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date },
    tags: [{ type: String }],
    views: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Blog: Model<IBlog> = mongoose.models.Blog || mongoose.model<IBlog>("Blog", BlogSchema);

export default Blog;

