import type { Route } from "./+types/work";
import { PageHeader } from "~/components/page-header";
import { ProjectGrid } from "~/components/project-grid";
import { projects } from "~/content/portfolio";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Work", "A filterable index prepared for verified portfolio case studies.", "/work");
}

export default function Work() {
  return (
    <div className="standard-page">
      <PageHeader
        eyebrow="Work index / V0 structure"
        title="Work should explain the decisions, not just display the screens."
        intro="These nine entries are neutral placeholders. Each will be replaced with verified work and clearly scoped individual contributions before launch."
      />
      <ProjectGrid
        projects={projects}
        heading="Project index"
        headingId="work-index-heading"
        intro="Filter by the kind of evidence a future case study will contain."
      />
    </div>
  );
}
