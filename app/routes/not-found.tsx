import { Link } from "react-router";
import type { Route } from "./+types/not-found";
import { routeMeta } from "~/content/site";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Page not found", "The requested page does not exist.", "/404");
}

export default function NotFound() {
  return (
    <div className="not-found standard-page">
      <p className="not-found__number">404</p>
      <div><h1>This page is outside the grid.</h1><p>The address may have changed, or the page may not exist yet.</p><Link className="button button--primary" to="/"><span className="liquid-button__surface">Return home</span></Link></div>
    </div>
  );
}
