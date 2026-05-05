import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Image optimization — allow Cloudinary and common CDNs used by the backend
  images: {
    // Use Cloudinary's own CDN transformations — eliminates upstream timeout errors
    loader: 'custom',
    loaderFile: './src/lib/cloudinary-loader.ts',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimised images for 1 year — eliminates repeated upstream round-trips
    minimumCacheTTL: 31536000,
    remotePatterns: [
      // Cloudinary — all business logos, covers, gallery, review images
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      // AWS S3 (fallback uploads)
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
      // Placeholder images
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
      // UI Avatars (generated initials avatars)
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      // Google User Content (e.g., from Google auth or reviews)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Compression
  compress: true,

  // Remove X-Powered-By header
  poweredByHeader: false,

  // Expose API base URL to client components
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.hashview.co.uk/api',
    NEXT_PUBLIC_API_SECONDARY_URL:
      process.env.NEXT_PUBLIC_API_SECONDARY_URL || '',
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);


