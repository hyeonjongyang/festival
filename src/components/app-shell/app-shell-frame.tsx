"use client";

import { useCallback, useState } from "react";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { AppBottomNav } from "@/components/app-shell/app-bottom-nav";
import { ProfileModal } from "@/components/profile/profile-modal";

type AppShellFrameProps = {
  children: React.ReactNode;
};

export function AppShellFrame({ children }: AppShellFrameProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsProfileOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppTopBar onProfileClick={handleOpen} />
      <main id="main-content" className="flex-1 px-4 pb-24 pt-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
      <AppBottomNav />
      <ProfileModal open={isProfileOpen} onClose={handleClose} />
    </div>
  );
}
