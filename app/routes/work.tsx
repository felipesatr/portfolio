import type { Route } from "./+types/work";
import { ProjectGrid } from "~/components/project-grid";
import { workProjects } from "~/content/portfolio";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Work", "A filterable index prepared for verified portfolio case studies.", "/work");
}

export default function Work() {
  return (
    <div className="standard-page work-page">
      <ProjectGrid
        projects={workProjects}
        heading="Work."
        headingId="work-index-heading"
        intro="A visual index for finished websites, interfaces, production systems, and interaction studies. Placeholder entries will be replaced only with verified work and clearly scoped contributions."
      />
    </div>
  );
}
