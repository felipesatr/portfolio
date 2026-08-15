import type { Route } from "./+types/behind-portfolio";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Behind this portfolio", "The positioning, research, design, implementation, accessibility, and performance decisions behind this portfolio.", "/work/behind-this-portfolio");
}

const stages = [
  ["01", "Positioning", "Define the target roles, evidence priorities, and direct value proposition before choosing the visual direction."],
  ["02", "Inspiration research", "Analyze useful patterns by purpose, separate attractive details from employability value, and document what not to copy."],
  ["03", "Figma exploration", "Test multiple low-fidelity directions, compare information architecture, then progress one unified-rail system."],
  ["04", "Content structure", "Model projects, audiences, experience, skills, references, and experiments so verified content can replace placeholders safely."],
  ["05", "React implementation", "Use Framework Mode, typed local data, route splitting, custom CSS, and static prerendering without unnecessary dependencies."],
  ["06", "Accessibility", "Build semantic landmarks, visible focus, keyboard-equivalent states, reduced motion, and touch-safe project disclosure from the start."],
  ["07", "Performance", "Keep the critical path light, reserve media dimensions, avoid homepage experiment bundles, and generate static HTML for public routes."],
  ["08", "Lessons", "Document verified trade-offs and revisions after the V0 is tested with real content and hiring-focused review."],
];

export default function BehindPortfolio() {
  return (
    <article className="standard-page making-case-study">
      <header className="making-case-study__header">
        <p className="role-title">Extra / Active portfolio project</p>
        <h1>The portfolio itself is part of the evidence—but it stays secondary to professional work.</h1>
        <p>This case-study structure documents the real process used to plan and build the site. It does not invent results or treat V0 placeholders as finished evidence.</p>
      </header>
      <div className="making-case-study__path" aria-label="Strategy to Figma to React to review">
        <span>Strategy</span><i /><span>Figma</span><i /><span>React</span><i /><span>Review</span>
      </div>
      <ol className="making-case-study__stages">
        {stages.map(([number, title, summary]) => <li key={number}><span>{number}</span><div><h2>{title}</h2><p>{summary}</p></div></li>)}
      </ol>
    </article>
  );
}
