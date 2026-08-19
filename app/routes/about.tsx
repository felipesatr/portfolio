import type { Route } from "./+types/about";
import { PageHeader } from "~/components/page-header";
import { experience, testimonials } from "~/content/portfolio";
import { routeMeta, siteContent } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("About", "Professional background, leadership, work process, and design philosophy structure.", "/about");
}

const processSteps = [
  ["01", "Understand the need", "Clarify the audience, business requirement, content, constraints, responsibilities, and definition of done."],
  ["02", "Structure before styling", "Build the information hierarchy, responsive content order, and semantic foundation before visual detail."],
  ["03", "Design within reality", "Make interface decisions that account for production workflows, accessibility, content variation, and team delivery."],
  ["04", "Build and verify", "Implement the interface, review it across viewports and input methods, fix issues, and finish the handoff."],
];

export default function About() {
  return (
    <div className="standard-page about-page">
      <PageHeader
        eyebrow="About / Content structure"
        title="A designer who stays responsible for how the work reaches the browser."
        intro="This V0 page establishes the structure for a direct professional story. Dates, employers, detailed responsibilities, and outcomes remain intentionally unfilled until verified."
      />

      <section className="about-intro" id="approach" aria-labelledby="approach-heading">
        <div><p className="section-index">Approach</p><h2 id="approach-heading">The interface is only convincing when the structure and execution hold up.</h2></div>
        <div><p>My background connects web design, responsive front-end implementation, accessibility-conscious structure, website production, migration workflows, quality review, and team coordination.</p><p>The final version of this page should show how those responsibilities developed over time without turning the page into a rewritten résumé.</p></div>
      </section>

      <section className="about-experience" id="experience" aria-labelledby="about-experience-heading">
        <div className="section-heading-row"><h2 id="about-experience-heading">Experience framework</h2><span>Dates and employers to be verified</span></div>
        <ol className="experience-list experience-list--timeline">
          {experience.map((item) => <li key={item.id}><span>{item.id}</span><h3>{item.title}</h3><p>{item.summary}</p><small>Timeline details placeholder</small></li>)}
        </ol>
      </section>

      <section className="process-section" aria-labelledby="process-heading">
        <div className="process-section__intro"><p className="section-index">Work process</p><h2 id="process-heading">A practical path from requirement to finished page.</h2><p>This belongs here—not on the homepage—because it needs enough space to explain responsibility and collaboration.</p></div>
        <ol>{processSteps.map(([id, title, summary]) => <li key={id}><span>{id}</span><h3>{title}</h3><p>{summary}</p></li>)}</ol>
      </section>

      <section className="about-details" aria-label="Design philosophy, location, and interests placeholders">
        <article><p className="section-index">Design philosophy</p><h2>Make the important thing easy to understand, then make the system resilient.</h2><p>Final wording will be refined around verified working principles and examples.</p></article>
        <article><p className="section-index">Location</p><h2>{siteContent.location}</h2><p>Replace with confirmed location, time zone, and working availability.</p></article>
        <article><p className="section-index">Interests</p><h2>Personal interests placeholder</h2><p>Reserved for photography, books, music, or other interests that add useful personality without competing with the professional work.</p></article>
      </section>

      <section className="about-references" id="references" aria-labelledby="about-references-heading">
        <h2 id="about-references-heading">More kind words</h2>
        <div className="references-grid references-grid--more">
          {testimonials.slice(3).map((testimonial, index) => (
            <article className="reference-card" key={testimonial.id}>
              <span>Unpublished reference placeholder · {String(index + 4).padStart(2, "0")}</span>
              <blockquote>“{testimonial.quote}”</blockquote>
              <p>{testimonial.name} · {testimonial.role} · {testimonial.relationship}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
