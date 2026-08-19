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
    return <div className="local-time" aria-label="Bogota time loading"><span><time>--:--</time><small>Bogota, Colombia</small></span></div>;
  }

  return (
    <div className="local-time" aria-label="Current time in Bogota, Colombia">
      <span>
        <time dateTime={now.toISOString()}>{formatTime(now, COLOMBIA_TIME_ZONE)}</time>
        <small>Bogota, Colombia</small>
      </span>
    </div>
  );
}
