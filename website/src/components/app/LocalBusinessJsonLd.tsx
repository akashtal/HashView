/**
 * JSON-LD Structured Data — LocalBusiness schema
 * Injected as a <script type="application/ld+json"> in the <head>
 * Improves Google rich results for business pages.
 */

interface LocalBusinessJsonLdProps {
  name: string;
  description?: string;
  url: string;
  address?: {
    fullAddress?: string;
    city?: string;
    country?: string;
  };
  telephone?: string;
  image?: string;
  rating?: {
    average: number;
    count: number;
  };
  openingHours?: Record<
    string,
    { open?: string; close?: string; closed?: boolean } | null
  >;
  category?: string;
}

const DAY_MAP: Record<string, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};

export function LocalBusinessJsonLd({
  name,
  description,
  url,
  address,
  telephone,
  image,
  rating,
  openingHours,
  category,
}: LocalBusinessJsonLdProps) {
  const hoursSpec = openingHours
    ? Object.entries(openingHours)
        .filter(([, h]) => h && !h.closed && h.open && h.close)
        .map(([day, h]) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${DAY_MAP[day] ?? day}`,
          opens: (h as { open: string }).open,
          closes: (h as { close: string }).close,
        }))
    : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    ...(description && { description }),
    url,
    ...(address?.fullAddress && {
      address: {
        "@type": "PostalAddress",
        streetAddress: address.fullAddress,
        ...(address.city && { addressLocality: address.city }),
        addressCountry: address.country ?? "GB",
      },
    }),
    ...(telephone && { telephone }),
    ...(image && { image }),
    ...(rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.average.toFixed(1),
        reviewCount: rating.count,
        bestRating: "10",
        worstRating: "1",
      },
    }),
    ...(hoursSpec && hoursSpec.length > 0 && { openingHoursSpecification: hoursSpec }),
    ...(category && { "@type": ["LocalBusiness", category] }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
