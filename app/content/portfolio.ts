import type {
  AudienceContent,
  ExperienceItem,
  LabExperiment,
  Project,
  SkillGroup,
  Testimonial,
} from './types'

export const projects: Project[] = [
  {
    slug: 'project-01',
    title: 'Project title placeholder 01',
    summary:
      'A future case study will explain the problem, constraints, contribution, and qualified outcome.',
    tags: ['Design', 'Front-end'],
    image: 'placeholder-01',
    alt: 'Neutral geometric placeholder for project 01',
    featured: true,
    placeholder: true,
  },
  {
    slug: 'project-02',
    title: 'Project title placeholder 02',
    summary:
      'A neutral record reserved for verified responsive and accessibility evidence.',
    tags: ['Front-end', 'Accessibility'],
    image: 'placeholder-02',
    alt: 'Neutral geometric placeholder for project 02',
    featured: true,
    placeholder: true,
  },
  {
    slug: 'project-03',
    title: 'Project title placeholder 03',
    summary: 'A future case study slot for real production or migration work.',
    tags: ['Production'],
    image: 'placeholder-03',
    alt: 'Neutral geometric placeholder for project 03',
    featured: true,
    placeholder: true,
  },
  {
    slug: 'project-04',
    title: 'Project title placeholder 04',
    summary:
      'A future case study slot for an interface and content-structure problem.',
    tags: ['Design'],
    image: 'placeholder-04',
    alt: 'Neutral geometric placeholder for project 04',
    placeholder: true,
  },
  {
    slug: 'project-05',
    title: 'Project title placeholder 05',
    summary: 'A future case study slot for semantic front-end implementation.',
    tags: ['Front-end', 'Accessibility'],
    image: 'placeholder-05',
    alt: 'Neutral geometric placeholder for project 05',
    placeholder: true,
  },
  {
    slug: 'project-06',
    title: 'Project title placeholder 06',
    summary:
      'A future case study slot for interaction behavior and motion decisions.',
    tags: ['Interaction', 'Design'],
    image: 'placeholder-06',
    alt: 'Neutral geometric placeholder for project 06',
    placeholder: true,
  },
  {
    slug: 'project-07',
    title: 'Project title placeholder 07',
    summary:
      'A future case study slot for production quality and repeatable delivery.',
    tags: ['Production', 'Front-end'],
    image: 'placeholder-07',
    alt: 'Neutral geometric placeholder for project 07',
    placeholder: true,
  },
  {
    slug: 'project-08',
    title: 'Project title placeholder 08',
    summary:
      'A future case study slot for accessibility and content discoverability.',
    tags: ['Accessibility', 'Design'],
    image: 'placeholder-08',
    alt: 'Neutral geometric placeholder for project 08',
    placeholder: true,
  },
  {
    slug: 'project-09',
    title: 'Project title placeholder 09',
    summary:
      'A future case study slot for connected design and front-end execution.',
    tags: ['Design', 'Front-end', 'Interaction'],
    image: 'placeholder-09',
    alt: 'Neutral geometric placeholder for project 09',
    placeholder: true,
  },
]

export const portfolioProject: Project = {
  slug: 'behind-this-portfolio',
  title: 'Behind this portfolio',
  summary:
    'The strategy, design system, interaction decisions, accessible implementation, testing, and iteration behind this site.',
  tags: ['Design', 'Front-end', 'Interaction'],
  image: 'portfolio-process',
  alt: 'Neutral geometric placeholder representing the portfolio design and development process',
  featured: false,
  placeholder: false,
}

const workLayoutPlaceholders: Project[] = [
  {
    slug: 'project-10',
    title: 'Project title placeholder 10',
    summary:
      'A neutral work-index slot reserved for a future verified case study.',
    tags: ['Design'],
    image: 'placeholder-10',
    alt: 'Neutral geometric placeholder for project 10',
    placeholder: true,
  },
  {
    slug: 'project-11',
    title: 'Project title placeholder 11',
    summary:
      'A neutral work-index slot reserved for future verified front-end evidence.',
    tags: ['Front-end'],
    image: 'placeholder-11',
    alt: 'Neutral geometric placeholder for project 11',
    placeholder: true,
  },
  {
    slug: 'project-12',
    title: 'Project title placeholder 12',
    summary:
      'A neutral work-index slot reserved for a future verified production case study.',
    tags: ['Production', 'Accessibility'],
    image: 'placeholder-12',
    alt: 'Neutral geometric placeholder for project 12',
    placeholder: true,
  },
  {
    slug: 'project-13',
    title: 'Project title placeholder 13',
    summary:
      'A neutral work-index slot reserved for a future verified interaction case study.',
    tags: ['Interaction'],
    image: 'placeholder-13',
    alt: 'Neutral geometric placeholder for project 13',
    placeholder: true,
  },
]

export const workProjects: Project[] = [
  ...projects,
  ...workLayoutPlaceholders,
  portfolioProject,
]

export const audienceContent: AudienceContent[] = [
  {
    id: 'anyone',
    label: 'For anyone',
    headline:
      'I give ideas meaning,\nshaping brands and\ndigital experiences\nbuilt for results.',
    format: 'compact',
  },
  {
    id: 'recruiters',
    label: 'Recruiters',
    headline:
      '5+ years designing, building,\nreviewing, and delivering\ndigital work ready for the\nreal world at companies\nlarge and small.',
    format: 'compact',
  },
  {
    id: 'designers',
    label: 'Designers',
    headline:
      'I think in layout, behavior, feel\nand motion. There’s a reason\nbehind every choice, and\nbetter ones will emerge when\nwe think together.',
    format: 'compact',
  },
  {
    id: 'engineers',
    label: 'Engineers',
    headline:
      'const me = {\n  role: "designer",\n  fluentIn: ["HTML", "CSS", "JS", "other frontend stuff"],\n  goodAt: ["visual thinking", "dev conversations"]\n};\n\nmakeItReal(collaborate(me, engineering));',
    format: 'code',
  },
  {
    id: 'project-leads',
    label: 'Project leads',
    headline:
      "I keep teams aligned and decisions\nconnected across content, constraints,\nimplementation and delivery.\nI'll work closely with you to keep focus\non what matters most.",
    format: 'compact',
  },
  {
    id: 'ai-teams',
    label: 'AI teams',
    headline:
      'I use AI to improve the process, not\nreplace the thinking. Together we’ll\ndesign useful workflows, automate\nrepetitive work and turn ideas\ninto practical tools.',
    format: 'compact',
  },
]

export const skillGroups: SkillGroup[] = [
  {
    title: 'Design',
    skills: [
      'Responsive layouts',
      'Hierarchy',
      'Typography',
      'Content structure',
      'Visual consistency',
    ],
  },
  {
    title: 'Front-end',
    skills: ['HTML', 'CSS', 'Semantic structure', 'Responsive implementation'],
  },
  {
    title: 'Accessibility + SEO',
    skills: [
      'Keyboard intent',
      'Readable structure',
      'Metadata',
      'Performance awareness',
    ],
  },
  {
    title: 'Production + migration',
    skills: [
      'Content workflows',
      'Quality review',
      'Repeatable delivery',
      'Large-scale migration workflows',
    ],
  },
  {
    title: 'Collaboration + leadership',
    skills: [
      'Coordination',
      'Timelines',
      'Process improvement',
      'Team support',
    ],
  },
  {
    title: 'Currently developing',
    skills: [
      'JavaScript',
      'React',
      'TypeScript',
      'Vite',
      'Git',
      'GitHub',
      'Figma',
      'Design systems',
    ],
    developing: true,
  },
]

export const experience: ExperienceItem[] = [
  {
    id: '01',
    title: 'Web design + production',
    company: 'Company name placeholder',
    summary:
      'Responsive implementation, content structure, visual consistency, review, and finished delivery.',
    years: 'Years placeholder',
    placeholder: true,
  },
  {
    id: '02',
    title: 'Large-scale migration',
    company: 'Company name placeholder',
    summary:
      'Repeatable workflows, production coordination, and quality standards across many pages or sites.',
    years: 'Years placeholder',
    placeholder: true,
  },
  {
    id: '03',
    title: 'Leadership + process',
    company: 'Company name placeholder',
    summary:
      'Clear responsibilities, improved workflows, stronger timelines, and support for team productivity.',
    years: 'Years placeholder',
    placeholder: true,
  },
]

export const testimonials: Testimonial[] = [
  {
    id: 'reference-01',
    quote:
      'Verified colleague reference will appear here after wording and publication permission are confirmed.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-02',
    quote:
      'This space is reserved for a reference about quality, collaboration, or dependable delivery.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-03',
    quote:
      'This space is reserved for a reference about leadership, process, or team support.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-04',
    quote:
      'This space is reserved for verified feedback about responsive implementation and attention to detail.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-05',
    quote:
      'This space is reserved for verified feedback about ownership, follow-through, and finished delivery.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-06',
    quote:
      'This space is reserved for verified feedback about collaboration across design, content, and development.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-07',
    quote:
      'This space is reserved for verified feedback about production workflows and consistent quality.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-08',
    quote:
      'This space is reserved for verified feedback about communication, planning, and timeline awareness.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
  {
    id: 'reference-09',
    quote:
      'This space is reserved for verified feedback about mentoring, leadership, and team support.',
    name: 'Name placeholder',
    role: 'Role placeholder',
    relationship: 'Professional relationship placeholder',
    permissionStatus: 'unpublished-placeholder',
  },
]

export const labExperiments: LabExperiment[] = [
  {
    slug: 'motion-study',
    category: 'Motion study',
    title: 'Timing and hierarchy',
    summary:
      'A future study of restrained movement, loading behavior, and reduced-motion equivalents.',
    placeholder: true,
  },
  {
    slug: 'interface-behavior',
    category: 'Interface behavior',
    title: 'States with a purpose',
    summary:
      'A future study of hover, focus, selected, filtering, and popup behavior.',
    placeholder: true,
  },
  {
    slug: 'creative-coding',
    category: 'Creative coding',
    title: 'Optional interactive canvas',
    summary:
      'A future experiment loaded only on deliberate user request, outside the critical homepage bundle.',
    placeholder: true,
  },
]
