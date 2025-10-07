"use client";

import * as React from "react";

export function useEphemeralNotice(durationMs: number = 1600) {
  const [message, setMessage] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    setIsOpen(false);
    setMessage(null);
  }, []);

  const show = React.useCallback((nextMessage: string) => {
    // clear any previous timer to avoid overlapping dismissals
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage(nextMessage);
    setIsOpen(true);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setMessage(null);
      timeoutRef.current = null;
    }, durationMs);
  }, [durationMs]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return { message, isOpen, show, hide } as const;
}


