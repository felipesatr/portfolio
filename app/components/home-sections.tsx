import { Link } from "react-router";
import { experience, labExperiments, skillGroups, testimonials } from "~/content/portfolio";
import { ArrowUpRightIcon } from "./icons";

export function SkillsSection() {
  return (
    <section className="skills-section" aria-labelledby="skills-heading">
      <div className="skills-section__intro">
        <h2 id="skills-heading">Design judgment and front-end execution belong in the same conversation.</h2>
        <p>The detailed work process belongs on About. Here, the distinction between established strengths and developing skills stays explicit.</p>
      </div>
      <dl className="skills-list">
        {skillGroups.map((group) => (
          <div key={group.title} className={group.developing ? "skills-list__developing" : undefined}>
            <dt>{group.title}</dt>
            <dd>{group.skills.join(" · ")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LabPreview() {
  return (
    <section className="lab-preview" aria-labelledby="lab-preview-heading">
      <div className="lab-preview__header">
        <h2 id="lab-preview-heading">A place to test movement without making the whole portfolio an experiment.</h2>
        <p>Static posters load first. Future interactive studies will load only after clear user intent or on the dedicated Lab route.</p>
      </div>
      <ul className="lab-grid">
        {labExperiments.map((experiment, index) => (
          <li key={experiment.slug}>
            <article className="lab-card">
              <span>0{index + 1} / Future experiment</span>
              <div className={`lab-card__graphic lab-card__graphic--${index + 1}`} aria-hidden="true" />
              <div>
                <p>{experiment.category}</p>
                <h3>{experiment.title}</h3>
                <p>{experiment.summary}</p>
                <Link to={`/lab#${experiment.slug}`}>Open study placeholder <ArrowUpRightIcon /></Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <Link className="text-link text-link--light" to="/lab">View the Interaction Lab <ArrowUpRightIcon /></Link>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section className="experience-section" id="experience" aria-labelledby="experience-heading">
      <div className="section-heading-row">
        <h2 id="experience-heading">Experience that connects delivery, quality, and people.</h2>
        <Link className="outlined-link" to="/about#experience">Full About and experience <ArrowUpRightIcon /></Link>
      </div>
      <ol className="experience-list">
        {experience.map((item) => (
          <li key={item.id}>
            <span>{item.id}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReferencesSection() {
  return (
    <section className="references-section" aria-labelledby="references-heading">
      <div className="visually-hidden">
        <h2 id="references-heading">Colleague references</h2>
        <p>All references in this V0 are unpublished layout placeholders.</p>
      </div>
      <div className="reference-card reference-card--featured">
        <span>Unpublished reference placeholder</span>
        <blockquote>“{testimonials[0].quote}”</blockquote>
        <p>{testimonials[0].name} · {testimonials[0].role} · {testimonials[0].relationship}</p>
      </div>
      <div className="references-section__side">
        {testimonials.slice(1).map((testimonial) => (
          <div className="reference-card" key={testimonial.id}>
            <span>Unpublished reference placeholder</span>
            <blockquote>“{testimonial.quote}”</blockquote>
            <p>{testimonial.name} · {testimonial.role} · {testimonial.relationship}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MakingOfSection() {
  return (
    <section className="making-of" aria-labelledby="making-of-heading">
      <div>
        <p className="role-title">Extra / Behind this portfolio</p>
        <h2 id="making-of-heading">The decisions behind this portfolio are documented too.</h2>
        <p>Positioning, inspiration research, Figma exploration, content structure, accessible implementation, performance, and lessons learned.</p>
        <Link className="outlined-link" to="/work/behind-this-portfolio">See how it was made <ArrowUpRightIcon /></Link>
      </div>
      <div className="making-of__graphic" role="img" aria-label="Neutral layered frames representing the path from strategy through Figma to code">
        <span />
        <span />
        <strong>Strategy → Figma → Code</strong>
      </div>
    </section>
  );
}
