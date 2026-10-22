import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

// Keep the homepage easing, with a brisker cadence for the About sequence.
// Overlap phases while keeping the established transition durations intact.
const REVEAL_SETTLE_MS = 180;
const CARD_STAGGER_MS = 45;

export function useAboutMotion(timelineRef: RefObject<HTMLDivElement | null>) {
  const [storyVisible, setStoryVisible] = useState(false);
  const controls = useRef({ introSettled: () => {}, storySettled: () => {} });
  const onIntroSettled = useCallback(() => controls.current.introSettled(), []);
  const onStorySettled = useCallback(() => controls.current.storySettled(), []);

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    const page = timeline?.closest<HTMLElement>(".about-rebuild");
    const story = page?.querySelector<HTMLElement>(".about-story-values");
    const heading = page?.querySelector<HTMLElement>("#about-story-heading");
    if (!page || !story || !heading || !timeline) return;

    const intro = [...page.querySelectorAll<HTMLElement>(".about-hero__introduction, .about-portrait")];
    const milestones = [...timeline.querySelectorAll<HTMLElement>(".about-timeline__card")]
      .sort((a, b) => Number(a.parentElement?.dataset.softRevealIndex) - Number(b.parentElement?.dataset.softRevealIndex));
    const values = [...story.querySelectorAll<HTMLElement>(".about-value-item")];
    const targets = [...intro, ...milestones, ...values];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let introComplete = false;
    let storyInView = false;
    let storyStarted = false;
    let cardsReady = false;
    let introStarted = false;
    let introTimer = 0;
    let frame = 0;

    targets.forEach((target) => target.classList.add("soft-reveal-target"));
    page.classList.add("about-motion-ready");
    page.dataset.aboutMotionPhase = "intro-heading";

    const show = (target: HTMLElement, delay = 0) => {
      target.style.setProperty("--about-reveal-delay", `${delay}ms`);
      target.classList.add("is-soft-revealed");
    };
    const revealVisibleCards = () => {
      if (!cardsReady) return;
      const now = performance.now();
      // Each column runs its own queue, so timeline and values start together.
      for (const group of [milestones, values]) {
        const visible = group.filter((card) => {
          if (card.classList.contains("is-soft-revealed")) return false;
          const rect = card.getBoundingClientRect();
          return rect.top <= window.innerHeight && rect.bottom >= 0;
        });
        let start = now;
        visible.forEach((card) => {
          show(card, start - now);
          cardObserver?.unobserve(card);
          start += CARD_STAGGER_MS;
        });
      }
    };
    const startStory = () => {
      if (!introComplete || !storyInView || storyStarted) return;
      storyStarted = true;
      story.classList.add("is-about-story-started");
      page.dataset.aboutMotionPhase = "story-headings";
      setStoryVisible(true);
    };
    const cardObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(() => revealVisibleCards(), { threshold: 0 })
      : null;
    const headingObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          storyInView = true;
          headingObserver?.disconnect();
          startStory();
        }, { threshold: 0 })
      : null;

    controls.current = {
      introSettled: () => {
        if (introStarted) return;
        introStarted = true;
        intro.forEach((target) => show(target));
        page.dataset.aboutMotionPhase = "intro-content";
        introTimer = window.setTimeout(() => {
          introComplete = true;
          startStory();
        }, REVEAL_SETTLE_MS);
      },
      storySettled: () => {
        if (motion.matches) return;
        cardsReady = true;
        page.dataset.aboutMotionPhase = "cards";
        revealVisibleCards();
      },
    };

    const showWithoutMotion = () => {
      introStarted = true;
      introComplete = true;
      storyStarted = true;
      cardsReady = true;
      window.clearTimeout(introTimer);
      headingObserver?.disconnect();
      cardObserver?.disconnect();
      targets.forEach((target) => show(target));
      story.classList.add("is-about-story-started");
      page.dataset.aboutMotionPhase = "complete";
      setStoryVisible(true);
    };
    const onMotionChange = () => {
      if (motion.matches) showWithoutMotion();
    };
    if (motion.matches || !cardObserver || !headingObserver) {
      frame = window.requestAnimationFrame(showWithoutMotion);
    } else {
      headingObserver.observe(heading);
      [...milestones, ...values].forEach((card) => cardObserver.observe(card));
    }
    motion.addEventListener("change", onMotionChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(introTimer);
      headingObserver?.disconnect();
      cardObserver?.disconnect();
      motion.removeEventListener("change", onMotionChange);
      controls.current = { introSettled: () => {}, storySettled: () => {} };
      page.classList.remove("about-motion-ready");
      delete page.dataset.aboutMotionPhase;
    };
  }, [timelineRef]);

  return { storyVisible, onIntroSettled, onStorySettled };
}
