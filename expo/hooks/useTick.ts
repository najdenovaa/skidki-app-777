import { useEffect, useState } from "react";

/** Re-render at a fixed interval. Used by countdown timers. */
export function useTick(intervalMs: number = 1000): number {
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}
