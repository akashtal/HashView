import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Eye, Clock } from "lucide-react";
import connectDB from "@/lib/db";
import Blog from "@/models/Blog";

interface BlogPostPageProps {
    params: Promise<{
        slug: string;
    }>;
}

// Function to fetch blog data
async function getBlogPost(slug: string) {
    await connectDB();
    const post = await Blog.findOne({ slug, published: true });
    return post;
}

// Metadata generator
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        return {
            title: "Blog Post Not Found",
        };
    }

    return {
        title: `${post.title} | HashView Blog`,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: post.featuredImage ? [post.featuredImage] : [],
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        notFound();
    }

    // Calculate read time (rough estimate)
    const wordsPerMinute = 200;
    const wordCount = post.content.split(/\s+/g).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);

    return (
        <div className="min-h-screen bg-background pt-24 pb-16">
            <article className="container max-w-4xl mx-auto px-4">
                {/* Back Link */}
                <div className="mb-8">
                    <Link
                        href="/blog"
                        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Blog
                    </Link>
                </div>

                {/* Header */}
                <header className="mb-10 text-center md:text-left">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                        {post.tags.map((tag: string) => (
                            <span
                                key={tag}
                                className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold font-display mb-6 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 text-muted-foreground text-sm">
                        <div className="flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            {post.author}
                        </div>
                        <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                        <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4" />
                            {readTime} min read
                        </div>
                    </div>
                </header>

                {/* Featured Image */}
                {post.featuredImage && (
                    <div className="relative aspect-video w-full mb-12 rounded-xl overflow-hidden bg-muted">
                        <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                )}

                {/* Content */}
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    {/* 
            Note: In a real app with rich text, you might use a library like 'html-react-parser' 
            or render markdown. Using dangerouslySetInnerHTML if content is HTML from a CMS. 
            For now, we assume standard HTML/text content. 
          */}
                    <div dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>

                {/* Footer / Share / Tags */}
                <div className="mt-16 pt-8 border-t">
                    <h3 className="text-xl font-semibold mb-4">Share this post</h3>
                    {/* Add share buttons here if needed later */}
                    <div className="flex gap-4">
                        {/* Placeholders for share functionality */}
                    </div>
                </div>
            </article>
        </div>
    );
}
