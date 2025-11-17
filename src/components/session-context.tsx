"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth/get-session-user";

type SessionState = SessionUser | null;

type SessionContextValue = {
  session: SessionState;
  setSession: (next: SessionState) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession: SessionState;
}) {
  const [session, setSession] = useState<SessionState>(initialSession);

  const value = useMemo<SessionContextValue>(() => ({ session, setSession }), [session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
