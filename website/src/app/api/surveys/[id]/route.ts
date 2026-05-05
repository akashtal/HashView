import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Survey from "@/models/Survey";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { read } = await request.json();
    const { id } = await params;

    const survey = await Survey.findByIdAndUpdate(id, { read }, { new: true });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Survey updated successfully", survey });
  } catch (error) {
    console.error("Update survey error:", error);
    return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await params;
    const survey = await Survey.findByIdAndDelete(id);

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Survey deleted successfully" });
  } catch (error) {
    console.error("Delete survey error:", error);
    return NextResponse.json({ error: "Failed to delete survey" }, { status: 500 });
  }
}

