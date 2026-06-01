import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

export const metadata: Metadata = {
  title: "元器件库存管理",
  description: "电子元器件入库出库管理系统",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[var(--background)] antialiased noise-texture">
        <Navigation />
        <main className="main-content pb-20 md:pb-6 min-h-screen">
          {children}
        </main>
        <KeyboardShortcuts />
      </body>
    </html>
  );
}
