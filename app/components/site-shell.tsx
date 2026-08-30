import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { siteContent } from "~/content/site";
import { LayoutGridOverlay, LayoutGridToggle } from "./layout-grid-overlay";
import { ScrollToTop } from "./scroll-to-top";
import { SoftRevealObserver } from "./soft-reveal-observer";
import { ThemeControl } from "./theme-control";
import { FluidCursor } from "./fluid-cursor";
import { LanguageIcon } from "./icons";
import { TypographyPreviewControl } from "./typography-preview-control";

const navigation = [
  { label: "Home", href: "/" },
  { label: "About me", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Process", href: "/services" },
  { label: "Lab", href: "/lab" },
  { label: "Contact", href: "/contact" },
];

function PrimaryNavigation({ className, showSocials = false }: { className: string; showSocials?: boolean }) {
  return (
    <nav className={className} aria-label="Primary navigation">
      {navigation.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/"}
          className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
      <a className="nav-link" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">
        Résumé <span className="visually-hidden">placeholder, opens in a new tab</span>
      </a>
      {showSocials ? (
        <div className="rail-nav__socials" aria-label="Social profile placeholders">
          <span className="nav-link nav-link--placeholder" aria-disabled="true" title="LinkedIn profile placeholder">LinkedIn</span>
          <span className="nav-link nav-link--placeholder" aria-disabled="true" title="GitHub profile placeholder">GitHub</span>
          <span className="nav-link nav-link--placeholder" aria-disabled="true" title="Instagram profile placeholder">Instagram</span>
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
          <NavLink key={item.href} to={item.href}>{item.label}</NavLink>
        ))}
        <NavLink to="/privacy">Privacy</NavLink>
        <NavLink to="/accessibility">Accessibility statement</NavLink>
      </nav>
      <span>V0 · Built for keyboard access, readable contrast, and reduced motion. <NavLink to="/accessibility">Read the accessibility statement</NavLink>.</span>
    </footer>
  );
}

export function SiteShell() {
  const [isGridVisible, setIsGridVisible] = useState(false);

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
    <div className="site-frame intro-target">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="desktop-rail" aria-label="Site navigation rail">
        <div className="rail__top">
          <NavLink className="wordmark" to="/" aria-label="Portfolio home">JS</NavLink>
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
          <NavLink className="wordmark" to="/" aria-label="Portfolio home">JS</NavLink>
        </div>
        <PrimaryNavigation className="mobile-nav" />
      </header>

      <div className="mobile-theme-control">
        {railTools}
      </div>

      <div className="page-surface">
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <ScrollToTop />
      <FluidCursor />
      <SoftRevealObserver />
      <LayoutGridOverlay isVisible={isGridVisible} />
      <TypographyPreviewControl />
      <div className="site-intro" aria-hidden="true"><span>JS</span><i /></div>
    </div>
  );
}
