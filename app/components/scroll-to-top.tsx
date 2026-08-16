import { useEffect, useState } from "react";
import { useLocation } from "react-router";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const [visibility, setVisibility] = useState({ pathname, visible: false });
  const visible = visibility.pathname === pathname && visibility.visible;

  useEffect(() => {
    const hero = document.querySelector("#hero");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisibility({ pathname, visible: !entry.isIntersecting && entry.boundingClientRect.top < 0 }),
      { threshold: 0.05 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  const returnToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className={`scroll-top${visible ? " scroll-top--visible" : ""}`}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={returnToTop}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m6 11 6-6 6 6M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
      </svg>
    </button>
  );
}
