import { useLayoutEffect, type RefObject } from "react";

export function useExperienceGridStart(ref: RefObject<HTMLDivElement | null>, processRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const row = ref.current;
    const page = row?.closest<HTMLElement>(".about-rebuild");
    const previous = page?.querySelector<HTMLElement>(".about-story-values");
    if (!row || !page || !previous) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const process = processRef.current;
      if (innerWidth <= 1280) {
        row.style.setProperty("--experience-shift", "0px");
        row.style.removeProperty('--globe-caption-gap');
        process?.style.setProperty('--process-shift', '0px');
        return;
      }
      const rowToken = getComputedStyle(page).getPropertyValue('--grid-row').trim();
      const unit = (Number.parseFloat(rowToken) || 6) * (rowToken.endsWith('rem') ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) : 1);
      const gridLine = document.querySelectorAll<HTMLElement>(".layout-grid__horizontal-line")[17];
      const h17 = gridLine ? gridLine.getBoundingClientRect().top + scrollY : 17 * unit;
      const oldShift = Number.parseFloat(row.style.getPropertyValue("--experience-shift")) || 0;
      const naturalTop = row.getBoundingClientRect().top + scrollY - oldShift;
      const previousEnd = previous.getBoundingClientRect().bottom + scrollY;
      // H17 is exact while the preceding content fits. Longer/narrower copy
      // can push this down instead of overlapping the timeline or values.
      const top = Math.max(h17, previousEnd + 8);
      row.style.setProperty("--experience-shift", `${(top - naturalTop).toFixed(2)}px`);
      const sphere = row.querySelector<HTMLElement>('.distance-globe__stage');
      const caption = row.querySelector<HTMLElement>('.distance-globe__caption');
      if (sphere && caption) {
        const gridLines = document.querySelectorAll<HTMLElement>('.layout-grid__horizontal-line');
        const h22Line = gridLines[22];
        const h24Line = gridLines[24];
        const h22 = h22Line ? h22Line.getBoundingClientRect().top + scrollY : 22 * unit;
        const h24 = h24Line ? h24Line.getBoundingClientRect().top + scrollY : 24 * unit;
        const gap = h22 + .5 * unit - (sphere.getBoundingClientRect().bottom + scrollY) - caption.getBoundingClientRect().height;
        row.style.setProperty('--globe-caption-gap', `${Math.max(14, gap).toFixed(2)}px`);
        if (process) {
          const oldProcessShift = Number.parseFloat(process.style.getPropertyValue('--process-shift')) || 0;
          const processNaturalTop = process.getBoundingClientRect().top + scrollY - oldProcessShift;
          const experienceBottom = row.querySelector('.about-experience-section')?.getBoundingClientRect().bottom ?? 0;
          process.style.setProperty('--process-shift', `${(Math.max(h24, experienceBottom + scrollY + 32) - processNaturalTop).toFixed(2)}px`);
        }
      }
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(previous);
    observer.observe(row);
    if (processRef.current) observer.observe(processRef.current);
    window.addEventListener("resize", schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", schedule); };
  }, [ref, processRef]);
}
