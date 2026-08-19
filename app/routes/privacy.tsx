import type { Route } from "./+types/privacy";
import { PageHeader } from "~/components/page-header";
import { siteContent, routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Privacy", "How this portfolio currently handles preferences, contact links, and personal information.", "/privacy");
}

export default function Privacy() {
  return (
    <div className="standard-page policy-page">
      <PageHeader
        title="Privacy."
        intro="This V0 is deliberately simple: it does not use analytics, advertising trackers, contact forms, accounts, or a newsletter. This notice will be updated before any of those services are introduced."
      />
      <div className="policy-page__body">
        <section>
          <p className="section-index">01</p>
          <h2>Information this site stores</h2>
          <p>The selected color theme is saved in your browser so it can be restored on a later visit. A session preference records whether the short loading introduction has already played. These preferences stay in your browser and are not sent to a portfolio database.</p>
        </section>
        <section>
          <p className="section-index">02</p>
          <h2>Contact and external links</h2>
          <p>Email links open your chosen mail application. LinkedIn, résumé, hosting, and future project links may take you to services with their own privacy practices. This portfolio does not currently receive information unless you deliberately send an email.</p>
        </section>
        <section>
          <p className="section-index">03</p>
          <h2>Future changes</h2>
          <p>If analytics, forms, embedded media, a newsletter, or an AI assistant are added, this page will identify the provider, the information involved, the purpose, and the available choices before those features are treated as production-ready.</p>
        </section>
        <section>
          <p className="section-index">04</p>
          <h2>Questions or requests</h2>
          <p>For a privacy question, or to ask about information you have deliberately shared by email, contact <a href={`mailto:${siteContent.email}`}>{siteContent.email}</a>. The address is still a V0 placeholder and must be replaced before launch.</p>
        </section>
      </div>
      <p className="policy-page__updated">Draft last updated 19 August 2026. This is a plain-language project notice, not legal advice.</p>
    </div>
  );
}
