import { Fragment, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Route } from "./+types/about";
import { Link } from "react-router";
import { IconBook as Book, IconVolume as SoundHigh, IconHeartHandshake, IconCompass, IconUserScan, IconUsers, IconAccessible, IconWorldSearch, IconTarget, IconPalette, IconAdjustmentsHorizontal, IconTools, IconListCheck, IconRefresh, IconBrain } from "@tabler/icons-react";
import { AboutTimelineDrawing } from "~/components/about-timeline-drawing";
import { AnimatedValueIcon } from "~/components/animated-value-icon";
import { DistanceGlobe } from "~/components/distance-globe";
import { SpotifyPlayerProvider, SpotifyWidget } from "~/components/spotify-widget";
import { ContactCta } from "~/components/contact-cta";
import { ArrowRightIcon, ArrowUpRightIcon } from "~/components/icons";
import { RevealTitle } from "~/components/motion-reveal";
import { SpotlightCard, SpotlightGrid } from "~/components/spotlight-card";
import { aboutProcess, aboutValues } from "~/content/about";
import { experience } from "~/content/portfolio";
import { routeMeta } from "~/content/site";
import { publicAsset } from "~/lib/public-asset";
import { useAboutMotion } from "~/lib/use-about-motion";
import { useExperienceGridStart } from "~/lib/use-experience-grid-start";
import "~/styles/about.css";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("About Felipe Salazar", "Meet Felipe Salazar, a multidisciplinary Webapp Designer & Front-End Developer in Bogotá, Colombia, with a focus on UX, interfaces, and bringing designs into the browser.", "/about");
}

function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="button button--secondary" to={to}><span className="liquid-button__surface">{children}<ArrowRightIcon /></span></Link>;
}

const valueIcons = [IconHeartHandshake, IconCompass, IconUserScan, IconUsers, IconAccessible, IconBrain];
const processIcons = [IconWorldSearch, IconTarget, IconPalette, IconTools, IconListCheck, IconAdjustmentsHorizontal];

// Only explicit emphasis markers from our own copy; never render raw HTML.
function AboutCopy({ children }: { children: string }) {
  return children.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>);
}

function AboutInterestList({ items }: { items: string[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let active = true;
    const updateRowEnds = () => {
      if (!active) return;
      const entries = Array.from(list.children) as HTMLElement[];
      const tops = entries.map((entry) => entry.offsetTop);
      entries.forEach((entry, index) => entry.toggleAttribute('data-row-end', index === entries.length - 1 || tops[index + 1] > tops[index] + 1));
    };
    const observer = new ResizeObserver(updateRowEnds);
    observer.observe(list);
    void document.fonts.ready.then(updateRowEnds);
    updateRowEnds();
    return () => { active = false; observer.disconnect(); };
  }, [items]);
  return <ul ref={listRef} className="about-interest-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default function About() {
  const [experienceView, setExperienceView] = useState<1 | 2>(1);
  const [processView, setProcessView] = useState<3 | 4>(3);
  const centered = processView === 4;
  const timelineRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLElement>(null);
  useExperienceGridStart(experienceRef, processRef);
  const { storyVisible, onIntroSettled, onStorySettled } = useAboutMotion(timelineRef);

  return (
    <SpotifyPlayerProvider><SpotlightGrid className="standard-page about-page about-rebuild">
      <div className="lab-view-test about-view-test" data-no-reveal>
        <div className="lab-view-test__group" role="group" aria-label="Globe and experience layout">
          {([1, 2] as const).map((view) => <button key={view} className="rail-circle-control" type="button" aria-pressed={experienceView === view} aria-label={view === 1 ? "Globe left, experience right" : "Experience left, globe right"} title={view === 1 ? "Globe left, experience right" : "Experience left, globe right"} onClick={() => setExperienceView(view)}>{view}</button>)}
        </div>
        <div className="lab-view-test__group" role="group" aria-label="How I work layout">
          {([3, 4] as const).map((view) => <button key={view} className="rail-circle-control" type="button" aria-pressed={processView === view} aria-label={view === 3 ? "Left aligned process" : "Centered process"} title={view === 3 ? "Left aligned process" : "Centered process"} onClick={() => setProcessView(view)}>{view}</button>)}
        </div>
      </div>
      <header className="about-hero" aria-labelledby="about-heading" data-about-motion>
        <RevealTitle id="about-heading" lines={["Who I am"]} speed={1.5} onRevealComplete={onIntroSettled} />
        <div className="about-hero__details">
          <div className="about-hero__introduction">
            <div className="about-intro-paragraph"><h1 className="about-inline-heading">My name is <strong>Felipe Salazar</strong>{" "}<span className="about-audio-placeholder" role="img" aria-label="Name pronunciation: feh-LEE-peh sah-lah-SAHR. Audio coming soon." title="feh-LEE-peh sah-lah-SAHR · Audio coming soon"><SoundHigh width={20} height={20} strokeWidth={2.5} aria-hidden="true" /></span>, a <strong>multidisciplinary designer</strong> and <strong>front-end developer</strong> based in Bogotá, <strong>Colombia</strong>.</h1></div>
            <p>My main focus is <strong>UX</strong>, with a background that reaches <strong>beyond interfaces</strong> into <strong>strategy</strong>, <strong>graphics</strong> and <strong>identity design</strong>. I’m drawn to creating experiences that are both aesthetically pleasing and functional, bringing a broad mix of <strong>creative</strong> and <strong>technical</strong> skills to each project.</p>
            <p>Discovering different places, people, and perspectives keeps me <strong>curious</strong> about the world around me and the possibilities of design. I like finding inspiration beyond my own disciplines and making connections between different <strong>ways of thinking</strong>.</p>
            <p>Outside work, I’m drawn to <strong>creativity</strong>, <strong>technology</strong>, and <strong>new experiences</strong>. There’s usually something I’m <strong>learning</strong>, <strong>making</strong>, or getting a little competitive about, but I also enjoy slowing down and spending time with the <strong>people</strong> closest to me.</p>
          </div>
          <figure className="about-portrait">
            <div className="about-portrait__image"><img src={publicAsset("images/lab-cat.jpeg")} alt="My tabby cat sitting in sunlight beside a window" width={2268} height={4032} decoding="async" /></div>
          </figure>
        </div>
      </header>

      <div className="about-story-values" data-about-motion>
        <section className="about-history" aria-labelledby="about-story-heading">
          <RevealTitle id="about-story-heading" lines={["My story"]} speed={1.5} revealWhen={storyVisible} />
          <div className="about-timeline" aria-label="How I got here timeline" ref={timelineRef}>
            <AboutTimelineDrawing timelineRef={timelineRef} />
            <ol className="about-timeline__column about-timeline__column--left" aria-label="Timeline milestones 2 and 4">
              <li data-soft-reveal-index="1">
                <SpotlightCard className="career-spotlight-card about-card about-timeline__card" aria-labelledby="about-story-code">
                  <h3 id="about-story-code">Then I got into code</h3>
                  <p>At around <strong>15</strong>, I became interested in <strong>game development</strong> and <strong>3D</strong> so started learning to <strong>code</strong> and <strong>model</strong>. But I also enjoyed <strong>physics</strong> and <strong>maths</strong> a lot, so I didn’t have a clear answer when it came to choosing a degree coming out of school.</p>
                </SpotlightCard>
              </li>
              <li data-soft-reveal-index="3">
                <SpotlightCard className="career-spotlight-card about-card about-timeline__card" aria-labelledby="about-story-explore">
                  <h3 id="about-story-explore">Exploring design</h3>
                  <p>The programme let me explore through electives rather than specialise straight away, which was exactly what I wanted. I worked on <strong>fashion</strong>, <strong>wood</strong>, <strong>interiors</strong>, <strong>graphics</strong>, and <strong>branding</strong>, among other areas. For my graduation project, I even created a concept for <strong>automotive design</strong>.</p>
                  <p>I liked several of those fields, but near the end of my degree I became especially interested in <strong>UX</strong>, <strong>UI</strong>, and <strong>web design</strong>. They gave me a way to combine the <strong>range</strong> of design I’d explored with the programming I was getting back into through <strong>creative coding</strong> and <strong>computer graphics</strong>. I found a way to keep most of my interests in this work of <strong>understanding people</strong> and making a <strong>product</strong> better for them.</p>
                </SpotlightCard>
              </li>
            </ol>
            <ol className="about-timeline__column about-timeline__column--right" aria-label="Timeline milestones 1, 3, and 5">
              <li data-soft-reveal-index="0">
                <SpotlightCard className="career-spotlight-card about-card about-timeline__card" aria-labelledby="about-story-drawing">
                  <h3 id="about-story-drawing">Drawing came first</h3>
                  <p>One of my earliest memories regarding <strong>creativity</strong> is quickly becoming the person anyone would ask a <strong>drawing</strong> from when I turned <strong>6</strong> at a new school. Art wasn't my top interest at the time but this creative side showed up in <strong>projects</strong>, both alone or in a group I'd constantly suggest new stuff that would make us <strong>stand out</strong>.</p>
                </SpotlightCard>
              </li>
              <li data-soft-reveal-index="2">
                <SpotlightCard className="career-spotlight-card about-card about-timeline__card" aria-labelledby="about-story-university">
                  <h3 id="about-story-university">Finding my direction</h3>
                  <p>I started in <strong>systems engineering</strong> at <strong>Universidad de Los Andes</strong>, with <strong>design</strong> as a second programme. I studied both for a while, but I eventually moved fully into design since I <strong>enjoyed</strong> it more and <strong>connected</strong> better with this kind of work.</p>
                </SpotlightCard>
              </li>
              <li data-soft-reveal-index="4">
                <SpotlightCard className="career-spotlight-card about-card about-timeline__card" aria-labelledby="about-story-now">
                  <h3 id="about-story-now">What I’m doing now</h3>
                  <p>Since then, I’ve worked on <strong>logos</strong>, <strong>visual identity</strong>, <strong>brand strategy</strong>, <strong>marketing</strong>, <strong>automations</strong>, <strong>apps</strong> and <strong>websites</strong>. In my current role, I <strong>migrate</strong> and <strong>improve</strong> sites, combining design, code and proprietary tools.</p>
                  <p>There’s always something <strong>new to learn</strong>, and I enjoy finding <strong>different ways</strong> to bring my ideas into practice. My focus areas have become clearer over time, but I still like leaving room for the <strong>curiosity</strong> that brought me here.</p>
                </SpotlightCard>
              </li>
            </ol>
          </div>
        </section>

        <section className="about-section about-values-section" aria-labelledby="about-values-heading">
          <RevealTitle id="about-values-heading" lines={["What matters to me"]} speed={1.5} revealWhen={storyVisible} onRevealComplete={onStorySettled} />
          <div className="about-values-list">{aboutValues.map(([title, body], index) => {
            const Icon = valueIcons[index];
            return <div key={title} className="about-value-item"><AnimatedValueIcon icon={Icon} index={index} /><div className="about-value-copy"><h3>{title}</h3><p><AboutCopy>{body}</AboutCopy></p><span className="about-value-divider" aria-hidden="true" data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask><svg viewBox="0 0 100 2" preserveAspectRatio="none" fill="none"><path d="M0 1H100" stroke="currentColor" strokeWidth={2} /></svg></span></div></div>;
          })}</div>
        </section>
      </div>

      <div className={`about-experience-row${experienceView === 2 ? ' about-experience-row--reversed' : ''}`} ref={experienceRef}>
      <DistanceGlobe />
      <section className="about-section about-experience-section" id="experience" aria-labelledby="about-career-heading">
        <div className="about-experience__heading">
          <RevealTitle id="about-career-heading" lines={["My experience, at a glance"]} speed={1.5} />
        </div>
        <div className="about-section__content about-career">
          {[...experience.map((item) => ({ ...item, degree: false })), { id: "education", company: "Universidad de Los Andes", title: "Bachelor’s degree in Design", years: "2024", logo: "images/uniandes-logo-128.webp", logoVariant: "uniandes", degree: true }].map((item) => <article key={item.id} className={`about-career__entry${item.degree ? ' about-career__entry--degree' : ''}`}>
            <span className={`about-career__logo about-career__logo--${item.logoVariant}`} aria-hidden="true"><img src={publicAsset(item.logo)} data-fluid-cursor-negative-mask data-fluid-cursor-image-mask={item.logoVariant === 'une' ? 'alpha' : 'contrast'} alt="" width={128} height={128} loading="lazy" decoding="async" /></span>
            <SpotlightCard className="career-spotlight-card about-career__copy"><div className="about-career__top"><div className="about-career__company"><h3>{item.company}</h3><span aria-hidden="true">•</span><p className="about-career__dates" title={item.years}>{item.years.includes('Present') ? 'Present' : [...new Set(item.years.match(/\d{4}/g))].join('–')}</p></div><p className="about-career__role">{item.title}</p></div></SpotlightCard>
          </article>)}
        </div>
        <div className="about-experience__action">
          <a className="button button--secondary about-experience__button--standard" href={publicAsset("resume/felipe-salazar-cv.pdf")} target="_blank" rel="noreferrer"><span className="liquid-button__surface">View my CV<ArrowUpRightIcon /></span><span className="visually-hidden">PDF, opens in a new tab</span></a>
        </div>
      </section>
      </div>

      <section className={`about-process-section${centered ? ' about-process-section--centered' : ''}`} ref={processRef} aria-labelledby="about-process-heading">
        <div className="about-process-section__heading">
          <RevealTitle id="about-process-heading" lines={["How I work"]} speed={1.5} />
          <div className="about-process-section__action"><ActionLink to="/services">More about my process</ActionLink></div>
        </div>
        <ol className="about-process-steps">{aboutProcess.map(([title, body], index) => {
          const mirrored = centered && index === 5;
          const Icon = mirrored ? IconRefresh : processIcons[index];
          return <li key={title}><span className={`about-process-steps__icon${mirrored ? ' about-process-steps__icon--mirrored' : ''}`} data-fluid-cursor-negative-mask data-fluid-cursor-svg-mask><Icon size={144} stroke={1.5} aria-hidden="true" /></span><span className="about-process-steps__number" aria-hidden="true">-{index + 1}-</span><h3>{title}</h3><p>{body}</p></li>;
        })}</ol>
      </section>

      {[0, 1, 2].map((copy) => <section key={copy} className="about-section about-personal-section" aria-label={`Interests, music, and books${copy ? ` — copy ${copy + 1}` : ''}`}>
        <div className="about-personal-row">
        <div className="about-interest-stack">
          <SpotlightCard className="career-spotlight-card about-card about-interests" aria-labelledby={`about-expertise-heading-${copy}`}>
            <div><h2 id={`about-expertise-heading-${copy}`}>Disciplines of expertise</h2><AboutInterestList items={["UX", "UI", "WEB DESIGN", "FRONTEND DEVELOPMENT", "VISUAL IDENTITY", "BRANDING", "STRATEGY", "ART DIRECTION", "INTERACTIVE DESIGN", "GRAPHIC DESIGN", "AI", "WORKFLOW AUTOMATIONS"]} /></div>
          </SpotlightCard>
          <SpotlightCard className="career-spotlight-card about-card about-interests" aria-labelledby={`about-interests-heading-${copy}`}>
            <div><h2 id={`about-interests-heading-${copy}`}>Areas of interest</h2><AboutInterestList items={["FASHION", "TECHNOLOGY", "SPORTS", "MOTION DESIGN", "ART", "AUTOMOTIVE DESIGN", "3D/CGI", "VIDEOGAMES", "TATTOOING", "CREATIVE CODING", "GENERATIVE GRAPHICS"]} /></div>
          </SpotlightCard>
        </div>
        <SpotifyWidget layout={copy === 0 ? 'timeline-controls' : copy === 1 ? 'cover' : 'side-controls'} />
        <SpotlightCard className="career-spotlight-card about-card about-media about-media--book" aria-labelledby={`about-book-heading-${copy}`}>
          <p className="about-eyebrow">Away from the screen</p><h2 id={`about-book-heading-${copy}`}>On my bookshelf</h2><div className="about-media__content"><div className="about-media__art about-media__art--book" aria-hidden="true"><Book width={40} height={40} /></div><div><p className="about-media__title">My current read will go here</p><p className="about-draft-note">Title, author &amp; a personal note to come</p></div></div>
        </SpotlightCard>
        </div>
      </section>)}
      <ContactCta />
    </SpotlightGrid></SpotifyPlayerProvider>
  );
}
