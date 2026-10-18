"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** A key figure. Pulses once when the value changes after the first paint. */
export function Stat({
  value,
  className = "",
  children,
}: {
  value: string | number;
  className?: string;
  children?: ReactNode;
}) {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 760);
    return () => window.clearTimeout(id);
  }, [value]);

  return (
    <span className={`wm-stat ${pulse ? "wm-pulse" : ""} ${className}`.trim()}>
      {children ?? value}
    </span>
  );
}

export function Metric({
  label,
  value,
  suffix,
  className = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-[#f4ead7]/80 px-3 py-2.5 ring-1 ring-[#d9cbb3] ${className}`}>
      <p className="text-[10px] tracking-[0.16em] text-[#8d6b2e] uppercase">{label}</p>
      <p className="mt-1 font-display text-[1.7rem] leading-none text-[#1c1612]">
        <Stat value={value} />
        {suffix ? <span className="ml-0.5 text-base font-medium">{suffix}</span> : null}
      </p>
    </div>
  );
}
