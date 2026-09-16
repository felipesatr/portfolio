import { useLayoutEffect } from "react";
import { useLocation } from "react-router";

const softRevealSelector = [
  ".desktop-rail .wordmark",
  ".rail-nav .nav-link",
  ".mobile-header .wordmark",
  ".mobile-nav .nav-link",
  ".hero-audience",
  ".hero__details",
  ".project-filters",
  ".project-results-count",
  ".project-marquee__viewport",
  ".project-tetris-grid > .project-card",
  ".work-gallery__column > .project-card",
  ".service-summary-card",
  ".lab-grid__intro",
  ".lab-preview__placeholder-group",
  ".lab-preview__placeholder--3",
  ".lab-preview__placeholder--4",
  ".section-heading-row > *",
  ".experience-section__intro > *",
  ".experience-section .experience-list > li",
  ".references-grid > .reference-card",
  ".contact-cta__lower > div:first-child > span",
  ".contact-cta__actions",
  ".page-header > div",
  ".services-page__header > *",
  ".service-explorer__item",
  ".service-panel__section",
  ".project-preview__story > *",
  ".about-intro > div",
  ".process-section__intro",
  ".process-section li",
  ".about-details article",
  ".lab-index__item",
  ".contact-directory > a",
  ".contact-directory > div",
  ".placeholder-notice",
  ".case-study__header > div",
  ".case-study__header > dl",
  ".case-study__hero",
  ".case-study__body section",
  ".case-study__next",
  ".making-case-study__header > *",
  ".making-case-study__path",
  ".making-case-study__stages > li",
  ".not-found > *",
  ".site-footer > *",
].join(",");

export function SoftRevealObserver() {
  const location = useLocation();

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observed = new WeakSet<Element>();
    const siblingIndexes = new Map<Element, number>();
    const intersectionObserver = !reduceMotion && "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-soft-revealed");
              intersectionObserver?.unobserve(entry.target);
            });
          },
          { rootMargin: "0px 0px -8%", threshold: 0.08 },
        )
      : null;

    const register = (element: Element) => {
      if (observed.has(element) || element.classList.contains("reveal-title") || element.classList.contains("reveal-text")) return;

      observed.add(element);
      element.classList.add("soft-reveal-target");
      const parent = element.parentElement;
      const siblingIndex = parent ? siblingIndexes.get(parent) ?? 0 : 0;
      if (parent) siblingIndexes.set(parent, siblingIndex + 1);
      (element as HTMLElement).style.setProperty("--soft-reveal-index", String(Math.min(siblingIndex, 4)));

      if (!intersectionObserver) {
        element.classList.add("is-soft-revealed");
        return;
      }

      intersectionObserver.observe(element);
    };

    const registerWithin = (root: ParentNode) => {
      if (root instanceof Element && root.matches(softRevealSelector)) register(root);
      root.querySelectorAll(softRevealSelector).forEach(register);
    };

    registerWithin(document);
    document.documentElement.classList.add("soft-reveal-ready");

    const main = document.getElementById("main-content");
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) registerWithin(node);
        });
      });
    });
    if (main) mutationObserver.observe(main, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [location.pathname]);

  return null;
}
