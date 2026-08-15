import { useState } from "react";
import { Link } from "react-router";
import { audienceContent } from "~/content/portfolio";
import { siteContent } from "~/content/site";
import type { Audience } from "~/content/types";
import { ArrowDownIcon, ArrowUpRightIcon } from "./icons";

export function Hero() {
  const [selectedAudience, setSelectedAudience] = useState<Audience>("anyone");
  const selectedContent = audienceContent.find((item) => item.id === selectedAudience) ?? audienceContent[0];

  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero__primary">
        <div className="hero__copy">
          <p className="role-title">{siteContent.title}</p>
          <h1 id="hero-heading">{siteContent.headline}</h1>
          <p className="hero__statement">{siteContent.supportingStatement}</p>
          <div className="button-row">
            <a className="button button--primary" href="#selected-work">
              View selected work <ArrowDownIcon />
            </a>
            <Link className="button button--secondary" to="/about">
              About my experience
            </Link>
          </div>
        </div>
        <div className="depth-object" role="img" aria-label="Neutral layered graphic representing content, interface, and code">
          <span className="depth-object__circle" />
          <span className="depth-object__plane" />
          <strong>Content / UI / Code</strong>
        </div>
      </div>

      <div className="audience-control">
        <div className="audience-control__buttons" role="group" aria-label="Tailor the hero summary for">
          {audienceContent.map((audience) => (
            <button
              key={audience.id}
              type="button"
              aria-pressed={selectedAudience === audience.id}
              onClick={() => setSelectedAudience(audience.id)}
            >
              <span aria-hidden="true" />
              {audience.label}
            </button>
          ))}
        </div>
        <div className="audience-control__copy">
          <p aria-live="polite">{selectedContent.statement}</p>
          {selectedContent.evidenceHref?.startsWith("/") ? (
            <Link to={selectedContent.evidenceHref} className="text-link">
              {selectedContent.evidenceLabel} <ArrowUpRightIcon />
            </Link>
          ) : (
            <a href={selectedContent.evidenceHref} className="text-link">
              {selectedContent.evidenceLabel} <ArrowUpRightIcon />
            </a>
          )}
          <a href="/resume-placeholder.txt" target="_blank" rel="noreferrer" className="text-link text-link--muted">
            Résumé placeholder <ArrowUpRightIcon />
          </a>
        </div>
      </div>
    </section>
  );
}
