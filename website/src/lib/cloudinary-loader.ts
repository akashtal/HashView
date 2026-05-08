/**
 * Cloudinary Image Loader for Next.js
 *
 * When src is a Cloudinary URL (res.cloudinary.com), we apply Cloudinary's
 * own transformation parameters for width, quality, and format instead of
 * routing the image through Next.js's image optimization endpoint.
 *
 * This eliminates:
 *  - The upstream image response timeout errors
 *  - Re-encoding latency (Cloudinary already serves optimized WebP/AVIF)
 *  - Double caching (Next.js cache + Cloudinary CDN)
 */

interface LoaderProps {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudinaryLoader({ src, width, quality = 80 }: LoaderProps): string {
  // Only transform Cloudinary URLs; pass everything else through with a dummy width
  // query parameter to satisfy Next.js's "loader does not implement width" check.
  if (!src.includes('res.cloudinary.com')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}&q=${quality || 75}`;
  }

  // Cloudinary URL format:
  //   https://res.cloudinary.com/{cloud}/image/upload/{transforms}/{version}/{public_id}.{ext}
  // We insert our transformation string before the version/path segment.
  const uploadIndex = src.indexOf('/upload/');
  if (uploadIndex === -1) return src;

  const base = src.slice(0, uploadIndex + 8); // includes /upload/
  const rest = src.slice(uploadIndex + 8);

  // Apply width, quality, auto-format, and progressive loading
  const transforms = `w_${width},q_${quality},f_auto,fl_progressive`;

  return `${base}${transforms}/${rest}`;
}
