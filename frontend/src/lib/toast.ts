/**
 * Toast utility - compatível com a API do sonner/react-hot-toast
 * Usa eventos customizados para comunicar com o ToastProvider
 */

type ToastType = "success" | "error" | "info";

function emit(message: string, type: ToastType) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("lmc-toast", { detail: { message, type } })
  );
}

export const toast = {
  success: (message: string) => emit(message, "success"),
  error: (message: string) => emit(message, "error"),
  info: (message: string) => emit(message, "info"),
};
