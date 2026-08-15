import { NavLink, Outlet } from "react-router";
import { siteContent } from "~/content/site";
import { ThemeControl } from "./theme-control";

const navigation = [
  { label: "Home", href: "/", end: true },
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Lab", href: "/lab" },
  { label: "Contact", href: "/contact" },
];

function PrimaryNavigation({ className }: { className: string }) {
  return (
    <nav className={className} aria-label="Primary navigation">
      {navigation.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
        >
          <span className="nav-link__marker" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
      <a className="nav-link" href="/resume-placeholder.txt" target="_blank" rel="noreferrer">
        <span className="nav-link__marker" aria-hidden="true" />
        Résumé <span className="visually-hidden">placeholder, opens in a new tab</span>
      </a>
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
        {navigation.slice(1).map((item) => (
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
          <p className="rail__title">{siteContent.title}</p>
          <PrimaryNavigation className="rail-nav" />
          <ThemeControl />
        </div>
        <div className="rail__bottom">
          <strong>{siteContent.location}</strong>
          <span>{siteContent.availability}</span>
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
      <div className="site-intro" aria-hidden="true"><span>JS</span><i /></div>
    </div>
  );
}
