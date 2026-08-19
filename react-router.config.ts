import type { Config } from "@react-router/dev/config";
import { workProjects } from "./app/content/portfolio";

export default {
  ssr: false,
  prerender: [
    "/",
    "/work",
    ...workProjects.filter((project) => project.slug !== "behind-this-portfolio").map((project) => `/work/${project.slug}`),
    "/work/behind-this-portfolio",
    "/services",
    "/about",
    "/lab",
    "/contact",
    "/privacy",
    "/accessibility",
  ],
} satisfies Config;
