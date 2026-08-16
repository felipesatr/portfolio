import { useState } from "react";
import { Link } from "react-router";
import { audienceContent } from "~/content/portfolio";
import { siteContent } from "~/content/site";
import type { Audience } from "~/content/types";
import { ArrowDownIcon } from "./icons";
import { RevealText, RevealTitle } from "./motion-reveal";

function headlineLines(headline: string) {
  return headline.match(/[^.!?]+[.!?]?/g)?.map((line) => line.trim()).filter(Boolean) ?? [headline];
}

export function Hero() {
  const [selectedAudience, setSelectedAudience] = useState<Audience>("anyone");
  const selectedContent = audienceContent.find((item) => item.id === selectedAudience) ?? audienceContent[0];

  return (
    <section id="hero" className="hero" aria-labelledby="hero-heading">
      <div className="hero__primary">
        <div className="hero__copy">
          <div className="hero-audience" role="group" aria-label="Choose who the introduction is for">
            {audienceContent.map((audience) => (
              <button
                key={audience.id}
                type="button"
                aria-pressed={selectedAudience === audience.id}
                onClick={() => setSelectedAudience(audience.id)}
              >
                {audience.label}
              </button>
            ))}
          </div>
          <RevealTitle
            key={selectedAudience}
            as="h1"
            id="hero-heading"
            live="polite"
            lines={headlineLines(selectedContent.headline)}
          />
          <RevealText className="hero__statement" delay={120}>{siteContent.supportingStatement}</RevealText>
          <div className="button-row">
            <a className="button button--primary" href="#selected-work">
              View selected work <ArrowDownIcon />
            </a>
            <Link className="button button--secondary" to="/about">
              About my experience
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
