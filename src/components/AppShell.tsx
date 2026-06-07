"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Navigation from "./Navigation";
import KeyboardShortcuts from "./KeyboardShortcuts";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/me").then((res) => {
      if (res.status === 401) {
        router.replace("/login");
      }
    });
  }, [pathname, router]);

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
