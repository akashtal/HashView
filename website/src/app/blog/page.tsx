import { BlogContent } from "@/components/pages/BlogContent";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";
import connectDB from "@/lib/db";
import Blog from "@/models/Blog";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Blog - HashView Reviews | Customer Engagement Insights & Tips",
    description: "Read the latest articles about customer engagement, verified reviews, online reputation management, and business growth tips from HashView Reviews.",
    keywords: [
        "HashView blog", "customer engagement blog", "review management articles",
        "business tips", "online reputation", "customer feedback insights",
        "verified reviews blog", "business growth tips", "customer engagement strategies"
    ],
    openGraph: {
        title: "HashView Reviews Blog - Customer Engagement Insights",
        description: "Read the latest articles about customer engagement, verified reviews, and business growth tips.",
        url: "https://hashview.co.uk/blog",
        type: "website",
    },
    twitter: {
        title: "HashView Reviews Blog - Customer Engagement Insights",
        description: "Read the latest articles about customer engagement and verified reviews.",
    },
    alternates: {
        canonical: "https://hashview.co.uk/blog",
    },
};

// Force dynamic rendering to ensure we get the latest blogs
export const dynamic = 'force-dynamic';

async function getBlogs() {
    await connectDB();
    // Fetch only published blogs, sorted by newest first
    const blogs = await Blog.find({ published: true }).sort({ createdAt: -1 }).lean();

    // Convert _id and dates to strings to solve serialization issues
    return blogs.map((blog: any) => ({
        ...blog,
        _id: blog._id.toString(),
        createdAt: blog.createdAt?.toISOString(),
        updatedAt: blog.updatedAt?.toISOString(),
        publishedAt: blog.publishedAt?.toISOString(),
    }));
}

export default async function BlogPage() {
    const posts = await getBlogs();

    return (
        <div className="relative overflow-hidden min-h-screen pt-20">
            <MouseFollowBackground />
            <BlogContent posts={posts} />
        </div>
    );
}
