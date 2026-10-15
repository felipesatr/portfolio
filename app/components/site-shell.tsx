import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { publicAsset } from "~/lib/public-asset";
import { LayoutGridOverlay, LayoutGridToggle } from "./layout-grid-overlay";
import { ScrollToTop } from "./scroll-to-top";
import { SiteScrollbar } from "./site-scrollbar";
import { SoftRevealObserver } from "./soft-reveal-observer";
import { ThemeControl } from "./theme-control";
import { FluidCursor } from "./fluid-cursor";
import { ArrowUpRightIcon, LanguageIcon } from "./icons";
import { ENABLE_LAB_VIEW_TEST, LabViewTest, type ComparisonViewState, type LabView } from "./lab-view-test";
import { ENABLE_KIND_WORDS_TEST, KindWordsTest, type KindWordsView } from "./kind-words-test";

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
      {navigation.map((item) => {
        const label = item.href === "/lab" && usesPillCursor ? "Lab & tools" : item.label;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
          >
            <span data-cursor-pill={usesPillCursor ? "" : undefined} data-cursor-pill-label={usesPillCursor ? "" : undefined} data-fluid-cursor-native-ink>{label}</span>
          </NavLink>
        );
      })}
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

function SiteFooterCard() {
  const [bogotaTime, setBogotaTime] = useState(() => formatBogotaTime());

  useLayoutEffect(() => {
    const updateTime = () => setBogotaTime(formatBogotaTime());
    updateTime();
    let intervalId = 0;
    const firstTick = window.setTimeout(() => {
      updateTime();
      intervalId = window.setInterval(updateTime, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="site-footer__card site-footer__card--narrow">
      <div>
        <span>Designed &amp; coded with care</span>
        <strong>© {new Date().getFullYear()} Felipe Salazar • All rights reserved</strong>
      </div>
      <div className="site-footer__site-info">
        <span>Site details</span>
        <div className="site-footer__site-links">
          <NavLink to="/privacy" data-cursor-pill data-cursor-underline>Privacy policy <ArrowUpRightIcon size={14} /></NavLink>
          <span aria-hidden="true">•</span>
          <NavLink to="/accessibility" data-cursor-pill data-cursor-underline>Accessibility statement <ArrowUpRightIcon size={14} /></NavLink>
        </div>
      </div>
      <div className="site-footer__local-time">
        <span>Local time</span>
        <strong>{bogotaTime} UTC−5 • Bogotá, Colombia</strong>
      </div>
    </div>
  );
}

function formatBogotaTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function SiteFooter() {
  return (
    <footer className="site-footer" data-no-reveal>
      <SiteFooterCard />
    </footer>
  );
}

export function SiteShell() {
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [labView, setLabView] = useState<LabView>(null);
  const [kindWordsView, setKindWordsView] = useState<KindWordsView>(null);
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

  const comparisonViews: ComparisonViewState = { labView, setLabView, kindWordsView, setKindWordsView };

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
          <Outlet context={comparisonViews} />
        </main>
        <SiteFooter />
      </div>
      {ENABLE_LAB_VIEW_TEST && location.pathname === "/" ? (
        <LabViewTest labView={labView} setLabView={setLabView} />
      ) : null}
      {ENABLE_KIND_WORDS_TEST && location.pathname === "/" ? (
        <KindWordsTest view={kindWordsView} setView={setKindWordsView} />
      ) : null}
      <ScrollToTop />
      <SiteScrollbar />
      <FluidCursor />
      <SoftRevealObserver />
      <LayoutGridOverlay isVisible={isGridVisible} />
    </div>
  );
}
