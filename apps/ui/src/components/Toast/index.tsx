// apps/ui/src/components/Toast/index.tsx
// Dumb, reusable toast primitive (packages/ui-kit is a Phase-0 empty
// scaffold with no JSX build pipeline wired yet — this stays app-local per
// CODING_STANDARDS.md §4 until ui-kit is ready to host web components).
// No API/domain knowledge here — see apps/ui/src/hooks/use-api-error-toast.ts
// for the API-error-shape mapping that builds on top of this.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastRecord {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  show: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 5000;

// Semantic color tokens from docs/FAS_ERP_DESIGN_SYSTEM.md §3 — same tokens
// StatusBadge-style widgets use, so a toast and a status badge for the same
// outcome always agree visually.
const VARIANT_STYLES: Record<ToastVariant, string> = {
  success:
    "border-success-500/20 bg-success-500/10 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400",
  error:
    "border-error-500/20 bg-error-500/10 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400",
  warning:
    "border-warning-500/20 bg-warning-500/10 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400",
  info: "border-brand-500/20 bg-brand-500/10 text-brand-700 dark:border-brand-400/30 dark:bg-brand-400/15 dark:text-brand-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, variant, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      // Mobile-first: full-width stack pinned above the safe area on small
      // screens; a fixed top-right column from `sm:` up. Never a fixed-px
      // width that could overflow a 375px viewport.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 p-4 sm:inset-x-auto sm:top-0 sm:right-0 sm:bottom-auto sm:w-full sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-theme-sm shadow-theme-lg ${VARIANT_STYLES[toast.variant]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            // 44x44px minimum tap target (§ Responsive standard) even
            // though the glyph itself is small — padding does the work.
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-current/70 hover:text-current"
          >
            <span aria-hidden>&times;</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast(): {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
} {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  const { show } = context;
  return useMemo(
    () => ({
      success: (message: string) => show("success", message),
      error: (message: string) => show("error", message),
      warning: (message: string) => show("warning", message),
      info: (message: string) => show("info", message),
    }),
    [show],
  );
}
