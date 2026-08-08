"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,                  // sempre stale → refetch imediato após invalidação
            gcTime: 1000 * 60 * 10,        // 10 min no cache (sem revalidar a cada mount)
            retry: 1,
            refetchOnWindowFocus: true,    // recarrega ao voltar para a aba
            refetchOnMount: true,          // refetch ao montar se stale (staleTime=0 → sempre)
            refetchOnReconnect: true,      // refetch ao reconectar internet
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
