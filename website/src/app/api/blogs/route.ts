import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Blog from "@/models/Blog";
import { z } from "zod";

const blogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().min(1, "Excerpt is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author is required"),
  featuredImage: z.string().optional(),
  published: z.boolean().default(false),
  publishedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validatedData = blogSchema.parse(body);

    if (validatedData.published && !validatedData.publishedAt) {
      validatedData.publishedAt = new Date().toISOString();
    }

    const blog = new Blog(validatedData);
    await blog.save();

    return NextResponse.json(
      { message: "Blog created successfully", blog },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    if ((error as any).code === 11000) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    console.error("Create blog error:", error);
    return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const published = searchParams.get("published");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const slug = searchParams.get("slug");

    const query: any = {};
    if (published !== null) {
      query.published = published === "true";
    }
    if (slug) {
      query.slug = slug;
    }

    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Blog.countDocuments(query);

    return NextResponse.json({
      blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 });
  }
}

