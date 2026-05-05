/**
 * Business Detail — SEO Entry Point (Server Component)
 *
 * Exports `generateMetadata` so Next.js generates dynamic <title>/<meta> for
 * each business page at request time.
 *
 * The actual interactive UI lives in BusinessDetailPage (Client Component).
 */
import type { Metadata } from "next";
import ApiService from "@/lib/api";
import BusinessDetailPage from "./BusinessDetailPage";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const data = await ApiService.getBusiness(id);
    const biz = data.business;

    const title = `${biz.name} — HashView`;
    const description =
      biz.description?.slice(0, 155) ||
      `Discover ${biz.name} on HashView. Read verified reviews, check ratings, see latest offers and opening hours.`;
    const image = biz.coverImage?.url || biz.logo?.url;
    const city = biz.address?.city || biz.address?.area;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `https://hashview.co.uk/business/${id}`,
        ...(image && {
          images: [{ url: image, width: 1200, height: 630, alt: biz.name }],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image && { images: [image] }),
      },
      alternates: { canonical: `https://hashview.co.uk/business/${id}` },
      keywords: [biz.name, biz.category, city, "reviews", "local business", "HashView"]
        .filter(Boolean)
        .join(", "),
    };
  } catch {
    return {
      title: "Business — HashView",
      description: "Discover local businesses on HashView.",
    };
  }
}

export default function BusinessPage({ params }: Props) {
  return <BusinessDetailPage params={params} />;
}
