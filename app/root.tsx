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
      const root = document.documentElement;
      const resetToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const navigation = performance.getEntriesByType('navigation')[0];
      const isReload = navigation && navigation.type === 'reload';

      // New documents remain invisible until their scroll position has settled.
      root.dataset.pageReset = 'pending';
      root.style.scrollBehavior = 'auto';
      history.scrollRestoration = 'manual';
      resetToTop();
      requestAnimationFrame(() => {
        resetToTop();
        requestAnimationFrame(() => {
          resetToTop();
          root.style.removeProperty('scroll-behavior');
          delete root.dataset.pageReset;
        });
      });

      // Keyboard reloads get a complete exit: fade and blur the live page,
      // jump to the top only once it is invisible, then reload into the intro.
      const reloadWithExit = () => {
        if (root.dataset.pageExit === 'leaving') return;
        root.dataset.pageExit = 'leaving';
        window.setTimeout(() => {
          root.style.scrollBehavior = 'auto';
          resetToTop();
          sessionStorage.removeItem('portfolio-intro-seen');
          window.setTimeout(() => window.location.reload(), 24);
        }, 300);
      };
      window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && key === 'r')) {
          event.preventDefault();
          reloadWithExit();
        }
      }, { capture: true });
      window.addEventListener('beforeunload', () => {
        root.dataset.pageExit = 'leaving';
        root.style.scrollBehavior = 'auto';
        resetToTop();
      });

      const savedTheme = localStorage.getItem('portfolio-theme');
      if (savedTheme) root.dataset.theme = savedTheme;
      if (isReload || !sessionStorage.getItem('portfolio-intro-seen')) {
        sessionStorage.setItem('portfolio-intro-seen', 'true');
        root.dataset.intro = 'play';
      } else {
        root.dataset.intro = 'seen';
      }
    } catch (_) {}
  })();
`;

const figtreeStylesheet = "https://fonts.googleapis.com/css2?family=Figtree:wght@400&display=swap";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cal+Sans:wght@400&display=swap" },
  { rel: "stylesheet", href: figtreeStylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#161616" />
        <Meta />
        <Links />
        <style>{`html[data-page-reset="pending"] { scroll-behavior: auto !important; } html[data-page-reset="pending"] body { visibility: hidden; } body { transition: opacity 300ms var(--ease-out), filter 300ms var(--ease-out); } html[data-page-exit="leaving"] body { opacity: 0; filter: blur(12px); pointer-events: none; }`}</style>
        <script dangerouslySetInnerHTML={{ __html: earlyPreferenceScript }} />
      </head>
      <body>
        <noscript>
          <style>{`.reveal-title__word-inner,.reveal-text__word,.soft-blur-text__character{opacity:1!important;filter:none!important;transform:none!important}`}</style>
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
      <Link className="button button--primary" to="/"><span className="liquid-button__surface">Return home</span></Link>
      {stack ? <pre><code>{stack}</code></pre> : null}
    </main>
  );
}
