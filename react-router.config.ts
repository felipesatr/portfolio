import type { Config } from "@react-router/dev/config";
import { workProjects } from "./app/content/portfolio";

const basePath = process.env.PORTFOLIO_BASE_PATH?.replace(/\/$/, "") || "";

export default {
  ssr: Boolean(basePath),
  basename: basePath || "/",
  routeDiscovery: { mode: "initial" },
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
