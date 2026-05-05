import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Survey from "@/models/Survey";
import { sendSurveyNotification } from "@/lib/email";
import { z } from "zod";

const surveySchema = z.object({
  type: z.enum(["customer", "partner"]),
  answers: z.record(z.string()),
  contactDetails: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
  }),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validatedData = surveySchema.parse(body);

    const survey = new Survey({
      type: validatedData.type,
      answers: validatedData.answers,
      contactDetails: validatedData.contactDetails,
    });
    await survey.save();
    console.log("✅ [SURVEY API] Survey saved to database:", survey._id);

    // Send email notification (always attempt - AND WAIT FOR IT)
    console.log("📧 [SURVEY API] Attempting to send email notification...");
    try {
      await sendSurveyNotification({
        type: validatedData.type,
        answers: validatedData.answers,
        contactDetails: validatedData.contactDetails as { name: string; email: string; phone: string },
      });
      console.log("✅ [SURVEY API] Email notification process completed");
    } catch (emailError) {
      console.log("⚠️ [SURVEY API] Email notification error:", emailError instanceof Error ? emailError.message : "Unknown error");
    }

    return NextResponse.json(
      { message: "Survey submitted successfully", id: survey._id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Survey submission error:", error);
    return NextResponse.json({ error: "Failed to submit survey" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const read = searchParams.get("read");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const query: any = {};
    if (type) {
      query.type = type;
    }
    if (read !== null) {
      query.read = read === "true";
    }

    const surveys = await Survey.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Survey.countDocuments(query);

    return NextResponse.json({
      surveys,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get surveys error:", error);
    return NextResponse.json({ error: "Failed to fetch surveys" }, { status: 500 });
  }
}

