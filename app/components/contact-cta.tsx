import { Link } from "react-router";
import { siteContent } from "~/content/site";
import { ArrowUpRightIcon } from "./icons";

export function ContactCta() {
  return (
    <section className="contact-cta" aria-labelledby="contact-cta-heading">
      <h2 id="contact-cta-heading">Design judgment. Practical front-end. Finished work.</h2>
      <div className="contact-cta__lower">
        <div>
          <p>Open to webapp design, UI, design-focused front-end, and web-production roles.</p>
          <span>{siteContent.location} · Remote availability placeholder</span>
        </div>
        <div className="contact-cta__actions">
          <a className="button button--light" href={`mailto:${siteContent.email}`}>
            Email placeholder <ArrowUpRightIcon />
          </a>
          <a className="button button--outline-light" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">
            Résumé placeholder <ArrowUpRightIcon />
          </a>
          <Link className="text-link text-link--light" to="/contact">All contact details <ArrowUpRightIcon /></Link>
        </div>
      </div>
    </section>
  );
}
