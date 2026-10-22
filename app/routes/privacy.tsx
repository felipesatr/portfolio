import type { Route } from "./+types/privacy";
import { PageHeader } from "~/components/page-header";
import { RevealTitle } from "~/components/motion-reveal";
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
          <RevealTitle lines={["Information this site stores"]} />
          <p>The selected color theme is saved in your browser so it can be restored on a later visit. Session preferences record whether the short loading introduction has already played and which globe caption to show next. The About-page globe can cache an approximate city and the provider’s coordinates in this tab’s session storage for up to six hours to avoid repeated location lookups. These preferences and cached coordinates are not sent to a portfolio database.</p>
        </section>
        <section>
          <p className="section-index">02</p>
          <RevealTitle lines={["Contact and external links"]} />
          <p>Email links open your chosen mail application. LinkedIn, résumé, hosting, and future project links may take you to services with their own privacy practices. This portfolio does not currently receive information unless you deliberately send an email.</p>
        </section>
        <section>
          <p className="section-index">03</p>
          <RevealTitle lines={["Approximate location on the About page"]} />
          <p>After the About page first renders, your browser can make two parallel requests to <a href="https://ipwhois.io/privacy" target="_blank" rel="noreferrer">IPWhois</a> and <a href="https://freeipapi.com" target="_blank" rel="noreferrer">FreeIPAPI</a>. Both services receive your network IP address as part of the request. The site compares their approximate cities, regions, countries and coordinates, and checks available ISP, network and proxy information. City disagreement or network uncertainty reduces the location detail shown. The requests time out after 1.6 seconds and do not block the page or globe from rendering. The site does not request GPS access, store your IP address or ISP information, or track your location. Only the resulting approximate place, coordinates and comparison status can be cached locally: up to six hours for matching city estimates, or fifteen minutes for less certain results. If no usable estimate is available, the globe still appears without a visitor marker or invented distance. Places you click on the globe are processed locally using a bundled city reference dataset, not sent to a geocoding service or saved to a server.</p>
        </section>
        <section>
          <p className="section-index">04</p>
          <RevealTitle lines={["Future changes"]} />
          <p>If analytics, forms, embedded media, a newsletter, or an AI assistant are added, this page will identify the provider, the information involved, the purpose, and the available choices before those features are treated as production-ready.</p>
        </section>
        <section>
          <p className="section-index">05</p>
          <RevealTitle lines={["Questions or requests"]} />
          <p>For a privacy question, or to ask about information you have deliberately shared by email, contact <a href={`mailto:${siteContent.email}`}>{siteContent.email}</a>. The address is still a V0 placeholder and must be replaced before launch.</p>
        </section>
      </div>
      <p className="policy-page__updated">Draft last updated 21 October 2026. This is a plain-language project notice, not legal advice.</p>
    </div>
  );
}
