import type { ReactNode } from "react";
import { RevealText, RevealTitle } from "./motion-reveal";

interface PageHeaderProps {
  title: string;
  intro: string;
  eyebrow?: string;
  aside?: ReactNode;
}

export function PageHeader({ title, intro, eyebrow, aside }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="role-title">{eyebrow}</p> : null}
        <RevealTitle as="h1" lines={[title]} />
        <RevealText delay={100}>{intro}</RevealText>
      </div>
      {aside ? <div className="page-header__aside">{aside}</div> : null}
    </header>
  );
}
