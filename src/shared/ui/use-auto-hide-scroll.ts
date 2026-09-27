"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Adds/removes `.is-scrolling` on a scrollable element so CSS can
 * fade the scrollbar in during scroll and out after a delay.
 *
 * Usage: attach the returned ref to a container that already has
 * the `.autohide-scroll` CSS class.
 */
export function useAutoHideScroll<T extends HTMLElement = HTMLDivElement>(hideDelay = 1200) {
  const ref = useRef<T>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      el.classList.add("is-scrolling");
      clearTimer();
      timerRef.current = setTimeout(() => {
        el.classList.remove("is-scrolling");
      }, hideDelay);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimer();
    };
  }, [hideDelay, clearTimer]);

  return ref;
}
