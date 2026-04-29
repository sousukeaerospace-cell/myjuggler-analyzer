import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "マイジャグラーV 設定推定",
  description: "D-STATION前橋ガーデン店 マイジャグラーV リアルタイム設定推定",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ジャグラー解析",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="bg-gray-950">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${geist.className} bg-gray-950 text-white antialiased`}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
