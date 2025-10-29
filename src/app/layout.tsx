import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { SkipNavLink } from "@/components/skip-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Festival Connect | 학교 축제 운영 허브",
  description:
    "학생·부스·관리자 워크플로우를 한 곳에서 관리하는 모바일 전용 축제 플랫폼",
  metadataBase: new URL("https://festival.local"),
  openGraph: {
    title: "Festival Connect",
    description:
      "QR 포인트 지급부터 피드, 리더보드까지 한 번에 운영하는 학교 축제 플랫폼",
    url: "https://festival.local",
    siteName: "Festival Connect",
  },
  twitter: {
    card: "summary",
    title: "Festival Connect",
    description:
      "QR 포인트 지급부터 피드, 리더보드까지 한 번에 운영하는 학교 축제 플랫폼",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getSessionUser();

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <SkipNavLink />
        <SessionProvider user={currentUser}>{children}</SessionProvider>
      </body>
    </html>
  );
}
