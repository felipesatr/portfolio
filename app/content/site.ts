import type { MetaDescriptor } from "react-router";

export const siteContent = {
  name: "Name placeholder",
  title: "Webapp Designer & Front-End Developer",
  headline: "Design the interface. Understand the constraints. Finish the work.",
  // Provisional V0 copy. Replace only after the positioning review.
  supportingStatement:
    "I design and build responsive, accessible websites and interfaces shaped by real content, production requirements, and the people responsible for delivering them.",
  canonicalOrigin: "https://portfolio.example",
  email: "replace-me@example.invalid",
  location: "Location / time zone placeholder",
  availability: "Availability placeholder for selected design and front-end roles",
} as const;

export function routeMeta(title: string, description: string, path: string): MetaDescriptor[] {
  const canonical = `${siteContent.canonicalOrigin}${path}`;
  return [
    { title: `${title} | ${siteContent.title}` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:title", content: `${title} | ${siteContent.title}` },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: `${siteContent.canonicalOrigin}/social-card-placeholder.svg` },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
