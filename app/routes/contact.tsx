import type { Route } from "./+types/contact";
import { ArrowUpRightIcon } from "~/components/icons";
import { PageHeader } from "~/components/page-header";
import { routeMeta, siteContent } from "~/content/site";
import { publicAsset } from "~/lib/public-asset";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Contact", "Direct contact details for webapp design and design-focused front-end opportunities.", "/contact");
}

export default function Contact() {
  return (
    <div className="standard-page contact-page">
      <PageHeader
        eyebrow="Contact / Placeholder details"
        title="For roles where design judgment and implementation both matter."
        intro="Open to webapp design, UI design, design-focused front-end, web production, and related opportunities. Replace every placeholder below before public launch."
      />
      <section className="contact-directory" aria-labelledby="contact-directory-heading">
        <h2 id="contact-directory-heading" className="visually-hidden">Contact directory</h2>
        <a href={`mailto:${siteContent.email}`}><span>Email</span><strong>Email address placeholder</strong><ArrowUpRightIcon /></a>
        <a href={publicAsset("resume-placeholder.txt")} target="_blank" rel="noreferrer"><span>Resume</span><strong>Resume placeholder document</strong><ArrowUpRightIcon /></a>
        <div aria-disabled="true"><span>LinkedIn</span><strong>Profile URL placeholder</strong></div>
        <div aria-disabled="true"><span>GitHub</span><strong>Profile URL placeholder</strong></div>
        <div aria-disabled="true"><span>Location</span><strong>{siteContent.location}</strong></div>
      </section>
      <aside className="placeholder-notice"><strong>V0 publication notice</strong><p>The email domain is intentionally invalid, and social profiles are not links. This prevents unfinished contact information from looking real.</p></aside>
    </div>
  );
}
