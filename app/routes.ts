import type { RouteConfig } from "@react-router/dev/routes";

export default [
  { index: true, file: "routes/home.tsx" },
  { path: "work", file: "routes/work.tsx" },
  { path: "work/behind-this-portfolio", file: "routes/behind-portfolio.tsx" },
  { path: "work/:slug", file: "routes/project-detail.tsx" },
  { path: "services", file: "routes/services.tsx" },
  { path: "about", file: "routes/about.tsx" },
  { path: "lab", file: "routes/lab.tsx" },
  { path: "contact", file: "routes/contact.tsx" },
  { path: "privacy", file: "routes/privacy.tsx" },
  { path: "accessibility", file: "routes/accessibility.tsx" },
  { path: "*", file: "routes/not-found.tsx" },
] satisfies RouteConfig;
