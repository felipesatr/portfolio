import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { SiteShell } from "./components/site-shell";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/utilities.css";
import "./styles/motion.css";

const earlyPreferenceScript = `
  (() => {
    try {
      const savedTheme = localStorage.getItem('portfolio-theme');
      if (savedTheme) document.documentElement.dataset.theme = savedTheme;
      if (sessionStorage.getItem('portfolio-intro-seen')) {
        document.documentElement.dataset.intro = 'seen';
      } else {
        sessionStorage.setItem('portfolio-intro-seen', 'true');
        document.documentElement.dataset.intro = 'play';
      }
    } catch (_) {}
  })();
`;

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#fefefc" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: earlyPreferenceScript }} />
      </head>
      <body>
        <noscript>
          <style>{`.reveal-title__word-inner,.reveal-text__word{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <SiteShell />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error interrupted this page.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details = error.status === 404 ? "The requested page does not exist." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="error-page" id="main-content">
      <p className="role-title">Portfolio V0</p>
      <h1>{message}</h1>
      <p>{details}</p>
      <Link className="button button--primary" to="/">Return home</Link>
      {stack ? <pre><code>{stack}</code></pre> : null}
    </main>
  );
}
