export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastPayload = {
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

export const LEDGER_TOAST_EVENT = "ledgeros:toast";

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emitToast(payload: ToastPayload) {
  const event = new CustomEvent<ToastPayload>(LEDGER_TOAST_EVENT, {
    detail: {
      ...payload,
      id: payload.id ?? createToastId(),
      tone: payload.tone ?? "info",
      duration: payload.duration ?? 3500,
    },
  });

  window.dispatchEvent(event);
}

export function useToast() {
  function success(title: string, description?: string) {
    emitToast({
      title,
      description,
      tone: "success",
    });
  }

  function error(title: string, description?: string) {
    emitToast({
      title,
      description,
      tone: "error",
    });
  }

  function warning(title: string, description?: string) {
    emitToast({
      title,
      description,
      tone: "warning",
    });
  }

  function info(title: string, description?: string) {
    emitToast({
      title,
      description,
      tone: "info",
    });
  }

  return {
    toast: emitToast,
    success,
    error,
    warning,
    info,
  };
}