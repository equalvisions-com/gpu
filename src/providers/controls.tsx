"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";

interface ControlsContextType {
  open: boolean | null;
  setOpen: React.Dispatch<React.SetStateAction<boolean | null>>;
}

export const ControlsContext = createContext<ControlsContextType | null>(null);


export function ControlsProvider({
  children
}: {
  children: React.ReactNode;
}) {
  // CSS handles initial responsive state: hidden on mobile, visible on desktop
  // JavaScript starts with null to let CSS control initially, then overrides
  const [open, setOpen] = useState<boolean | null>(null);

  // Handle responsive behavior - useLayoutEffect to prevent visual flicker
  useLayoutEffect(() => {
    const updateState = () => {
      const isDesktop = window.innerWidth >= 640;
      setOpen(isDesktop);
    };

    // Set the correct state based on screen size
    updateState();

    window.addEventListener("resize", updateState);
    return () => window.removeEventListener("resize", updateState);
  }, []);

  return (
    <ControlsContext.Provider value={{ open, setOpen }}>
      <div
        // REMINDER: access the data-expanded state with tailwind via `group-data-[expanded=true]/controls:block`
        // In tailwindcss v4, we could even use `group-data-expanded/controls:block`
        className="group/controls"
        {...(open !== null && { 'data-expanded': open })}
      >
        {children}
      </div>
    </ControlsContext.Provider>
  );
}

export function useControls() {
  const context = useContext(ControlsContext);

  if (!context) {
    throw new Error("useControls must be used within a ControlsProvider");
  }

  return context as ControlsContextType;
}
