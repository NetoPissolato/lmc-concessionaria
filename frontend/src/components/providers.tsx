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
          staleTime: 1000 * 5,  // 5 segundos — dados refrescados rapidamente após mutations
          retry: 1,
          refetchOnWindowFocus: true,   // recarrega ao voltar para a aba
          refetchOnMount: "always",     // SEMPRE refetch ao montar, independente de staleTime
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
