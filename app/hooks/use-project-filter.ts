import { useMemo, useState } from "react";
import type { Project, ProjectTag } from "~/content/types";

export type ProjectFilter = "All" | ProjectTag;

export function useProjectFilter(projects: Project[]) {
  const [selectedFilter, setSelectedFilter] = useState<ProjectFilter>("All");

  const filteredProjects = useMemo(
    () =>
      selectedFilter === "All"
        ? projects
        : projects.filter((project) => project.tags.includes(selectedFilter)),
    [projects, selectedFilter],
  );

  return { selectedFilter, setSelectedFilter, filteredProjects };
}
