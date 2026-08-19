import { Link } from "react-router";
import { experience, labExperiments, testimonials } from "~/content/portfolio";
import { services, type Service } from "~/content/services";
import { ArrowUpRightIcon, CodeIcon, InterfaceIcon, SparkIcon } from "./icons";
import { RevealTitle } from "./motion-reveal";

function ServiceIcon({ service }: { service: Service }) {
  if (service.icon === "code") return <CodeIcon />;
  if (service.icon === "spark") return <SparkIcon />;
  return <InterfaceIcon />;
}

export function SkillsSection() {
  return (
    <section className="skills-section what-i-do" id="skills" aria-labelledby="skills-heading">
      <div className="skills-section__intro">
        <RevealTitle id="skills-heading" lines={["What I do"]} />
        <Link className="button button--secondary" to="/services">Learn about my process <ArrowUpRightIcon /></Link>
      </div>
      <div className="service-summary-grid">
        {services.map((service, index) => (
          <article key={service.id} className="service-summary-card">
            <div className="service-summary-card__top"><span>0{index + 1}</span><span className="service-summary-card__icon"><ServiceIcon service={service} /></span></div>
            <h3>{service.title}</h3>
            <p>{service.summary}</p>
            <div className="service-tags" aria-label={`Skills and tools for ${service.title}`}>
              {service.tools.map((tool) => <span key={tool}>{tool}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LabPreview() {
  return (
    <section className="lab-preview" id="lab" aria-labelledby="lab-preview-heading">
      <ul className="lab-grid">
        <li className="lab-grid__intro">
          <RevealTitle id="lab-preview-heading" lines={["I like to create", "interactive stuff"]} />
          <Link className="button button--secondary" to="/lab">Explore interaction lab <ArrowUpRightIcon /></Link>
        </li>
        {labExperiments.map((experiment, index) => (
          <li key={experiment.slug}>
            <article className="lab-card">
              <span>0{index + 1} / Experiment</span>
              <div className={`lab-card__graphic lab-card__graphic--${index + 1}`} aria-hidden="true" />
              <div>
                <p>{experiment.category}</p>
                <h3>{experiment.title}</h3>
                <Link to={`/lab#${experiment.slug}`}>Open study <ArrowUpRightIcon /></Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExperienceSection() {
  return (
    <section className="experience-section" id="experience" aria-labelledby="experience-heading">
      <div className="experience-section__intro">
        <RevealTitle id="experience-heading" lines={["Experience that holds up in production."]} />
        <a className="button button--secondary" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">View my CV <ArrowUpRightIcon /></a>
      </div>
      <ol className="experience-list">
        {experience.map((item) => (
          <li key={item.id}>
            <span className="experience-list__dot" aria-hidden="true" />
            <div><span>{item.id}</span><h3>{item.title}</h3><p>{item.summary}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReferencesSection() {
  return (
    <section className="references-section" id="references" aria-labelledby="references-heading">
      <div className="references-section__intro">
        <RevealTitle id="references-heading" lines={["Kind words"]} />
        <Link className="text-link" to="/about#references">See more kind words <ArrowUpRightIcon /></Link>
      </div>
      <div className="references-grid">
        {testimonials.slice(0, 3).map((testimonial, index) => (
          <article className="reference-card" key={testimonial.id} aria-label={`Reference ${index + 1} of 3`}>
            <span>Unpublished reference placeholder · {String(index + 1).padStart(2, "0")}</span>
            <blockquote>“{testimonial.quote}”</blockquote>
            <p>{testimonial.name} · {testimonial.role} · {testimonial.relationship}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
