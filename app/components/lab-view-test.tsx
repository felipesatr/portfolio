// Temporary comparison aid. Set this to false to restore both sections and
// remove the controls; no layout or game-state changes need to be undone.
import type { Dispatch, SetStateAction } from "react";

export const ENABLE_LAB_VIEW_TEST = true;
export type LabView = 1 | 2 | null;

export interface ComparisonViewState {
  labView: LabView;
  setLabView: Dispatch<SetStateAction<LabView>>;
}

type LabViewTestProps = {
  labView: LabView;
  setLabView: Dispatch<SetStateAction<LabView>>;
};

export function LabViewTest({ labView, setLabView }: LabViewTestProps) {
  return (
    <div className="lab-view-test" data-no-reveal>
      <div className="lab-view-test__group" role="group" aria-label="Lab section comparison">
        {([1, 2] as const).map((view) => (
          <button key={view} className="rail-circle-control" type="button" aria-label={`Show only lab section ${view}`} aria-pressed={labView === view} title={labView === view ? "Show both lab sections" : `Show only lab section ${view}`} onClick={() => setLabView((current) => current === view ? null : view)}>{view}</button>
        ))}
      </div>
    </div>
  );
}
