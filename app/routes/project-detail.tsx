import { Link, useParams } from "react-router";
import type { Route } from "./+types/project-detail";
import { ArrowUpRightIcon } from "~/components/icons";
import { projects } from "~/content/portfolio";
import { routeMeta } from "~/content/site";

export function meta({ params }: Route.MetaArgs) {
  const project = projects.find((item) => item.slug === params.slug);
  return routeMeta(
    project?.title ?? "Project not found",
    project?.summary ?? "The requested placeholder project could not be found.",
    `/work/${params.slug ?? "project"}`,
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    return (
      <div className="standard-page narrow-page">
        <p className="role-title">Project not found</p>
        <h1>This project route does not exist.</h1>
        <p>Return to the work index to view the available placeholder routes.</p>
        <Link className="button button--primary" to="/work">View work</Link>
      </div>
    );
  }

  return (
    <article className="case-study standard-page">
      <header className="case-study__header">
        <div>
          <p className="role-title">Unpublished case-study placeholder</p>
          <h1>{project.title}</h1>
          <p>{project.summary}</p>
        </div>
        <dl>
          <div><dt>Status</dt><dd>Placeholder — not portfolio evidence</dd></div>
          <div><dt>Role</dt><dd>To be verified</dd></div>
          <div><dt>Period</dt><dd>To be verified</dd></div>
          <div><dt>Tags</dt><dd>{project.tags.join(", ")}</dd></div>
        </dl>
      </header>
      <div className="case-study__hero" role="img" aria-label={project.alt}>
        <span /><span /><strong>{project.image}</strong>
      </div>
      <div className="case-study__body">
        <section><p className="section-index">01</p><h2>Context and problem</h2><p>Describe the business need, user need, starting condition, and why the work mattered. Replace this text only with verified information.</p></section>
        <section><p className="section-index">02</p><h2>Role and contribution</h2><p>Separate individual responsibilities from team responsibilities. Name collaborators and constraints without overstating ownership.</p></section>
        <section><p className="section-index">03</p><h2>Constraints and decisions</h2><p>Explain the trade-offs, rejected directions, production limitations, and evidence behind the final design and implementation choices.</p></section>
        <section><p className="section-index">04</p><h2>Execution</h2><p>Show responsive behavior, semantic structure, accessibility, content handling, quality checks, and the path from design to finished interface.</p></section>
        <section><p className="section-index">05</p><h2>Outcome and reflection</h2><p>Use qualified outcomes when measurements are unavailable. Include what changed, what was learned, and what would be improved next.</p></section>
      </div>
      <Link className="outlined-link case-study__next" to="/work">Return to project index <ArrowUpRightIcon /></Link>
    </article>
  );
}
