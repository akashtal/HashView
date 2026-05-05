import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { z } from "zod";

const achievementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  award: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  logoUrl: z.string().min(1, "Logo URL is required"),
  storyLink: z.string().min(1, "Story link is required"),
  winner: z.string().optional(),
  quote: z.string().optional(),
  quoteAuthor: z.string().optional(),
  date: z.string().optional(),
  featured: z.boolean().default(true),
  order: z.coerce.number().default(0),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validatedData = achievementSchema.parse(body);

    const achievement = new Achievement(validatedData);
    await achievement.save();

    return NextResponse.json(
      { message: "Achievement created successfully", achievement },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Create achievement error:", error);
    return NextResponse.json({ error: "Failed to create achievement" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured");

    const query: any = {};
    if (featured !== null) {
      query.featured = featured === "true";
    }

    const achievements = await Achievement.find(query)
      .sort({ order: 1, createdAt: -1 });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Get achievements error:", error);
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
}
