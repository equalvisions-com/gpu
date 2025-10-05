import { useEffect, useRef } from "react";

export function useHotKey(callback: () => void, key: string): void {
  const cbRef = useRef(callback);
  // Keep latest callback without re-registering the listener
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === key && (e.metaKey || e.ctrlKey)) {
        // e.preventDefault();
        cbRef.current?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [key]);
}
