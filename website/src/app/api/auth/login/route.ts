import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Admin from "@/models/Admin";
import { initializeDefaultAdmin } from "@/lib/initAdmin";
import { generateToken } from "@/lib/jwt";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Initialize default admin if it doesn't exist
    await initializeDefaultAdmin();

    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const admin = await Admin.findOne({ email: validatedData.email });

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordValid = await admin.comparePassword(validatedData.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT token
    const token = generateToken({
      id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
    });

    // Create response with token in httpOnly cookie
    const response = NextResponse.json({
      message: "Login successful",
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });

    // Set httpOnly cookie (more secure than localStorage)
    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}

