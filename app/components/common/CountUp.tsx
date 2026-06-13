"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, animate } from "motion/react";

/**
 * Animates a number from its previous value to `value` whenever it changes.
 */
export default function CountUp({
  value,
  decimals = 0,
  duration = 0.6,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const mv = useMotionValue(value);
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, mv]);

  return <>{display.toFixed(decimals)}</>;
}
