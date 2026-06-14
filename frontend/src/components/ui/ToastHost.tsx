import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import {
  LEDGER_TOAST_EVENT,
} from "../../hooks/useToast";
import type { ToastPayload, ToastTone } from "../../hooks/useToast";

type ToastItem = Required<ToastPayload>;

function getToastIcon(tone: ToastTone) {
  if (tone === "success") return CheckCircle2;
  if (tone === "error") return XCircle;
  if (tone === "warning") return AlertTriangle;
  return Info;
}

function getToastClasses(tone: ToastTone) {
  if (tone === "success") {
    return "border-ledger-green/20 bg-ledger-green/10 text-ledger-green";
  }

  if (tone === "error") {
    return "border-ledger-red/20 bg-ledger-red/10 text-ledger-red";
  }

  if (tone === "warning") {
    return "border-ledger-amber/20 bg-ledger-amber/10 text-ledger-amber";
  }

  return "border-ledger-blue/20 bg-ledger-blue/10 text-ledger-blue";
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<ToastPayload>;

      const toast: ToastItem = {
        id: customEvent.detail.id ?? crypto.randomUUID(),
        title: customEvent.detail.title,
        description: customEvent.detail.description ?? "",
        tone: customEvent.detail.tone ?? "info",
        duration: customEvent.detail.duration ?? 3500,
      };

      setToasts((currentToasts) => [toast, ...currentToasts].slice(0, 4));

      window.setTimeout(() => {
        setToasts((currentToasts) =>
          currentToasts.filter((item) => item.id !== toast.id),
        );
      }, toast.duration);
    }

    window.addEventListener(LEDGER_TOAST_EVENT, handleToast);

    return () => {
      window.removeEventListener(LEDGER_TOAST_EVENT, handleToast);
    };
  }, []);

  function dismissToast(toastId: string) {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[999] flex w-[calc(100%-2rem)] max-w-md flex-col gap-3">
      {toasts.map((toast) => {
        const Icon = getToastIcon(toast.tone);

        return (
          <div
            key={toast.id}
            className="pointer-events-auto glass-panel ring-gradient rounded-3xl p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-2xl border p-2.5 ${getToastClasses(
                  toast.tone,
                )}`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold text-white">
                  {toast.title}
                </p>

                {toast.description ? (
                  <p className="mt-1 text-sm leading-6 text-ledger-muted">
                    {toast.description}
                  </p>
                ) : null}
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="rounded-xl p-2 text-ledger-muted transition hover:bg-white/5 hover:text-white"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
