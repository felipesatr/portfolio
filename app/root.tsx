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
import { publicAsset } from "./lib/public-asset";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/utilities.css";
import "./styles/motion.css";
import "./styles/lab-calendar.css";

const earlyPreferenceScript = `
  (() => {
    try {
      const root = document.documentElement;
      root.dataset.appBoot = 'pending';
      const homePath = ${JSON.stringify(publicAsset("") )};
      if (window.location.pathname === homePath || window.location.pathname === homePath + 'index.html') {
        root.dataset.documentIntro = 'pending';
      }
      const resetToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const introLocked = () => root.dataset.appBoot === 'pending' ||
        root.dataset.documentIntro === 'pending' || root.dataset.documentIntro === 'ready';
      const blockIntroScroll = (event) => {
        if (introLocked()) event.preventDefault();
      };
      window.addEventListener('wheel', blockIntroScroll, { capture: true, passive: false });
      window.addEventListener('touchmove', blockIntroScroll, { capture: true, passive: false });
      window.addEventListener('keydown', (event) => {
        if (!introLocked() || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        if ([' ', 'Spacebar', 'PageDown', 'PageUp', 'End', 'Home', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault();
      }, { capture: true });
      window.addEventListener('scroll', () => {
        if (introLocked() && (window.scrollX || window.scrollY)) resetToTop();
      }, { passive: true });
      root.style.scrollBehavior = 'auto';
      history.scrollRestoration = 'manual';
      resetToTop();
      requestAnimationFrame(() => {
        resetToTop();
      });

      // Keyboard reloads get a complete exit: fade and blur the live page,
      // jump to the top only once it is invisible, then reload into the intro.
      const reloadWithExit = () => {
        if (root.dataset.pageExit === 'leaving') return;
        root.dataset.pageExit = 'leaving';
        window.setTimeout(() => {
          root.style.scrollBehavior = 'auto';
          resetToTop();
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
        // Native toolbar reloads do not run through reloadWithExit. Hide the
        // outgoing document synchronously so its last painted content cannot
        // appear between the old page and the new document's boot veil.
        if (document.body) document.body.style.visibility = 'hidden';
        root.style.scrollBehavior = 'auto';
        resetToTop();
      });

      const savedTheme = localStorage.getItem('portfolio-theme');
      const themeIds = ['dark-sky', 'dark-monochrome', 'dark-cyan', 'dark-berry', 'dark', 'warm', 'light', 'cool', 'contrast'];
      root.dataset.theme = themeIds.includes(savedTheme) ? savedTheme : themeIds[0];
    } catch (_) {}
  })();
`;

const bootStyles = `
  html { background: #0a0a0a; }
  html[data-theme="dark"], html[data-theme="dark"] body { background: #1b0044; }
  html[data-theme="dark-cyan"], html[data-theme="dark-cyan"] body { background: #190482; }
  html[data-theme="dark-monochrome"], html[data-theme="dark-monochrome"] body { background: #252525; }
  html[data-theme="dark-berry"], html[data-theme="dark-berry"] body { background: #3a0519; }
  html[data-theme="warm"], html[data-theme="warm"] body { background: #f2e9d7; }
  html[data-theme="light"], html[data-theme="light"] body { background: #f0f5f9; }
  html[data-theme="cool"], html[data-theme="cool"] body { background: #edf3f0; }
  html[data-theme="contrast"], html[data-theme="contrast"] body { background: #ffffff; }
  html[data-app-boot="pending"] body { visibility: hidden !important; }
  html[data-page-exit="leaving"] body { opacity: 0; filter: blur(12px); pointer-events: none; transition: opacity 280ms ease, filter 280ms ease; }
`;

const figtreeStylesheet = "https://fonts.googleapis.com/css2?family=Figtree:wght@400..900&display=swap";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: publicAsset("favicon.svg"), type: "image/svg+xml" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cal+Sans:wght@400&display=swap" },
  { rel: "stylesheet", href: figtreeStylesheet },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark-sky" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#161616" />
        <style>{bootStyles}</style>
        <script dangerouslySetInnerHTML={{ __html: earlyPreferenceScript }} />
        <Meta />
        <Links />
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
