"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthStore } from "@/lib/auth-store";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Default to closed only on small mobile viewports
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // If on login page, don't show shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-300">Memuat Sistem POS &amp; ERP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f8fafc] flex text-slate-800 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Persistent Modern Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content body */}
      <div className={`flex-1 ${sidebarOpen ? "md:pl-52" : "pl-0"} flex flex-col h-full min-w-0 transition-all duration-300 overflow-hidden`}>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-1 sm:p-2 flex-1 w-full flex flex-col min-h-0 mx-auto overflow-hidden">
          {children}
        </main>
        {/* Modernized Clean Footer */}
        <footer className="py-1 px-3 text-[10px] text-slate-400 border-t border-slate-200/80 bg-white/80 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 shrink-0">
          <span>&copy; {new Date().getFullYear()} LAPAK POS &bull; Sistem Depo, POS, Inventori &amp; Akuntansi Terpadu</span>
          <span className="font-mono text-[9.5px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-1 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            POSTGRESQL CONNECTED
          </span>
        </footer>
      </div>
    </div>
  );
};
