import type { Route } from "./+types/home";
import { ContactCta } from "~/components/contact-cta";
import { Hero } from "~/components/hero";
import { ExperienceSection, LabPreview, MakingOfSection, ReferencesSection, SkillsSection } from "~/components/home-sections";
import { ProjectGrid } from "~/components/project-grid";
import { projects } from "~/content/portfolio";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta(
    "Portfolio home",
    "Webapp design, accessible front-end implementation, production experience, and leadership presented through a proof-led portfolio structure.",
    "/",
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <ProjectGrid projects={projects} />
      <SkillsSection />
      <LabPreview />
      <ExperienceSection />
      <ReferencesSection />
      <MakingOfSection />
      <ContactCta />
    </>
  );
}
