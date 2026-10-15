import type { Dispatch, SetStateAction } from "react";

// Remove this comparison switch and its SiteShell wiring when a layout is chosen.
// Disabling it restores every variant, independently of the Lab comparison.
export const ENABLE_KIND_WORDS_TEST = true;
export type KindWordsView = number | null;

export function KindWordsTest({ view, setView }: {
  view: KindWordsView;
  setView: Dispatch<SetStateAction<KindWordsView>>;
}) {
  return (
    <div className="kind-words-test" role="group" aria-label="Kind words layout comparison" data-no-reveal>
      {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
        <button key={number} type="button" className="rail-circle-control"
          aria-pressed={view === number}
          aria-controls={`kind-words-variant-${number}`}
          aria-label={view === number ? "Show all Kind words layouts" : `Show only Kind words layout ${number}`}
          title={view === number ? "Show all ten layouts" : `Kind words · layout ${number}`}
          onClick={() => setView((current) => current === number ? null : number)}>{number}</button>
      ))}
    </div>
  );
}
