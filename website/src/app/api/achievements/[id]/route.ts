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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Updated to use Promise type for Next.js 15
) {
  try {
    await connectDB();
    const { id } = await params;
    const achievement = await Achievement.findById(id);

    if (!achievement) {
      return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
    }

    return NextResponse.json({ achievement });
  } catch (error) {
    console.error("Get achievement error:", error);
    return NextResponse.json({ error: "Failed to fetch achievement" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const validatedData = achievementSchema.parse(body);

    const achievement = await Achievement.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    });

    if (!achievement) {
      return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Achievement updated successfully", achievement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Update achievement error:", error);
    return NextResponse.json({ error: "Failed to update achievement" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const achievement = await Achievement.findByIdAndDelete(id);

    if (!achievement) {
      return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Achievement deleted successfully" });
  } catch (error) {
    console.error("Delete achievement error:", error);
    return NextResponse.json({ error: "Failed to delete achievement" }, { status: 500 });
  }
}
