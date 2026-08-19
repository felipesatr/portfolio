export interface Service {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  deliverables: string[];
  tools: string[];
  boundary: string;
  icon: "interface" | "code" | "spark";
}

export const services: Service[] = [
  {
    id: "webapp-ui-design",
    title: "Webapp & UI Design",
    shortTitle: "Webapp & UI design",
    summary: "I turn real content and requirements into clear responsive interfaces, from page structure and visual direction to practical prototypes.",
    deliverables: ["Information architecture", "Responsive layouts", "UI direction", "Component patterns", "Figma prototypes"],
    tools: ["Figma", "HTML", "CSS", "Design systems"],
    boundary: "Best suited to content-rich websites, web interfaces, and design work that must remain practical when it reaches production.",
    icon: "interface",
  },
  {
    id: "accessible-front-end",
    title: "Accessible Front-End & Production",
    shortTitle: "Front-end & production",
    summary: "I build responsive HTML and CSS interfaces with semantic structure, accessibility, content quality, and repeatable delivery in mind.",
    deliverables: ["Responsive implementation", "Semantic HTML", "Accessible interaction states", "Production QA", "Migration workflow support"],
    tools: ["HTML", "CSS", "Git", "GitHub", "Vite", "React — developing", "TypeScript — developing"],
    boundary: "My strongest implementation work is currently HTML and CSS. React and TypeScript are developing skills and are labeled that way rather than presented as senior expertise.",
    icon: "code",
  },
  {
    id: "ai-assisted-workflows",
    title: "AI-Assisted Creative Workflows",
    shortTitle: "AI-assisted workflows",
    summary: "I use AI as a supervised production tool for research synthesis, content structure, rapid alternatives, documentation, and repetitive workflow support.",
    deliverables: ["Research synthesis", "Content outlines", "Prompt and workflow design", "Rapid design alternatives", "Documentation support"],
    tools: ["ChatGPT", "Generative image tools", "Structured prompting", "Human review"],
    boundary: "This is AI-assisted design and production support—not machine-learning engineering, custom-model development, or unsupervised decision-making. Final judgment and quality review remain human-led.",
    icon: "spark",
  },
];
