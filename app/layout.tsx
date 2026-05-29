import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthGate } from "@/components/auth-gate";
import { BRAND } from "@/lib/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: BRAND.name,
  description: `${BRAND.name} は QR を読むだけで 役割を決めて ステップに沿って 避難所を 立ち上げる 体験キャンプ用アプリ。`,
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: BRAND.short,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F97316",
};

// ふりがな OFF を選んでいたユーザーが、ページ遷移するたびに ruby が一瞬
// 見えてから消える FOUC を防ぐためのスクリプト。 React が hydrate する前
// (paint より前) に localStorage を読んで html[data-furigana] を確定させる。
// try/catch で SSR / プライベートモード等の失敗時もアプリは止めない。
const NO_FOUC_SCRIPT = `(function(){try{var v=localStorage.getItem('hinanjo:furigana');if(v==='off'){document.documentElement.setAttribute('data-furigana','off');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
