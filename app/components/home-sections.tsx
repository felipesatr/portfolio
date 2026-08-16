import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router";
import { experience, labExperiments, skillGroups, testimonials } from "~/content/portfolio";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon } from "./icons";
import { RevealText, RevealTitle } from "./motion-reveal";

export function SkillsSection() {
  return (
    <section className="skills-section" id="skills" aria-labelledby="skills-heading">
      <div className="skills-section__intro">
        <RevealTitle id="skills-heading" lines={["Design judgment and front-end execution", "belong in the same conversation."]} />
        <RevealText delay={120}>The detailed work process belongs on About. Here, the distinction between established strengths and developing skills stays explicit.</RevealText>
      </div>
      <dl className="skills-list">
        {skillGroups.map((group, index) => (
          <div key={group.title} className={group.developing ? "skills-list__developing" : undefined}>
            <dt><span>0{index + 1}</span>{group.title}</dt>
            <dd>{group.skills.map((skill) => <span key={skill}>{skill}</span>)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LabPreview() {
  return (
    <section className="lab-preview" id="lab" aria-labelledby="lab-preview-heading">
      <div className="lab-preview__header">
        <RevealTitle id="lab-preview-heading" lines={["A place to test movement", "without making the whole portfolio an experiment."]} />
        <RevealText delay={120}>Static posters load first. Future interactive studies will load only after clear user intent or on the dedicated Lab route.</RevealText>
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
        <RevealTitle id="experience-heading" lines={["Experience that connects delivery,", "quality, and people."]} />
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
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ startX: 0, startScrollLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const scrollReferences = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const track = event.currentTarget;
    dragState.current = { startX: event.clientX, startScrollLeft: track.scrollLeft };
    track.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const dragReferences = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.currentTarget.scrollLeft = dragState.current.startScrollLeft - (event.clientX - dragState.current.startX);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <section className="references-section" id="references" aria-labelledby="references-heading">
      <div className="references-section__intro">
        <RevealTitle id="references-heading" lines={["Colleague references"]} />
        <RevealText delay={100}>Nine positions reserved for verified feedback with publication permission.</RevealText>
      </div>
      <div className="references-carousel">
        <button className="references-carousel__arrow" type="button" onClick={() => scrollReferences(-1)} aria-label="Show previous references">
          <ArrowLeftIcon size={22} />
        </button>
        <div
          className={`references-carousel__track${isDragging ? " is-dragging" : ""}`}
          ref={trackRef}
          role="region"
          aria-roledescription="carousel"
          aria-label="Colleague reference placeholders"
          tabIndex={0}
          onPointerDown={startDragging}
          onPointerMove={dragReferences}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          {testimonials.map((testimonial, index) => (
            <article className="reference-card" key={testimonial.id} aria-label={`Reference ${index + 1} of ${testimonials.length}`}>
              <span>Unpublished reference placeholder · {String(index + 1).padStart(2, "0")}</span>
              <blockquote>“{testimonial.quote}”</blockquote>
              <p>{testimonial.name} · {testimonial.role} · {testimonial.relationship}</p>
            </article>
          ))}
        </div>
        <button className="references-carousel__arrow" type="button" onClick={() => scrollReferences(1)} aria-label="Show next references">
          <ArrowRightIcon size={22} />
        </button>
      </div>
    </section>
  );
}

export function MakingOfSection() {
  return (
    <section className="making-of" id="making-of" aria-labelledby="making-of-heading">
      <div>
        <p className="role-title">Extra / Behind this portfolio</p>
        <RevealTitle id="making-of-heading" lines={["The decisions behind this portfolio", "are documented too."]} />
        <RevealText delay={120}>Positioning, inspiration research, Figma exploration, content structure, accessible implementation, performance, and lessons learned.</RevealText>
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
