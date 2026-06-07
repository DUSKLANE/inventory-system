"use client";

import { usePathname } from "next/navigation";
import Navigation from "./Navigation";
import KeyboardShortcuts from "./KeyboardShortcuts";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      <Navigation />
      <main className="main-content pb-20 md:pb-6 min-h-screen">
        {children}
      </main>
      <KeyboardShortcuts />
    </>
  );
}
