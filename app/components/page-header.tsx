import type { ReactNode } from "react";

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
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {aside ? <div className="page-header__aside">{aside}</div> : null}
    </header>
  );
}
