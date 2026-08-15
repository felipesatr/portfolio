import type { Config } from "@react-router/dev/config";
import { projects } from "./app/content/portfolio";

export default {
  ssr: false,
  prerender: [
    "/",
    "/work",
    ...projects.map((project) => `/work/${project.slug}`),
    "/work/behind-this-portfolio",
    "/about",
    "/lab",
    "/contact",
  ],
} satisfies Config;
