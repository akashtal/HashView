import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Blog from "@/models/Blog";
import Contact from "@/models/Contact";
import Survey from "@/models/Survey";
import Achievement from "@/models/Achievement";

export async function GET() {
  try {
    await connectDB();

    const [blogs, contacts, surveys, achievements, publishedBlogs, unreadContacts, unreadSurveys] =
      await Promise.all([
        Blog.countDocuments(),
        Contact.countDocuments(),
        Survey.countDocuments(),
        Achievement.countDocuments(),
        Blog.countDocuments({ published: true }),
        Contact.countDocuments({ read: false }),
        Survey.countDocuments({ read: false }),
      ]);

    const [customerSurveys, partnerSurveys] = await Promise.all([
      Survey.countDocuments({ type: "customer" }),
      Survey.countDocuments({ type: "partner" }),
    ]);

    return NextResponse.json({
      blogs: {
        total: blogs,
        published: publishedBlogs,
        draft: blogs - publishedBlogs,
      },
      contacts: {
        total: contacts,
        unread: unreadContacts,
        read: contacts - unreadContacts,
      },
      surveys: {
        total: surveys,
        unread: unreadSurveys,
        read: surveys - unreadSurveys,
        customer: customerSurveys,
        partner: partnerSurveys,
      },
      achievements: {
        total: achievements,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

