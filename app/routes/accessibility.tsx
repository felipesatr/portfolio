import type { Route } from "./+types/accessibility";
import { PageHeader } from "~/components/page-header";
import { RevealTitle } from "~/components/motion-reveal";
import { siteContent, routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Accessibility statement", "The current accessibility approach, testing status, and known limitations of this portfolio V0.", "/accessibility");
}

export default function AccessibilityStatement() {
  return (
    <div className="standard-page policy-page">
      <PageHeader
        title="Accessibility statement."
        intro="This portfolio is being built with accessibility as a requirement from the start. It is still a V0 prototype, so this statement describes current intent and implementation—not a claim of complete WCAG conformance."
      />
      <div className="policy-page__body">
        <section>
          <p className="section-index">Current measures</p>
          <RevealTitle lines={["What is already considered"]} />
          <ul>
            <li>Semantic page regions, heading structure, lists, links, and buttons.</li>
            <li>Keyboard access, visible focus states, a skip link, and focus return after modal dialogs.</li>
            <li>Reduced-motion alternatives for decorative and spatial animation.</li>
            <li>Responsive layouts, readable text, contrast-aware themes, and content that does not rely on hover alone.</li>
          </ul>
        </section>
        <section>
          <p className="section-index">Testing status</p>
          <RevealTitle lines={["What still needs verification"]} />
          <p>Before V1 launch, the site still needs structured keyboard testing across every route and state, automated WCAG checks, contrast verification for every theme, zoom and reflow testing, and screen-reader testing with representative browser combinations.</p>
        </section>
        <section>
          <p className="section-index">Known limitations</p>
          <RevealTitle lines={["What is not finished"]} />
          <p>Project images, résumé details, social links, colleague references, and some labels remain placeholders. Experimental interactions may change as their keyboard, touch, performance, and reduced-motion behavior is reviewed.</p>
        </section>
        <section>
          <p className="section-index">Feedback</p>
          <RevealTitle lines={["Report a barrier"]} />
          <p>If something prevents you from reading, navigating, or operating this portfolio, email <a href={`mailto:${siteContent.email}`}>{siteContent.email}</a> with the page, browser, device, and a short description of the problem. The address must be replaced before public launch.</p>
        </section>
      </div>
      <p className="policy-page__updated">Draft last reviewed 19 August 2026.</p>
    </div>
  );
}
