import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import "./Toast.css";

interface ToastSpec {
  id: number;
  message: string;
  tone: "default" | "error";
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

type ToastInput = Omit<ToastSpec, "id" | "duration" | "tone"> & {
  tone?: ToastSpec["tone"];
  duration?: number;
};

interface ToastApi {
  show: (spec: ToastInput) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastSpec | null>(null);

  const show = useCallback<ToastApi["show"]>((spec) => {
    setToast({
      id: Date.now(),
      duration: 5000,
      ...spec,
      tone: spec.tone ?? "default",
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.duration);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <div className={`toast toast--${toast.tone}`} role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}
