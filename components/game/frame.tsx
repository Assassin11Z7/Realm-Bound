"use client";

import { createContext, useContext, useState } from "react";

const FrameContext = createContext<HTMLElement | null>(null);

export function useFrame() {
  return useContext(FrameContext);
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <div className="realm-night flex min-h-dvh justify-center sm:items-center sm:p-6">
      <FrameContext.Provider value={node}>
        <div
          ref={setNode}
          className="parchment-grain relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden sm:h-[min(900px,calc(100dvh-3rem))] sm:rounded-[2rem] sm:shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:ring-1 sm:ring-[#3a2e22]"
          style={{ transform: "translateZ(0)" }}
        >
          {children}
        </div>
      </FrameContext.Provider>
    </div>
  );
}
