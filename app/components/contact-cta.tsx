import { Link } from "react-router";
import { siteContent } from "~/content/site";
import { ArrowUpRightIcon } from "./icons";
import { RevealText, RevealTitle } from "./motion-reveal";

export function ContactCta() {
  return (
    <section className="contact-cta" id="contact" aria-labelledby="contact-cta-heading">
      <RevealTitle id="contact-cta-heading" lines={["Design judgment.", "Practical front-end.", "Finished work."]} />
      <div className="contact-cta__lower">
        <div>
          <RevealText delay={120}>Open to webapp design, UI, design-focused front-end, and web-production roles.</RevealText>
          <span>{siteContent.location} · Remote availability placeholder</span>
        </div>
        <div className="contact-cta__actions">
          <a className="button button--light" href={`mailto:${siteContent.email}`}>
            <span className="liquid-button__surface">Email placeholder <ArrowUpRightIcon /></span>
          </a>
          <a className="button button--outline-light" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">
            <span className="liquid-button__surface">Resume placeholder <ArrowUpRightIcon /></span>
          </a>
          <Link className="text-link text-link--light" to="/contact">All contact details <ArrowUpRightIcon /></Link>
        </div>
      </div>
    </section>
  );
}
