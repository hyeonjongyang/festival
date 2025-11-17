import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { SessionProvider } from "@/components/session-context";
import { SkipLink } from "@/components/a11y/skip-link";
import { AppChrome } from "@/components/chrome/app-chrome";

const heading = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

const body = IBM_Plex_Sans_KR({
  subsets: ["latin", "korean"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Festival Connect",
  description: "학생 · 부스 · 운영팀을 위한 모바일 축제 운영 허브",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionUser();

  return (
    <html lang="ko" className={`${heading.variable} ${body.variable}`}>
      <body>
        <SessionProvider initialSession={session}>
          <SkipLink />
          <AppChrome>{children}</AppChrome>
        </SessionProvider>
      </body>
    </html>
  );
}
