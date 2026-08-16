export const projectTags = [
  "Design",
  "Front-end",
  "Production",
  "Accessibility",
  "Interaction",
] as const;

export type ProjectTag = (typeof projectTags)[number];

export interface Project {
  slug: string;
  title: string;
  summary: string;
  tags: ProjectTag[];
  image: string;
  alt: string;
  role?: string;
  contribution?: string;
  period?: string;
  featured?: boolean;
  placeholder: boolean;
}

export const audienceIds = [
  "anyone",
  "recruiters",
  "design-directors",
  "engineers",
  "project-leads",
] as const;

export type Audience = (typeof audienceIds)[number];

export interface AudienceContent {
  id: Audience;
  label: string;
  headline: string;
}

export interface SkillGroup {
  title: string;
  skills: string[];
  developing?: boolean;
}

export interface ExperienceItem {
  id: string;
  title: string;
  summary: string;
  placeholder: boolean;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  relationship: string;
  permissionStatus: "unpublished-placeholder" | "approved";
}

export interface LabExperiment {
  slug: string;
  category: "Motion study" | "Interface behavior" | "Creative coding";
  title: string;
  summary: string;
  placeholder: boolean;
}
