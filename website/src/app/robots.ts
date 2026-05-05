import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = "https://hashview.co.uk"; // Replace with actual domain

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin/", "/api/"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
