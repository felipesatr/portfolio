import type { Route } from "./+types/services";
import { RevealText, RevealTitle } from "~/components/motion-reveal";
import { ServiceExplorer } from "~/components/service-explorer";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("What I do", "Webapp design, accessible front-end production, and clearly scoped AI-assisted creative workflows.", "/services");
}

export default function Services() {
  return (
    <div className="standard-page services-page">
      <header className="services-page__header">
        <RevealTitle as="h1" lines={["What I do."]} />
        <RevealText delay={100}>Three practical ways I can support a team or project. Open each area for deliverables, tools, and honest scope boundaries.</RevealText>
      </header>
      <ServiceExplorer />
    </div>
  );
}
