import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Contact from "@/models/Contact";
import { sendContactNotification } from "@/lib/email";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type ContactData = z.infer<typeof contactSchema>;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const parsed = contactSchema.parse(body);

    // Create validated data with explicit type
    const validatedData: ContactData = {
      name: parsed.name,
      email: parsed.email,
      subject: parsed.subject,
      message: parsed.message,
    };

    const contact = new Contact(validatedData);
    await contact.save();
    console.log("✅ [CONTACT API] Contact saved to database:", contact._id);

    // Send email notifications (always attempt - AND WAIT FOR IT to ensure delivery)
    console.log("📧 [CONTACT API] Attempting to send email notifications...");
    try {
      await sendContactNotification({
        name: validatedData.name,
        email: validatedData.email,
        subject: validatedData.subject,
        message: validatedData.message,
      });
      console.log("✅ [CONTACT API] Email notification process completed");
    } catch (emailError) {
      console.log("⚠️ [CONTACT API] Email notification error:", emailError instanceof Error ? emailError.message : "Unknown error");
    }

    return NextResponse.json(
      { message: "Contact form submitted successfully", id: contact._id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Contact form error:", error);
    return NextResponse.json({ error: "Failed to submit contact form" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const read = searchParams.get("read");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const query: any = {};
    if (read !== null) {
      query.read = read === "true";
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

