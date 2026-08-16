import { useEffect, useState } from "react";

const COLOMBIA_TIME_ZONE = "America/Bogota";

function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

export function LocalTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const timer = window.setInterval(updateTime, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return <div className="local-time" aria-label="Local time loading">Time</div>;
  }

  const visitorTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const inColombia = visitorTimeZone === COLOMBIA_TIME_ZONE;

  return (
    <div className="local-time" aria-label={inColombia ? "Current time in Colombia" : "Visitor local time compared with Colombia"}>
      {inColombia ? (
        <span><small>Colombia</small><time dateTime={now.toISOString()}>{formatTime(now, COLOMBIA_TIME_ZONE)}</time></span>
      ) : (
        <>
          <span><small>Local</small><time dateTime={now.toISOString()}>{formatTime(now, visitorTimeZone)}</time></span>
          <span><small>Colombia</small><time dateTime={now.toISOString()}>{formatTime(now, COLOMBIA_TIME_ZONE)}</time></span>
        </>
      )}
    </div>
  );
}
