import type {
  AudienceContent,
  ExperienceItem,
  LabExperiment,
  Project,
  SkillGroup,
  Testimonial,
} from "./types";

export const projects: Project[] = [
  { slug: "project-01", title: "Project title placeholder 01", summary: "A future case study will explain the problem, constraints, contribution, and qualified outcome.", tags: ["Design", "Front-end"], image: "placeholder-01", alt: "Neutral geometric placeholder for project 01", featured: true, placeholder: true },
  { slug: "project-02", title: "Project title placeholder 02", summary: "A neutral record reserved for verified responsive and accessibility evidence.", tags: ["Front-end", "Accessibility"], image: "placeholder-02", alt: "Neutral geometric placeholder for project 02", featured: true, placeholder: true },
  { slug: "project-03", title: "Project title placeholder 03", summary: "A future case study slot for real production or migration work.", tags: ["Production"], image: "placeholder-03", alt: "Neutral geometric placeholder for project 03", featured: true, placeholder: true },
  { slug: "project-04", title: "Project title placeholder 04", summary: "A future case study slot for an interface and content-structure problem.", tags: ["Design"], image: "placeholder-04", alt: "Neutral geometric placeholder for project 04", placeholder: true },
  { slug: "project-05", title: "Project title placeholder 05", summary: "A future case study slot for semantic front-end implementation.", tags: ["Front-end", "Accessibility"], image: "placeholder-05", alt: "Neutral geometric placeholder for project 05", placeholder: true },
  { slug: "project-06", title: "Project title placeholder 06", summary: "A future case study slot for interaction behavior and motion decisions.", tags: ["Interaction", "Design"], image: "placeholder-06", alt: "Neutral geometric placeholder for project 06", placeholder: true },
  { slug: "project-07", title: "Project title placeholder 07", summary: "A future case study slot for production quality and repeatable delivery.", tags: ["Production", "Front-end"], image: "placeholder-07", alt: "Neutral geometric placeholder for project 07", placeholder: true },
  { slug: "project-08", title: "Project title placeholder 08", summary: "A future case study slot for accessibility and content discoverability.", tags: ["Accessibility", "Design"], image: "placeholder-08", alt: "Neutral geometric placeholder for project 08", placeholder: true },
  { slug: "project-09", title: "Project title placeholder 09", summary: "A future case study slot for connected design and front-end execution.", tags: ["Design", "Front-end", "Interaction"], image: "placeholder-09", alt: "Neutral geometric placeholder for project 09", placeholder: true },
];

export const audienceContent: AudienceContent[] = [
  { id: "anyone", label: "Anyone", statement: "I design and build responsive, accessible websites and interfaces shaped by real content, production requirements, and the people responsible for delivering them.", evidenceLabel: "View selected work", evidenceHref: "#selected-work" },
  { id: "recruiters", label: "Recruiters", statement: "Quickly see role fit, relevant responsibilities, practical implementation, and finished delivery without having to decode the site.", evidenceLabel: "Review experience", evidenceHref: "#experience" },
  { id: "design-directors", label: "Design directors", statement: "See how visual judgment, content hierarchy, interaction decisions, and implementation constraints are handled as one connected design problem.", evidenceLabel: "Review design approach", evidenceHref: "/about#approach" },
  { id: "engineers", label: "Engineers", statement: "See semantic structure, responsive CSS, accessibility decisions, typed content, and practical front-end implementation without unnecessary architecture.", evidenceLabel: "See implementation", evidenceHref: "/work/behind-this-portfolio" },
  { id: "project-leads", label: "Project leads", statement: "See how requirements, quality checks, production constraints, collaboration, and delivery responsibilities are kept visible throughout the work.", evidenceLabel: "Review delivery experience", evidenceHref: "#experience" },
];

export const skillGroups: SkillGroup[] = [
  { title: "Design", skills: ["Responsive layouts", "Hierarchy", "Typography", "Content structure", "Visual consistency"] },
  { title: "Front-end", skills: ["HTML", "CSS", "Semantic structure", "Responsive implementation"] },
  { title: "Accessibility + SEO", skills: ["Keyboard intent", "Readable structure", "Metadata", "Performance awareness"] },
  { title: "Production + migration", skills: ["Content workflows", "Quality review", "Repeatable delivery", "Large-scale migration workflows"] },
  { title: "Collaboration + leadership", skills: ["Coordination", "Timelines", "Process improvement", "Team support"] },
  { title: "Currently developing", skills: ["JavaScript", "React", "TypeScript", "Vite", "Git", "GitHub", "Figma", "Design systems"], developing: true },
];

export const experience: ExperienceItem[] = [
  { id: "01", title: "Web design + production", summary: "Responsive implementation, content structure, visual consistency, review, and finished delivery.", placeholder: true },
  { id: "02", title: "Large-scale migration", summary: "Repeatable workflows, production coordination, and quality standards across many pages or sites.", placeholder: true },
  { id: "03", title: "Leadership + process", summary: "Clear responsibilities, improved workflows, stronger timelines, and support for team productivity.", placeholder: true },
];

export const testimonials: Testimonial[] = [
  { id: "reference-01", quote: "Verified colleague reference will appear here after wording and publication permission are confirmed.", name: "Name placeholder", role: "Role placeholder", relationship: "Professional relationship placeholder", permissionStatus: "unpublished-placeholder" },
  { id: "reference-02", quote: "This space is reserved for a reference about quality, collaboration, or dependable delivery.", name: "Name placeholder", role: "Role placeholder", relationship: "Professional relationship placeholder", permissionStatus: "unpublished-placeholder" },
  { id: "reference-03", quote: "This space is reserved for a reference about leadership, process, or team support.", name: "Name placeholder", role: "Role placeholder", relationship: "Professional relationship placeholder", permissionStatus: "unpublished-placeholder" },
];

export const labExperiments: LabExperiment[] = [
  { slug: "motion-study", category: "Motion study", title: "Timing and hierarchy", summary: "A future study of restrained movement, loading behavior, and reduced-motion equivalents.", placeholder: true },
  { slug: "interface-behavior", category: "Interface behavior", title: "States with a purpose", summary: "A future study of hover, focus, selected, filtering, and popup behavior.", placeholder: true },
  { slug: "creative-coding", category: "Creative coding", title: "Optional interactive canvas", summary: "A future experiment loaded only on deliberate user request, outside the critical homepage bundle.", placeholder: true },
];
