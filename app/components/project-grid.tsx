import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type TransitionEvent as ReactTransitionEvent } from "react";
import { Link } from "react-router";
import { createPortal } from "react-dom";
import { projectTags, type Project } from "~/content/types";
import { useProjectFilter, type ProjectFilter } from "~/hooks/use-project-filter";
import { publicAsset } from "~/lib/public-asset";
import { ArrowUpRightIcon, FilterIcon } from "./icons";
import { RevealText, RevealTitle } from "./motion-reveal";

interface ProjectGridProps {
  projects: Project[];
  heading?: string;
  headingId?: string;
  intro?: string;
  variant?: "index" | "home-marquee";
}

interface ProjectPreviewState {
  index: number;
  origin: DOMRect;
  project: Project;
}

function ProjectArtwork({ project, index }: { project: Project; index: number }) {
  return (
    <div className={`project-art project-art--${(index % 5) + 1}`} role="img" aria-label={project.alt}>
      {project.placeholder ? (
        <img className="project-art__image" src={publicAsset("images/project-placeholder.png")} alt="" />
      ) : (
        <>
          <span className="project-art__shape project-art__shape--one" />
          <span className="project-art__shape project-art__shape--two" />
          <span className="project-art__label">Project image {String(index + 1).padStart(2, "0")}</span>
        </>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  index: number;
  duplicate?: boolean;
  variableSize?: boolean;
  tetris?: boolean;
  gallerySize?: "xl" | "large" | "medium" | "small";
  onPreview?: (project: Project, index: number, trigger: HTMLButtonElement) => void;
}

function ProjectCard({ project, index, duplicate = false, variableSize = false, tetris = false, gallerySize, onPreview }: ProjectCardProps) {
  const sizeClass = variableSize ? ` project-card--variable project-card--shape-${(index % 5) + 1}` : "";
  const tetrisClass = tetris ? ` project-card--tetris project-card--tetris-${(index % 9) + 1}` : "";
  const galleryClass = gallerySize ? ` project-card--gallery project-card--gallery-${gallerySize}` : "";
  const overlay = (
    <span className="project-card__overlay">
      <span className="project-card__number">Project {String(index + 1).padStart(2, "0")} · Placeholder</span>
      <strong>{project.title}</strong>
      <span>{project.summary}</span>
      <span className="project-card__action">View project <ArrowUpRightIcon /></span>
    </span>
  );

  return (
    <li className={`project-card${duplicate ? " project-card--duplicate" : ""}${sizeClass}${tetrisClass}${galleryClass}`} aria-hidden={duplicate || undefined}>
      <article>
        {onPreview ? (
          <button
            type="button"
            className="project-card__link project-card__preview-trigger"
            tabIndex={duplicate ? -1 : undefined}
            aria-label={`Preview ${project.title}`}
            onClick={(event) => onPreview(project, index, event.currentTarget)}
          >
            <ProjectArtwork project={project} index={index} />
            {overlay}
          </button>
        ) : (
          <Link to={`/work/${project.slug}`} className="project-card__link">
            <ProjectArtwork project={project} index={index} />
            {overlay}
          </Link>
        )}
        {tetris || gallerySize ? (
          <div className="project-card__meta">
            <strong>{project.title}</strong>
            <ul className="tag-list" aria-label={`Tags for ${project.title}`}>
              {project.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          </div>
        ) : (
          <ul className="tag-list" aria-label={duplicate ? undefined : `Tags for ${project.title}`}>
            {project.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}
      </article>
    </li>
  );
}

const PROJECT_SPEED_PX_PER_SECOND = 46;
const HOVER_SCRUB_STRENGTH = 0.42;

interface ProjectMarqueeRowProps {
  animated: boolean;
  direction: "left" | "right";
  projects: Project[];
  allProjects: Project[];
  interactiveHover?: boolean;
  variableCards?: boolean;
  paused?: boolean;
  onPreview?: (project: Project, index: number, trigger: HTMLButtonElement) => void;
}

function ProjectMarqueeRow({ animated, direction, projects, allProjects, interactiveHover = false, variableCards = false, paused = false, onPreview }: ProjectMarqueeRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const hoverRef = useRef({ active: false, lastX: 0 });
  const visibleRef = useRef(false);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused || hoverRef.current.active || document.hidden || !visibleRef.current) animationRef.current?.pause();
    else animationRef.current?.play();
  }, [paused]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!animated || !viewport || !track) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-width: 42.001rem)");

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
        ? [{ transform: "translate3d(0, 0, 0)" }, { transform: `translate3d(-${loopDistance}px, 0, 0)` }]
        : [{ transform: `translate3d(-${loopDistance}px, 0, 0)` }, { transform: "translate3d(0, 0, 0)" }];

      const animation = track.animate(keyframes, {
        duration,
        easing: "linear",
        iterations: Number.POSITIVE_INFINITY,
      });
      animation.currentTime = previousProgress * duration;
      if (!visibleRef.current || document.hidden || pausedRef.current || hoverRef.current.active) animation.pause();
      animationRef.current = animation;
    };

    createAnimation();

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visibleRef.current = Boolean(entry?.isIntersecting);
      if (document.hidden || pausedRef.current || hoverRef.current.active) return;
      if (visibleRef.current) animationRef.current?.play();
      else animationRef.current?.pause();
    }, { rootMargin: "160px 0px" });
    visibilityObserver.observe(viewport);

    const resizeObserver = new ResizeObserver(createAnimation);
    resizeObserver.observe(viewport);
    motionQuery.addEventListener("change", createAnimation);

    const syncDocumentVisibility = () => {
      if (document.hidden || !visibleRef.current || pausedRef.current || hoverRef.current.active) animationRef.current?.pause();
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
  }, [animated, direction, interactiveHover, projects.length]);

  const startHover = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!interactiveHover) return;
    hoverRef.current = { active: true, lastX: event.clientX };
    animationRef.current?.pause();
  };

  const scrubHover = (event: ReactMouseEvent<HTMLDivElement>) => {
    const animation = animationRef.current;
    if (!interactiveHover || !hoverRef.current.active || !animation || pausedRef.current) return;

    const deltaX = event.clientX - hoverRef.current.lastX;
    hoverRef.current.lastX = event.clientX;
    const duration = Number(animation.effect?.getTiming().duration) || 1;
    const directionMultiplier = direction === "left" ? 1 : -1;
    const timeDelta = directionMultiplier * deltaX * HOVER_SCRUB_STRENGTH * (1000 / PROJECT_SPEED_PX_PER_SECOND);
    animation.currentTime = ((Number(animation.currentTime) + timeDelta) % duration + duration) % duration;
  };

  const endHover = () => {
    if (!interactiveHover) return;
    hoverRef.current.active = false;
    if (!pausedRef.current && visibleRef.current && !document.hidden) animationRef.current?.play();
  };

  return (
    <div
      className="project-marquee__viewport"
      ref={viewportRef}
      onDragStart={(event) => event.preventDefault()}
      onMouseEnter={startHover}
      onMouseLeave={endHover}
      onMouseMove={scrubHover}
    >
      <ul ref={trackRef} className={`project-marquee__track project-marquee__track--${direction}`}>
        {projects.map((project) => {
          const index = allProjects.findIndex((item) => item.slug === project.slug);
          return <ProjectCard key={project.slug} project={project} index={index} variableSize={variableCards} onPreview={onPreview} />;
        })}
        {animated ? projects.map((project) => {
          const index = allProjects.findIndex((item) => item.slug === project.slug);
          return <ProjectCard duplicate key={`${project.slug}-duplicate`} project={project} index={index} variableSize={variableCards} onPreview={onPreview} />;
        }) : null}
      </ul>
    </div>
  );
}

interface WorkFiltersProps {
  filters: ProjectFilter[];
  selectedFilters: ProjectFilter[];
  toggleFilter: (filter: ProjectFilter) => void;
}

function FilterOptions({ filters, selectedFilters, toggleFilter, className, id }: WorkFiltersProps & {
  className: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={className}
      role="group"
      aria-label="Filter projects; projects matching any selected category are shown"
    >
      {filters.map((filter) => {
        const selected = filter === "All" ? selectedFilters.length === 0 : selectedFilters.includes(filter);
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={selected}
            aria-controls="project-results"
            onClick={() => toggleFilter(filter)}
          >
            <span aria-hidden="true" />
            {filter}
          </button>
        );
      })}
    </div>
  );
}

function WorkFilters({ filters, selectedFilters, toggleFilter }: WorkFiltersProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const floatingRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const updateMode = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const gridRow = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--grid-row")) || 96;
        const nextCompact = window.scrollY > gridRow * 1.25;
        setIsCompact(nextCompact);
        if (!nextCompact) setIsOpen(false);
      });
    };

    updateMode();
    window.addEventListener("scroll", updateMode, { passive: true });
    window.addEventListener("resize", updateMode);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!floatingRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      toggleRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const floatingFilters = isCompact ? (
    <div ref={floatingRef} className={`work-filter-float${isOpen ? " work-filter-float--open" : ""}`}>
      <button
        ref={toggleRef}
        className="work-filter-float__toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="work-filter-popover"
        aria-label={`${isOpen ? "Close" : "Open"} project filters. ${selectedFilters.length || "No"} filters selected`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <FilterIcon size={20} />
      </button>
      {isOpen ? (
        <FilterOptions
          id="work-filter-popover"
          className="work-filter-float__panel"
          filters={filters}
          selectedFilters={selectedFilters}
          toggleFilter={toggleFilter}
        />
      ) : null}
    </div>
  ) : null;

  return (
    <>
      {!isCompact ? (
        <FilterOptions
          className="project-filters project-filters--work"
          filters={filters}
          selectedFilters={selectedFilters}
          toggleFilter={toggleFilter}
        />
      ) : null}
      {floatingFilters && typeof document !== "undefined" ? createPortal(floatingFilters, document.body) : null}
    </>
  );
}

function WorkGallery({ projects, allProjects }: { projects: Project[]; allProjects: Project[] }) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Array<HTMLUListElement | null>>([]);
  const columnCounts = [2, 3, 4, 5];
  let cursor = 0;
  const columns = columnCounts.map((count, columnIndex) => {
    const column = projects.slice(cursor, cursor + count);
    cursor += count;
    if (columnIndex === columnCounts.length - 1 && cursor < projects.length) column.push(...projects.slice(cursor));
    return column;
  });
  const columnSizes = ["xl", "large", "medium", "small"] as const;

  useEffect(() => {
    const gallery = galleryRef.current;
    const galleryColumns = columnRefs.current;
    if (!gallery || galleryColumns.length === 0) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-width: 80.001rem)");
    let frame = 0;

    const updateParallax = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!motionQuery.matches) {
          galleryColumns.forEach((column) => {
            if (column) column.style.transform = "";
          });
          return;
        }

        const activeDistance = Math.max(
          0,
          Math.min(gallery.offsetHeight + window.innerHeight, window.scrollY),
        );
        const speeds = [0, 0.075, 0.145, 0.215];
        galleryColumns.forEach((column, index) => {
          if (!column) return;
          const maxOffset = Math.max(window.innerHeight * 0.12, column.scrollHeight * 0.18);
          const offset = Math.min(maxOffset, activeDistance * speeds[index]);
          column.style.transform = index === 0 ? "" : `translate3d(0, ${-offset}px, 0)`;
        });
      });
    };

    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", updateParallax);
    motionQuery.addEventListener("change", updateParallax);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("resize", updateParallax);
      motionQuery.removeEventListener("change", updateParallax);
    };
  }, [projects]);

  return (
    <div className="work-gallery" id="project-results" ref={galleryRef}>
      {columns.map((column, columnIndex) => (
        <ul
          key={columnSizes[columnIndex]}
          ref={(element) => { columnRefs.current[columnIndex] = element; }}
          className={`work-gallery__column work-gallery__column--${columnSizes[columnIndex]}`}
          aria-label={`Project gallery column ${columnIndex + 1} of 4`}
        >
          {column.map((project) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={allProjects.findIndex((item) => item.slug === project.slug)}
              gallerySize={columnSizes[columnIndex]}
            />
          ))}
        </ul>
      ))}
    </div>
  );
}

function ProjectPreview({ preview, expanded, closing, onClose, onTransformEnd }: { preview: ProjectPreviewState; expanded: boolean; closing: boolean; onClose: () => void; onTransformEnd: (event: ReactTransitionEvent<HTMLDivElement>) => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const finalLeft = typeof window === "undefined" || window.innerWidth <= 1280 ? 0 : window.innerWidth / 12;
  const finalWidth = typeof window === "undefined" ? 1 : window.innerWidth - finalLeft;
  const finalHeight = typeof window === "undefined" ? 1 : window.innerHeight;
  const style = {
    "--preview-x": `${preview.origin.left - finalLeft}px`,
    "--preview-y": `${preview.origin.top}px`,
    "--preview-scale-x": String(preview.origin.width / finalWidth),
    "--preview-scale-y": String(preview.origin.height / finalHeight),
  } as React.CSSProperties;

  useEffect(() => {
    if (!expanded) return;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const dialog = closeRef.current?.closest<HTMLElement>("[role='dialog']");
      const focusable = Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, onClose]);

  return (
    <div
      className={`project-preview${expanded ? " project-preview--expanded" : ""}${closing ? " project-preview--closing" : ""}`}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-preview-title"
      onTransitionEnd={onTransformEnd}
    >
      <div className="project-preview__transition-surface" aria-hidden="true"><ProjectArtwork project={preview.project} index={preview.index} /></div>
      <div className="project-preview__scroller">
        <header className="project-preview__header">
          <div className="project-preview__art"><ProjectArtwork project={preview.project} index={preview.index} /></div>
          <div className="project-preview__content">
            <p>Project {String(preview.index + 1).padStart(2, "0")} · Preview</p>
            <h2 id="project-preview-title">{preview.project.title}</h2>
            <p>{preview.project.summary}</p>
            <ul className="tag-list" aria-label={`Tags for ${preview.project.title}`}>
              {preview.project.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
            <Link className="button button--primary" to={`/work/${preview.project.slug}`}><span className="liquid-button__surface">Open full case study <ArrowUpRightIcon /></span></Link>
          </div>
        </header>

        <div className="project-preview__story">
          <section><span>01</span><h3>Context and constraints</h3><p>Replace this placeholder with the verified business need, audience, content requirements, technical limits, timeline, and the responsibilities that shaped the work.</p></section>
          <div className="project-preview__media"><ProjectArtwork project={preview.project} index={preview.index + 1} /></div>
          <section><span>02</span><h3>My contribution</h3><p>Describe the parts you personally owned: information structure, visual decisions, responsive behavior, accessible implementation, production coordination, or team leadership.</p></section>
          <div className="project-preview__media project-preview__media--wide"><ProjectArtwork project={preview.project} index={preview.index + 2} /></div>
          <section><span>03</span><h3>Process and decisions</h3><p>Use short explanations between visuals to connect each artifact to a decision. Show alternatives, trade-offs, testing, revisions, and how the interface changed—not just the finished screens.</p></section>
          <div className="project-preview__media"><ProjectArtwork project={preview.project} index={preview.index + 3} /></div>
          <section><span>04</span><h3>Outcome and evidence</h3><p>Add only outcomes that can be verified. If a metric is unavailable, explain what shipped, what improved operationally, what feedback was received, and what you learned.</p></section>
        </div>
      </div>
      <button ref={closeRef} type="button" className="project-preview__close" onClick={onClose} aria-label="Close project preview">
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export function ProjectGrid({ projects, heading = "Selected work", headingId = "selected-work-heading", intro, variant = "index" }: ProjectGridProps) {
  const { selectedFilters, toggleFilter, clearFilters, filteredProjects } = useProjectFilter(projects);
  const isHomeMarquee = variant === "home-marquee";
  const visibleProjects = isHomeMarquee ? projects : filteredProjects;
  const filters: ProjectFilter[] = ["All", ...projectTags];
  const [preview, setPreview] = useState<ProjectPreviewState | null>(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewClosing, setPreviewClosing] = useState(false);
  const [marqueeLocked, setMarqueeLocked] = useState(false);
  const [isAllProjectsActionRevealed, setIsAllProjectsActionRevealed] = useState(false);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeStageTimerRef = useRef<number | null>(null);
  const closeFallbackTimerRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);

  const openPreview = (project: Project, index: number, trigger: HTMLButtonElement) => {
    if (closeStageTimerRef.current) window.clearTimeout(closeStageTimerRef.current);
    if (closeFallbackTimerRef.current) window.clearTimeout(closeFallbackTimerRef.current);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    previewTriggerRef.current = trigger;
    setMarqueeLocked(true);
    setPreviewClosing(false);
    setPreview({ project, index, origin: trigger.getBoundingClientRect() });
    setPreviewExpanded(false);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setPreviewExpanded(true)));
  };

  const finishPreviewClose = () => {
    if (closeFallbackTimerRef.current) window.clearTimeout(closeFallbackTimerRef.current);
    closeFallbackTimerRef.current = null;
    setPreview(null);
    setPreviewClosing(false);
    previewTriggerRef.current?.focus({ preventScroll: true });
    resumeTimerRef.current = window.setTimeout(() => {
      setMarqueeLocked(false);
      resumeTimerRef.current = null;
    }, 140);
  };

  const closePreview = () => {
    if (previewClosing) return;
    setPreviewClosing(true);
    closeStageTimerRef.current = window.setTimeout(() => {
      const scroller = document.querySelector<HTMLElement>(".project-preview__scroller");
      if (scroller) scroller.scrollTop = 0;
      setPreviewExpanded(false);
      closeStageTimerRef.current = null;
    }, 150);
    closeFallbackTimerRef.current = window.setTimeout(finishPreviewClose, 900);
  };

  const handlePreviewTransformEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform" || !previewClosing || previewExpanded) return;
    finishPreviewClose();
  };

  useEffect(() => {
    if (!preview) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [preview]);

  useEffect(() => () => {
    if (closeStageTimerRef.current) window.clearTimeout(closeStageTimerRef.current);
    if (closeFallbackTimerRef.current) window.clearTimeout(closeFallbackTimerRef.current);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
  }, []);

  return (
    <section
      className={`projects-section${isHomeMarquee ? " projects-section--home-marquee" : ""}`}
      id="selected-work"
      aria-label={isHomeMarquee ? heading : undefined}
      aria-labelledby={isHomeMarquee ? undefined : headingId}
    >
      {!isHomeMarquee ? (
        <div className="projects-section__header">
          <div>
            <RevealTitle as="h1" id={headingId} lines={[heading]} />
            <RevealText delay={100}>{intro ?? "Nine image-led entries. Titles appear on hover and keyboard focus, and remain visible on touch layouts."}</RevealText>
          </div>
          <WorkFilters filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
        </div>
      ) : null}

      {!isHomeMarquee ? (
        <p className="project-results-count" role="status" aria-live="polite">
          {visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"} shown
        </p>
      ) : null}

      {visibleProjects.length > 0 ? isHomeMarquee ? (
        <>
          <div className="project-marquee project-marquee--animated project-marquee--variable" id="project-results">
            <ProjectMarqueeRow
              animated
              direction="left"
              projects={visibleProjects}
              allProjects={projects}
              interactiveHover
              variableCards
              paused={marqueeLocked}
              onPreview={openPreview}
            />
          </div>
          <div className="projects-section__all">
            <RevealTitle as="h3" lines={["This is only a selection"]} onRevealComplete={() => setIsAllProjectsActionRevealed(true)} />
            <Link
              className={`button button--primary projects-section__all-button reveal-following-action${isAllProjectsActionRevealed ? " is-revealed" : ""}`}
              to="/work"
              tabIndex={isAllProjectsActionRevealed ? undefined : -1}
              aria-hidden={!isAllProjectsActionRevealed}
            ><span className="liquid-button__surface">View all projects <ArrowUpRightIcon /></span></Link>
          </div>
        </>
      ) : (
        <WorkGallery projects={visibleProjects} allProjects={projects} />
      ) : (
        <div className="empty-state" id="project-results">
          <h3>No matching projects</h3>
          <p>Try another filter or return to All.</p>
          <button type="button" className="button button--secondary" onClick={clearFilters}><span className="liquid-button__surface">Show all projects</span></button>
        </div>
      )}

      {preview && typeof document !== "undefined"
        ? createPortal(<ProjectPreview preview={preview} expanded={previewExpanded} closing={previewClosing} onClose={closePreview} onTransformEnd={handlePreviewTransformEnd} />, document.body)
        : null}
    </section>
  );
}
