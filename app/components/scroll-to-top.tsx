import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ArrowUpIcon } from "./icons";

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
      <ArrowUpIcon size={20} />
    </button>
  );
}
