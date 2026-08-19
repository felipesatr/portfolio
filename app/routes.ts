import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("work", "routes/work.tsx"),
  route("work/behind-this-portfolio", "routes/behind-portfolio.tsx"),
  route("work/:slug", "routes/project-detail.tsx"),
  route("services", "routes/services.tsx"),
  route("about", "routes/about.tsx"),
  route("lab", "routes/lab.tsx"),
  route("contact", "routes/contact.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("accessibility", "routes/accessibility.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
