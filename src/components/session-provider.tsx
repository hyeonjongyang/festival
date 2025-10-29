"use client";

import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/auth/get-session-user";

type SessionContextValue = {
  user: SessionUser;
};

const SessionContext = createContext<SessionContextValue>({
  user: null,
});

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ user }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionUser() {
  return useContext(SessionContext).user;
}
