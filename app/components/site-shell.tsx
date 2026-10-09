import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { siteContent } from "~/content/site";
import { publicAsset } from "~/lib/public-asset";
import { LayoutGridOverlay, LayoutGridToggle } from "./layout-grid-overlay";
import { ScrollToTop } from "./scroll-to-top";
import { SiteScrollbar } from "./site-scrollbar";
import { SoftRevealObserver } from "./soft-reveal-observer";
import { ThemeControl } from "./theme-control";
import { FluidCursor } from "./fluid-cursor";
import { LanguageIcon } from "./icons";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Process", href: "/services" },
  { label: "Lab", href: "/lab" },
  { label: "Contact", href: "/contact" },
];

function PrimaryNavigation({ className, showSocials = false }: { className: string; showSocials?: boolean }) {
  const usesPillCursor = className === "rail-nav";

  return (
    <nav className={className} aria-label="Primary navigation">
      {navigation.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/"}
          className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
        >
          <span data-cursor-pill={usesPillCursor ? "" : undefined} data-cursor-pill-label={usesPillCursor ? "" : undefined} data-fluid-cursor-native-ink>{item.label}</span>
        </NavLink>
      ))}
      <a className="nav-link" href={publicAsset("resume/felipe-salazar-cv.pdf")} target="_blank" rel="noreferrer">
        <span data-cursor-pill={usesPillCursor ? "" : undefined} data-cursor-pill-label={usesPillCursor ? "" : undefined} data-fluid-cursor-native-ink>Resume</span> <span className="visually-hidden">PDF, opens in a new tab</span>
      </a>
      {showSocials ? (
        <div className="rail-nav__socials" aria-label="Social profile placeholders">
          <span className="nav-link nav-link--placeholder" aria-disabled="true" title="LinkedIn profile placeholder"><span data-cursor-pill data-cursor-pill-label data-fluid-cursor-native-ink>LinkedIn</span></span>
          <span className="nav-link nav-link--placeholder" aria-disabled="true" title="GitHub profile placeholder"><span data-cursor-pill data-cursor-pill-label data-fluid-cursor-native-ink>GitHub</span></span>
          <span className="nav-link nav-link--placeholder" aria-disabled="true" title="Behance profile placeholder"><span data-cursor-pill data-cursor-pill-label data-fluid-cursor-native-ink>Behance</span></span>
        </div>
      ) : null}
    </nav>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>{siteContent.name}</strong>
        <span>{siteContent.title}</span>
      </div>
      <nav aria-label="Footer navigation">
        {navigation.map((item) => (
          <NavLink key={item.href} to={item.href}><span data-fluid-cursor-native-ink>{item.label}</span></NavLink>
        ))}
        <NavLink to="/privacy"><span data-fluid-cursor-native-ink>Privacy</span></NavLink>
        <NavLink to="/accessibility"><span data-fluid-cursor-native-ink>Accessibility statement</span></NavLink>
      </nav>
      <span>V0 · Built for keyboard access, readable contrast, and reduced motion. <NavLink to="/accessibility">Read the accessibility statement</NavLink>.</span>
    </footer>
  );
}

export function SiteShell() {
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [routePhase, setRoutePhase] = useState<"idle" | "exiting" | "entering">("idle");
  const location = useLocation();
  const navigate = useNavigate();
  const routeTimer = useRef(0);
  const routeFrames = useRef([0, 0]);
  const routeTransitionPending = useRef(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let attempts = 0;
    const releaseBoot = () => {
      // Keep the server-rendered document hidden until the reveal observer and
      // home intro have installed their initial hidden states.
      if (attempts++ < 60 && (!root.classList.contains("soft-reveal-ready") ||
        (root.dataset.documentIntro === "pending" && root.dataset.heroIntro !== "pending"))) {
        frame = window.requestAnimationFrame(releaseBoot);
        return;
      }
      if (root.dataset.documentIntro === "pending") window.scrollTo({ top: 0, behavior: "instant" });
      root.style.removeProperty("scroll-behavior");
      delete root.dataset.appBoot;
    };
    frame = window.requestAnimationFrame(releaseBoot);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (!routeTransitionPending.current) return;
    setRoutePhase("entering");
    const frames = routeFrames.current;
    frames[0] = window.requestAnimationFrame(() => {
      frames[1] = window.requestAnimationFrame(() => {
        setRoutePhase("idle");
        routeTransitionPending.current = false;
      });
    });
    return () => frames.forEach((frame) => window.cancelAnimationFrame(frame));
  }, [location.key]);

  useLayoutEffect(() => () => {
    window.clearTimeout(routeTimer.current);
    routeFrames.current.forEach((frame) => window.cancelAnimationFrame(frame));
  }, []);

  const handleInternalNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;
    const next = new URL(anchor.href, window.location.href);
    if (next.origin !== window.location.origin) return;
    const browserPath = window.location.pathname;
    const basePath = browserPath.endsWith(location.pathname)
      ? browserPath.slice(0, browserPath.length - location.pathname.length)
      : "";
    const nextPath = basePath && next.pathname.startsWith(`${basePath}/`)
      ? next.pathname.slice(basePath.length)
      : next.pathname;
    if (nextPath === location.pathname && next.search === location.search) return;
    event.preventDefault();
    window.clearTimeout(routeTimer.current);
    routeTransitionPending.current = true;
    const destination = `${nextPath}${next.search}${next.hash}`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      routeTransitionPending.current = false;
      navigate(destination);
      return;
    }
    setRoutePhase("exiting");
    routeTimer.current = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      navigate(destination);
    }, 240);
  };

  const railTools = (
    <div className="rail-tools">
      <ThemeControl />
      <LayoutGridToggle isVisible={isGridVisible} onToggle={() => setIsGridVisible((current) => !current)} />
      <button className="rail-circle-control rail-circle-control--disabled" type="button" disabled aria-label="Language selector placeholder: English and Spanish" title="English and Spanish selector coming later">
        <LanguageIcon size={18} />
      </button>
    </div>
  );

  return (
    <div className="site-frame" onClickCapture={handleInternalNavigation}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="desktop-rail" aria-label="Site navigation rail">
        <div className="rail__top">
          <NavLink className="wordmark" to="/" aria-label="Felipe Salazar portfolio home"><span>Felipe</span><span>Salazar</span></NavLink>
          <PrimaryNavigation className="rail-nav" showSocials />
        </div>
        <div className="rail__bottom">
          <div className="rail-utilities">
            {railTools}
          </div>
        </div>
      </aside>

      <header className="mobile-header">
        <div className="mobile-header__top">
          <NavLink className="wordmark" to="/" aria-label="Felipe Salazar portfolio home"><span>Felipe</span><span>Salazar</span></NavLink>
        </div>
        <PrimaryNavigation className="mobile-nav" />
      </header>

      <div className="mobile-theme-control">
        {railTools}
      </div>

      <div className={`page-surface page-surface--${routePhase}`}>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <ScrollToTop />
      <SiteScrollbar />
      <FluidCursor />
      <SoftRevealObserver />
      <LayoutGridOverlay isVisible={isGridVisible} />
    </div>
  );
}
