"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────
export type WSStatus = "connecting" | "connected" | "disconnected";

// ─── Event → Query Keys mapping ───────────────────────────────────────────────
// When an event arrives, these keys are invalidated → instant UI update
const EVENT_INVALIDATIONS: Record<string, string[]> = {
  sale_created: [
    "sales", "sales-carros-page", "sales-motos-page",
    "dashboard", "financial-entries", "financial-summary",
    "financial-chart", "vehicles", "vehicles-carros",
    "vehicles-motos", "customers", "lucratividade-mes",
    "pending-sales",  // atualiza o sino de notificações
  ],
  sale_updated: [
    "sales", "sales-carros-page", "sales-motos-page",
    "dashboard", "financial-entries", "financial-summary",
    "financial-chart", "vehicles", "vehicles-carros",
    "vehicles-motos", "lucratividade-mes",
    "pending-sales",  // atualiza o sino de notificações
  ],
  vehicle_updated: [
    "vehicles", "vehicles-carros", "vehicles-motos", "dashboard",
  ],
  financial_entry: [
    "financial-entries", "financial-summary", "financial-chart",
    "dashboard", "lucratividade-mes",
  ],
  customer_updated: ["customers", "customers-search", "dashboard"],
};

// ─── WebSocket URL ─────────────────────────────────────────────────────────────
function getWsUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return apiUrl
    .replace(/^https/, "wss")
    .replace(/^http/, "ws")
    .replace("/api/v1", "");
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWebSocket(): { status: WSStatus } {
  const [status, setStatus] = useState<WSStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const retryCount = useRef(0);
  const mountedRef = useRef(true);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    // Get token from localStorage (client-side only)
    const token = typeof window !== "undefined"
      ? localStorage.getItem("lmc_access_token")
      : null;

    if (!token) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    const wsUrl = `${getWsUrl()}/ws?token=${token}`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setStatus("disconnected");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus("connected");
      retryCount.current = 0;

      // Ping every 25s to keep connection alive through load balancers
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, 25_000);
    };

    ws.onmessage = (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const { event } = JSON.parse(e.data as string) as { event: string };
        const keys = EVENT_INVALIDATIONS[event];
        if (keys) {
          keys.forEach((k) =>
            queryClient.invalidateQueries({ queryKey: [k] })
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      clearInterval(pingRef.current);
      wsRef.current = null;
      setStatus("disconnected");

      // Exponential backoff: 1s → 2s → 4s → 8s … max 30s
      const delay = Math.min(1_000 * 2 ** retryCount.current, 30_000);
      retryCount.current = Math.min(retryCount.current + 1, 5);
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, which handles reconnect
      ws.close();
    };
  }, [queryClient]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(retryRef.current);
      clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status };
}
