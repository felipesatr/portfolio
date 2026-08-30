import { Link } from "react-router";
import { SendDiagonalSolidIcon } from "../icons";

// Archived from the hero on 2026-08-27. Keep this separate from the active
// CTA so the outlined treatment can be restored without reconstructing it.
export function ArchivedOutlinedLetsTalkButton() {
  return (
    <Link className="button button--outline hero-contact-button" to="/contact">
      <span className="liquid-button__surface">
        <span className="liquid-button__label">Let&apos;s talk! <SendDiagonalSolidIcon /></span>
        <span className="liquid-button__label liquid-button__label--ink" aria-hidden="true">Let&apos;s talk! <SendDiagonalSolidIcon /></span>
      </span>
    </Link>
  );
}
