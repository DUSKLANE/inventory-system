import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-[var(--background)] antialiased noise-texture">
        <ThemeProvider>
          <Navigation />
          <main className="main-content pb-20 md:pb-6 min-h-screen">
            {children}
          </main>
          <KeyboardShortcuts />
        </ThemeProvider>
      </body>
    </html>
  );
}
