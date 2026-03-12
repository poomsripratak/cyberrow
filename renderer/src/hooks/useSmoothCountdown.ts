import { useState, useEffect, useRef } from 'react';

/**
 * Smoothly interpolates a backend countdown value between updates.
 * Ticks at 100ms locally so the display doesn't jump when backend sends
 * infrequent updates (e.g. once per second).
 *
 * @param backendValue - The latest value from the backend
 * @param resetKey - When this changes, the display snaps to backendValue (use for phase/round changes)
 */
export function useSmoothCountdown(backendValue: number, resetKey?: string | number): number {
  const [display, setDisplay] = useState(backendValue);
  const lastBackend = useRef(backendValue);
  const lastTs = useRef(Date.now());

  useEffect(() => {
    lastBackend.current = backendValue;
    lastTs.current = Date.now();
    setDisplay(backendValue);
  }, [backendValue, resetKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (Date.now() - lastTs.current) / 1000;
      setDisplay(Math.max(0, lastBackend.current - elapsed));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return display;
}
