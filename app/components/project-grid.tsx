import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Link } from "react-router";
import { projectTags, type Project } from "~/content/types";
import { useProjectFilter, type ProjectFilter } from "~/hooks/use-project-filter";
import { ArrowUpRightIcon } from "./icons";
import { RevealText, RevealTitle } from "./motion-reveal";

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

function ProjectCard({ project, index, duplicate = false }: { project: Project; index: number; duplicate?: boolean }) {
  return (
    <li className={`project-card${duplicate ? " project-card--duplicate" : ""}`} aria-hidden={duplicate || undefined}>
      <article>
        <Link to={`/work/${project.slug}`} className="project-card__link" tabIndex={duplicate ? -1 : undefined}>
          <ProjectArtwork project={project} index={index} />
          <span className="project-card__overlay">
            <span className="project-card__number">Project {String(index + 1).padStart(2, "0")} · Placeholder</span>
            <strong>{project.title}</strong>
            <span>{project.summary}</span>
            <span className="project-card__action">View project <ArrowUpRightIcon /></span>
          </span>
        </Link>
        <ul className="tag-list" aria-label={duplicate ? undefined : `Tags for ${project.title}`}>
          {project.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      </article>
    </li>
  );
}

const PROJECT_SPEED_PX_PER_SECOND = 36;

interface ProjectMarqueeRowProps {
  animated: boolean;
  direction: "left" | "right";
  projects: Project[];
  allProjects: Project[];
}

function ProjectMarqueeRow({ animated, direction, projects, allProjects }: ProjectMarqueeRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const dragRef = useRef({ active: false, moved: false, startTime: 0, startX: 0 });
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!animated || !viewport || !track) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-width: 42.001rem)");

    let isVisible = false;

    const createAnimation = () => {
      const previousAnimation = animationRef.current;
      const previousProgress = previousAnimation?.effect?.getComputedTiming().progress ?? 0;
      previousAnimation?.cancel();
      animationRef.current = null;
      if (!motionQuery.matches) {
        track.style.transform = "";
        return;
      }

      const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      const loopDistance = (track.scrollWidth / 2) + (gap / 2);
      const duration = (loopDistance / PROJECT_SPEED_PX_PER_SECOND) * 1000;
      const keyframes = direction === "left"
        ? [{ transform: "translateX(0)" }, { transform: `translateX(-${loopDistance}px)` }]
        : [{ transform: `translateX(-${loopDistance}px)` }, { transform: "translateX(0)" }];

      const animation = track.animate(keyframes, {
        duration,
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      });
      animation.currentTime = previousProgress * duration;
      if (!isVisible || document.hidden) animation.pause();
      animationRef.current = animation;
    };

    createAnimation();

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = Boolean(entry?.isIntersecting);
      if (dragRef.current.active || document.hidden) return;
      if (isVisible) animationRef.current?.play();
      else animationRef.current?.pause();
    }, { rootMargin: "160px 0px" });
    visibilityObserver.observe(viewport);

    const resizeObserver = new ResizeObserver(createAnimation);
    resizeObserver.observe(viewport);
    motionQuery.addEventListener("change", createAnimation);

    const syncDocumentVisibility = () => {
      if (dragRef.current.active) return;
      if (document.hidden || !isVisible) animationRef.current?.pause();
      else animationRef.current?.play();
    };
    document.addEventListener("visibilitychange", syncDocumentVisibility);

    return () => {
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", createAnimation);
      document.removeEventListener("visibilitychange", syncDocumentVisibility);
      animationRef.current?.cancel();
      animationRef.current = null;
    };
  }, [animated, direction, projects.length]);

  const startDragging = (event: PointerEvent<HTMLDivElement>) => {
    const animation = animationRef.current;
    if (!animation || event.button !== 0) return;

    dragRef.current = {
      active: true,
      moved: false,
      startTime: 0,
      startX: event.clientX,
    };
  };

  const dragProjects = (event: PointerEvent<HTMLDivElement>) => {
    const animation = animationRef.current;
    if (!animation || !dragRef.current.active) return;

    const deltaX = event.clientX - dragRef.current.startX;
    if (Math.abs(deltaX) > 5 && !dragRef.current.moved) {
      dragRef.current.moved = true;
      dragRef.current.startTime = Number(animation.currentTime) || 0;
      dragRef.current.startX = event.clientX;
      animation.pause();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      return;
    }

    if (!dragRef.current.moved) return;

    const dragDeltaX = event.clientX - dragRef.current.startX;
    const duration = Number(animation.effect?.getTiming().duration) || 1;
    const directionMultiplier = direction === "left" ? -1 : 1;
    const timeDelta = directionMultiplier * (dragDeltaX / PROJECT_SPEED_PX_PER_SECOND) * 1000;
    animation.currentTime = ((dragRef.current.startTime + timeDelta) % duration + duration) % duration;
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    suppressClickRef.current = dragRef.current.moved;
    if (dragRef.current.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    animationRef.current?.play();
    setIsDragging(false);
  };

  const preventClickAfterDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return (
    <div
      className={`project-marquee__viewport${isDragging ? " is-dragging" : ""}`}
      ref={viewportRef}
      onClickCapture={preventClickAfterDrag}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={startDragging}
      onPointerMove={dragProjects}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <ul ref={trackRef} className={`project-marquee__track project-marquee__track--${direction}`}>
        {projects.map((project) => (
          <ProjectCard
            key={project.slug}
            project={project}
            index={allProjects.findIndex((item) => item.slug === project.slug)}
          />
        ))}
        {animated ? projects.map((project) => (
          <ProjectCard
            duplicate
            key={`${project.slug}-duplicate`}
            project={project}
            index={allProjects.findIndex((item) => item.slug === project.slug)}
          />
        )) : null}
      </ul>
    </div>
  );
}

export function ProjectGrid({ projects, heading = "Selected work", headingId = "selected-work-heading", intro }: ProjectGridProps) {
  const { selectedFilter, setSelectedFilter, filteredProjects } = useProjectFilter(projects);
  const filters: ProjectFilter[] = ["All", ...projectTags];
  const shouldAnimateProjects = filteredProjects.length > 6;
  const projectRows = shouldAnimateProjects
    ? [
        filteredProjects.slice(0, Math.ceil(filteredProjects.length / 2)),
        filteredProjects.slice(Math.ceil(filteredProjects.length / 2)),
      ]
    : [filteredProjects];

  return (
    <section className="projects-section" id="selected-work" aria-labelledby={headingId}>
      <div className="projects-section__header">
        <div>
          <RevealTitle id={headingId} lines={[heading]} />
          <RevealText delay={100}>{intro ?? "Nine image-led entries. Titles appear on hover and keyboard focus, and remain visible on touch layouts."}</RevealText>
        </div>
        <div className="project-filters" role="group" aria-label="Filter projects">
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
        <div className={`project-marquee${shouldAnimateProjects ? " project-marquee--animated" : ""}`} id="project-results">
          {projectRows.map((row, rowIndex) => (
            <ProjectMarqueeRow
              animated={shouldAnimateProjects}
              direction={rowIndex === 0 ? "left" : "right"}
              projects={row}
              allProjects={projects}
              key={`project-row-${rowIndex}`}
            />
          ))}
        </div>
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
