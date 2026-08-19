import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { services, type Service } from "~/content/services";
import { ArrowUpRightIcon, CodeIcon, InterfaceIcon, SparkIcon } from "./icons";

function ServiceIcon({ service }: { service: Service }) {
  if (service.icon === "code") return <CodeIcon size={30} />;
  if (service.icon === "spark") return <SparkIcon size={30} />;
  return <InterfaceIcon size={30} />;
}

interface OpenService {
  service: Service;
  origin: DOMRect;
}

function ServicePanel({ openService, expanded, onClose }: { openService: OpenService; expanded: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const finalLeft = typeof window === "undefined" || window.innerWidth <= 1280 ? 0 : window.innerWidth / 12;
  const finalWidth = typeof window === "undefined" ? 1 : window.innerWidth - finalLeft;
  const finalHeight = typeof window === "undefined" ? 1 : window.innerHeight;
  const style = {
    "--service-x": `${openService.origin.left - finalLeft}px`,
    "--service-y": `${openService.origin.top}px`,
    "--service-scale-x": String(openService.origin.width / finalWidth),
    "--service-scale-y": String(openService.origin.height / finalHeight),
  } as CSSProperties;

  useEffect(() => {
    if (!expanded) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const panel = closeRef.current?.closest<HTMLElement>("[role='dialog']");
      const items = Array.from(panel?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? []);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded, onClose]);

  const service = openService.service;
  return (
    <div className={`service-panel${expanded ? " service-panel--expanded" : ""}`} style={style} role="dialog" aria-modal="true" aria-labelledby="service-panel-title">
      <div className="service-panel__visual" aria-hidden="true">
        <ServiceIcon service={service} />
        <span>{service.shortTitle}</span>
        <i /><i /><i />
      </div>
      <div className="service-panel__content">
        <p>What I do</p>
        <h2 id="service-panel-title">{service.title}</h2>
        <p>{service.summary}</p>
        <div className="service-panel__section">
          <h3>Possible deliverables</h3>
          <ul>{service.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="service-panel__section">
          <h3>Tools and methods</h3>
          <div className="service-tags">{service.tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
        </div>
        <div className="service-panel__section">
          <h3>Scope boundary</h3>
          <p>{service.boundary}</p>
        </div>
        <Link className="outlined-link" to="/contact">Discuss a project <ArrowUpRightIcon /></Link>
      </div>
      <button ref={closeRef} type="button" className="service-panel__close" onClick={onClose} aria-label="Close service details"><span aria-hidden="true">×</span></button>
    </div>
  );
}

export function ServiceExplorer() {
  const [openService, setOpenService] = useState<OpenService | null>(null);
  const [expanded, setExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const open = (service: Service, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setOpenService({ service, origin: trigger.getBoundingClientRect() });
    setExpanded(false);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setExpanded(true)));
  };

  const close = () => {
    setExpanded(false);
    closeTimer.current = window.setTimeout(() => {
      setOpenService(null);
      triggerRef.current?.focus();
      closeTimer.current = null;
    }, 540);
  };

  useEffect(() => {
    if (!openService) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [openService]);

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  return (
    <div className="service-explorer">
      {services.map((service, index) => (
        <button key={service.id} type="button" className="service-explorer__item" onClick={(event) => open(service, event.currentTarget)}>
          <span>0{index + 1}</span>
          <span className="service-explorer__icon"><ServiceIcon service={service} /></span>
          <strong>{service.title}</strong>
          <span>{service.summary}</span>
          <span className="service-explorer__action">Open details <ArrowUpRightIcon /></span>
        </button>
      ))}
      {openService && typeof document !== "undefined" ? createPortal(<ServicePanel openService={openService} expanded={expanded} onClose={close} />, document.body) : null}
    </div>
  );
}
