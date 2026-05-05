import { MetadataRoute } from 'next';
import connectDB from '@/lib/db';
import Blog from '@/models/Blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://hashview.co.uk';

    // Get all published blogs
    let blogEntries: MetadataRoute.Sitemap = [];
    try {
        await connectDB();
        const blogs = await Blog.find({ published: true })
            .select('slug updatedAt publishedAt createdAt')
            .sort({ publishedAt: -1 })
            .lean();

        blogEntries = blogs.map((blog: any) => ({
            url: `${baseUrl}/blog/${blog.slug}`,
            lastModified: blog.updatedAt ? new Date(blog.updatedAt) : blog.publishedAt ? new Date(blog.publishedAt) : new Date(blog.createdAt),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    } catch (error) {
        console.error('Error generating blog sitemap:', error);
    }

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'yearly' as const,
            priority: 0.3,
        },
    ];

    return [...staticRoutes, ...blogEntries];
}
