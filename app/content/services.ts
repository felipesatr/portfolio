export interface Service {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  deliverables: string[];
  tools: string[];
  boundary: string;
  icon: "interface" | "strategy" | "code" | "spark";
}

export const services: Service[] = [
  {
    id: "webapp-ui-design",
    title: "UX/UI & WebApp Design",
    shortTitle: "UX/UI & WebApp design",
    summary: "I shape content, requirements, and user needs into clear responsive websites and interfaces that can move into production.",
    deliverables: ["Information architecture", "Responsive layouts", "UI direction", "Interaction states", "Figma prototypes"],
    tools: ["Figma", "HTML", "CSS", "Design systems"],
    boundary: "Best suited to content-rich websites, web interfaces, and design work that must remain practical when it reaches production.",
    icon: "interface",
  },
  {
    id: "strategy-brand-consulting",
    title: "Strategy, Brand & Consulting",
    shortTitle: "Strategy, brand & consulting",
    summary: "I help clarify the idea, audience, message, and visual direction before turning those decisions into a useful identity or digital experience.",
    deliverables: ["Creative direction", "Brand foundations", "Content structure", "Website strategy", "Design consultation"],
    tools: ["Workshops", "Research", "Figma", "Content planning"],
    boundary: "Focused on practical brand and digital decisions, not large-scale market research or a full advertising-agency engagement.",
    icon: "strategy",
  },
  {
    id: "front-end-technical-delivery",
    title: "Frontend Development, Code & No-Code",
    shortTitle: "Frontend development, code & no-code",
    summary: "I turn approved designs into responsive, accessible websites using code or the right no-code platform, then review the work through delivery.",
    deliverables: ["Responsive implementation", "Semantic HTML", "No-code builds", "Production QA", "Migration workflow support"],
    tools: ["HTML", "CSS", "JavaScript", "Git", "GitHub", "Vite", "No-code platforms"],
    boundary: "My strongest implementation work is HTML and CSS. JavaScript, React, and TypeScript remain developing skills and are presented honestly.",
    icon: "code",
  },
  {
    id: "ai-workflows-automation",
    title: "AI Workflows & Automation",
    shortTitle: "AI workflows & automation",
    summary: "I design supervised AI workflows, automate repetitive production work, and turn useful ideas into practical prototypes and tools.",
    deliverables: ["Workflow mapping", "Prompt systems", "Task automation", "Rapid prototypes", "Documentation and review"],
    tools: ["ChatGPT", "AI agents", "Structured prompting", "Automation tools", "Human review"],
    boundary: "This is applied AI workflow design and automation, not machine-learning engineering or custom-model development. Final judgment stays human-led.",
    icon: "spark",
  },
];
