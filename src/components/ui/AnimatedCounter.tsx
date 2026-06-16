"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/constants";

interface AnimatedCounterProps {
  value: number;
  currency?: string;
  duration?: number;
  className?: string;
  prefix?: string;
}

export function AnimatedCounter({
  value,
  currency = "INR",
  duration = 1200,
  className = "",
  prefix = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    const from = ref.current;
    const to = value;
    ref.current = to;

    if (from === to) {
      setDisplay(to);
      return;
    }

    startTime.current = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = from + (to - from) * eased;
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{formatCurrency(display, currency)}
    </span>
  );
}
