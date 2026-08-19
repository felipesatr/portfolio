import { useMemo, useState } from "react";
import type { Project, ProjectTag } from "~/content/types";

export type ProjectFilter = "All" | ProjectTag;

export function useProjectFilter(projects: Project[]) {
  const [selectedFilters, setSelectedFilters] = useState<ProjectTag[]>([]);

  const filteredProjects = useMemo(
    () => selectedFilters.length === 0
      ? projects
      : projects.filter((project) => selectedFilters.some((filter) => project.tags.includes(filter))),
    [projects, selectedFilters],
  );

  const toggleFilter = (filter: ProjectFilter) => {
    if (filter === "All") {
      setSelectedFilters([]);
      return;
    }

    setSelectedFilters((current) => current.includes(filter)
      ? current.filter((item) => item !== filter)
      : [...current, filter]);
  };

  return {
    selectedFilters,
    toggleFilter,
    clearFilters: () => setSelectedFilters([]),
    filteredProjects,
  };
}
