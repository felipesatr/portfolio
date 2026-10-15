import type { Route } from "./+types/home";
import { useOutletContext } from "react-router";
import { ContactCta } from "~/components/contact-cta";
import { Hero } from "~/components/hero";
import { ENABLE_LAB_VIEW_TEST, type ComparisonViewState } from "~/components/lab-view-test";
import { ExperienceSection, LabPreview, SkillsSection } from "~/components/home-sections";
import { KindWordsSections } from "~/components/kind-words";
import { ProjectGrid } from "~/components/project-grid";
import { projects } from "~/content/portfolio";
import { routeMeta } from "~/content/site";

const homeProjects = projects.slice(0, 5);

export function meta(_args: Route.MetaArgs) {
  return routeMeta(
    "Portfolio home",
    "Web App design, accessible front-end implementation, production experience, and leadership presented through a proof-led portfolio structure.",
    "/",
  );
}

export default function Home() {
  const { labView, kindWordsView } = useOutletContext<ComparisonViewState>();
  return (
    <div className="home-page">
      <Hero />
      <ProjectGrid projects={homeProjects} variant="home-marquee" />
      <SkillsSection experiment idSuffix="third" originalCopy toolsLabel="Tools" />
      <LabPreview hidden={ENABLE_LAB_VIEW_TEST && labView === 2} />
      <LabPreview instanceId="third" hidden={ENABLE_LAB_VIEW_TEST && labView === 1} />
      <ExperienceSection />
      <KindWordsSections view={kindWordsView} />
      <ContactCta />
    </div>
  );
}
