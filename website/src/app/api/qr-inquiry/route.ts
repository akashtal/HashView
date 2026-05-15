import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import QrInquiry from "@/models/QrInquiry";
import { sendQrInquiryNotification } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name:           z.string().min(1, "Name is required").max(100),
  email:          z.string().email("Invalid email address"),
  phone:          z.string().min(5, "Phone is required").max(30),
  address:        z.string().max(300).optional(),
  referralSource: z.string().max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const data = schema.parse(body);

    // Save to MongoDB
    const inquiry = new QrInquiry({
      name:           data.name,
      email:          data.email,
      phone:          data.phone,
      address:        data.address || "",
      referralSource: data.referralSource || "",
    });
    await inquiry.save();
    console.log("✅ [QR INQUIRY API] Saved to DB:", inquiry._id);

    // Fire email notifications (non-blocking — don't fail the request if email fails)
    sendQrInquiryNotification({
      name:           data.name,
      email:          data.email,
      phone:          data.phone,
      address:        data.address,
      referralSource: data.referralSource,
    }).catch((err) =>
      console.error("⚠️ [QR INQUIRY API] Email error (non-fatal):", err)
    );

    return NextResponse.json(
      { success: true, message: "Inquiry received! We'll be in touch within 24 hours.", id: inquiry._id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("❌ [QR INQUIRY API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Reserved for admin dashboard — list all QR inquiries
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const read  = searchParams.get("read");

    const query: Record<string, unknown> = {};
    if (read !== null) query.read = read === "true";

    const [inquiries, total] = await Promise.all([
      QrInquiry.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      QrInquiry.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      inquiries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("❌ [QR INQUIRY API] GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch inquiries" }, { status: 500 });
  }
}
