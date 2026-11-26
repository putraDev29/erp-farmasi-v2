"use client";

import "./globals.css";
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5000,
          },
        },
      })
  );

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <title>ERP Farmasi & POS Ketoko 2.0</title>
        <meta name="description" content="Sistem Terpadu ERP, POS, Inventori & Akuntansi Farmasi" />
      </head>
      <body suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          <AppLayout>{children}</AppLayout>
        </QueryClientProvider>
      </body>
    </html>
  );
}
