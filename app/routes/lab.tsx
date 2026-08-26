import type { Route } from "./+types/lab";
import { PageHeader } from "~/components/page-header";
import { RevealTitle } from "~/components/motion-reveal";
import { labExperiments } from "~/content/portfolio";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Interaction Lab", "A lightweight index prepared for future motion, interface-behavior, and creative-coding studies.", "/lab");
}

export default function Lab() {
  return (
    <div className="standard-page lab-page">
      <PageHeader
        eyebrow="Interaction Lab / Static V0"
        title="Small experiments, loaded with restraint."
        intro="This route reserves space for future interaction work without adding experimental libraries to the first release or the homepage bundle."
      />
      <div className="lab-index">
        {labExperiments.map((experiment, index) => (
          <article id={experiment.slug} key={experiment.slug} className="lab-index__item">
            <div className={`lab-index__poster lab-card__graphic--${index + 1}`} aria-hidden="true"><span>0{index + 1}</span></div>
            <div><p className="section-index">{experiment.category} · Future experiment</p><RevealTitle lines={[experiment.title]} /><p>{experiment.summary}</p><dl><div><dt>Status</dt><dd>Static placeholder</dd></div><div><dt>Future loading</dt><dd>Dynamic import after user intent</dd></div><div><dt>Accessibility</dt><dd>Keyboard, reduced-motion, and non-canvas alternative required</dd></div></dl></div>
          </article>
        ))}
      </div>
    </div>
  );
}
