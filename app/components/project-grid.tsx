import { Link } from "react-router";
import { projectTags, type Project } from "~/content/types";
import { useProjectFilter, type ProjectFilter } from "~/hooks/use-project-filter";
import { ArrowUpRightIcon } from "./icons";

interface ProjectGridProps {
  projects: Project[];
  heading?: string;
  headingId?: string;
  intro?: string;
}

function ProjectArtwork({ project, index }: { project: Project; index: number }) {
  return (
    <div className={`project-art project-art--${(index % 5) + 1}`} role="img" aria-label={project.alt}>
      <span className="project-art__shape project-art__shape--one" />
      <span className="project-art__shape project-art__shape--two" />
      <span className="project-art__label">Project image {String(index + 1).padStart(2, "0")}</span>
    </div>
  );
}

export function ProjectGrid({ projects, heading = "Selected work", headingId = "selected-work-heading", intro }: ProjectGridProps) {
  const { selectedFilter, setSelectedFilter, filteredProjects } = useProjectFilter(projects);
  const filters: ProjectFilter[] = ["All", ...projectTags];

  return (
    <section className="projects-section" id="selected-work" aria-labelledby={headingId}>
      <div className="projects-section__header">
        <div>
          <h2 id={headingId}>{heading}</h2>
          <p>{intro ?? "Nine image-led entries. Titles appear on hover and keyboard focus, and remain visible on touch layouts."}</p>
        </div>
        <div className="project-filters" aria-label="Filter projects">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={selectedFilter === filter}
              aria-controls="project-results"
              onClick={() => setSelectedFilter(filter)}
            >
              <span aria-hidden="true" />
              {filter}
            </button>
          ))}
        </div>
      </div>

      <p className="project-results-count" role="status" aria-live="polite">
        {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"} shown
      </p>

      {filteredProjects.length > 0 ? (
        <ul className="project-grid" id="project-results">
          {filteredProjects.map((project) => {
            const originalIndex = projects.findIndex((item) => item.slug === project.slug);
            return (
              <li key={project.slug} className="project-card">
                <article>
                  <Link to={`/work/${project.slug}`} className="project-card__link">
                    <ProjectArtwork project={project} index={originalIndex} />
                    <span className="project-card__overlay">
                      <span className="project-card__number">Project {String(originalIndex + 1).padStart(2, "0")} · Placeholder</span>
                      <strong>{project.title}</strong>
                      <span>{project.summary}</span>
                      <span className="project-card__action">View project <ArrowUpRightIcon /></span>
                    </span>
                  </Link>
                  <ul className="tag-list" aria-label={`Tags for ${project.title}`}>
                    {project.tags.map((tag) => <li key={tag}>{tag}</li>)}
                  </ul>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state" id="project-results">
          <h3>No matching projects</h3>
          <p>Try another filter or return to All.</p>
          <button type="button" className="button button--secondary" onClick={() => setSelectedFilter("All")}>Show all projects</button>
        </div>
      )}
    </section>
  );
}
