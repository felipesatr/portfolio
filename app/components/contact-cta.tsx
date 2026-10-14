import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { siteContent } from "~/content/site";
import { ArrowRightIcon, CopyIcon } from "./icons";

// Keep the footer CTA heading plain, without reveal or unblur wrappers.
function FooterEmailCopy() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copyEmail = async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(siteContent.email);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    resetTimer.current = setTimeout(() => setStatus("idle"), 2400);
  };

  return (
    <div className="footer-email">
      <span>or copy my Email</span>
      <button type="button" className="footer-email__copy" onClick={copyEmail} aria-label={`Copy email address ${siteContent.email}`}>
        <span data-fluid-cursor-native-ink>{siteContent.email}</span>
        <CopyIcon />
      </button>
      <span className="footer-email__status" role="status">{status === "copied" ? "Copied!" : status === "failed" ? "Select the email to copy it." : ""}</span>
    </div>
  );
}

export function ContactCta() {
  return (
    <section className="contact-cta" id="contact" aria-labelledby="footer-heading" data-no-reveal>
      <h2 className="footer-title" id="footer-heading">
        Tell me what you’re<br />working on
      </h2>
      <div className="footer-contact-row">
        <Link className="button button--primary button--red" to="/contact">
          <span className="liquid-button__surface">Start a conversation<ArrowRightIcon /></span>
        </Link>
        <FooterEmailCopy />
      </div>
    </section>
  );
}
