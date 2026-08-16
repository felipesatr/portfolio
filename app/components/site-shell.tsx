import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { siteContent } from "~/content/site";
import { LocalTime } from "./local-time";
import { ScrollToTop } from "./scroll-to-top";
import { ThemeControl } from "./theme-control";

const globalNavigation = [
  { label: "Home", href: "/", end: true },
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Lab", href: "/lab" },
  { label: "Contact", href: "/contact" },
];

const homepageNavigation = [
  { label: "Home", id: "hero" },
  { label: "Work", id: "selected-work" },
  { label: "Skills", id: "skills" },
  { label: "Lab", id: "lab" },
  { label: "Experience", id: "experience" },
  { label: "References", id: "references" },
  { label: "Making of", id: "making-of" },
  { label: "Contact", id: "contact" },
];

function NavigationMarker() {
  return <span className="nav-link__marker" aria-hidden="true">•</span>;
}

function HomepageNavigation({ className }: { className: string }) {
  const [activeSection, setActiveSection] = useState("hero");
  const pendingSection = useRef<string | null>(null);

  const scrollToSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const section = document.getElementById(id);
    if (!section) return;

    event.preventDefault();
    pendingSection.current = id;
    setActiveSection(id);
    window.history.pushState(null, "", `#${id}`);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    window.addEventListener("scrollend", () => {
      if (pendingSection.current !== id) return;
      const activationLine = window.innerHeight * 0.16;
      const visibleSection = homepageNavigation
        .map((item) => document.getElementById(item.id))
        .find((candidate) => {
          if (!candidate) return false;
          const bounds = candidate.getBoundingClientRect();
          return bounds.top <= activationLine && bounds.bottom >= activationLine;
        });
      if (visibleSection) setActiveSection(visibleSection.id);
      pendingSection.current = null;
    }, { once: true });
  };

  useEffect(() => {
    const sections = homepageNavigation
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    let frame = 0;

    const syncActiveSection = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const activationLine = window.innerHeight * 0.16;
        const pendingId = pendingSection.current;

        if (pendingId) {
          const pendingTarget = document.getElementById(pendingId);
          const pendingBounds = pendingTarget?.getBoundingClientRect();
          if (pendingBounds && pendingBounds.top <= activationLine && pendingBounds.bottom >= activationLine) {
            setActiveSection(pendingId);
            pendingSection.current = null;
          }
          return;
        }

        const visibleSection = sections.find((section) => {
          const bounds = section.getBoundingClientRect();
          return bounds.top <= activationLine && bounds.bottom >= activationLine;
        });
        if (visibleSection) setActiveSection(visibleSection.id);
      });
    };

    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);
    window.addEventListener("hashchange", syncActiveSection);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, []);

  return (
    <nav className={className} aria-label="Homepage sections">
      {homepageNavigation.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-link${isActive ? " nav-link--active" : ""}`}
            aria-current={isActive ? "location" : undefined}
            onClick={(event) => scrollToSection(event, item.id)}
          >
            <NavigationMarker />
            {item.label}
          </a>
        );
      })}
      <a className="nav-link" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">
        <NavigationMarker />
        Résumé <span className="visually-hidden">placeholder, opens in a new tab</span>
      </a>
    </nav>
  );
}

function GlobalNavigation({ className }: { className: string }) {
  return (
    <nav className={className} aria-label="Primary navigation">
      {globalNavigation.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
        >
          <NavigationMarker />
          {item.label}
        </NavLink>
      ))}
      <a className="nav-link" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">
        <NavigationMarker />
        Résumé <span className="visually-hidden">placeholder, opens in a new tab</span>
      </a>
    </nav>
  );
}

function PrimaryNavigation({ className }: { className: string }) {
  const { pathname } = useLocation();
  return pathname === "/" ? <HomepageNavigation className={className} /> : <GlobalNavigation className={className} />;
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>{siteContent.name}</strong>
        <span>{siteContent.title}</span>
      </div>
      <nav aria-label="Footer navigation">
        {globalNavigation.slice(1).map((item) => (
          <NavLink key={item.href} to={item.href}>{item.label}</NavLink>
        ))}
      </nav>
      <span>V0 · Placeholder content · No invented evidence</span>
    </footer>
  );
}

export function SiteShell() {
  return (
    <div className="site-frame intro-target">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="desktop-rail" aria-label="Site navigation rail">
        <div className="rail__top">
          <NavLink className="wordmark" to="/" aria-label="Portfolio home">JS</NavLink>
          <PrimaryNavigation className="rail-nav" />
        </div>
        <div className="rail__bottom">
          <ThemeControl />
          <LocalTime />
        </div>
      </aside>

      <header className="mobile-header">
        <div className="mobile-header__top">
          <NavLink className="wordmark" to="/" aria-label="Portfolio home">JS</NavLink>
          <ThemeControl />
        </div>
        <PrimaryNavigation className="mobile-nav" />
      </header>

      <div className="page-surface">
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <ScrollToTop />
      <div className="site-intro" aria-hidden="true"><span>JS</span><i /></div>
    </div>
  );
}
