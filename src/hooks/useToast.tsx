import React, { createContext, useContext, useState, useCallback } from "react";
import * as Lucide from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warn";
export interface ToastItem { id: string; type: ToastType; message: string; exiting?: boolean; }
interface ToastAPI {
  success: (msg: string, ms?: number) => void;
  error:   (msg: string, ms?: number) => void;
  info:    (msg: string, ms?: number) => void;
  warn:    (msg: string, ms?: number) => void;
}

const ToastContext = createContext<ToastAPI>({ success:()=>{}, error:()=>{}, info:()=>{}, warn:()=>{} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 220);
  }, []);

  const add = useCallback((type: ToastType, message: string, ms = 4000) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const toast: ToastAPI = {
    success: (m, ms) => add("success", m, ms),
    error:   (m, ms) => add("error",   m, ms ?? 6000),
    info:    (m, ms) => add("info",    m, ms),
    warn:    (m, ms) => add("warn",    m, ms ?? 5000),
  };

  const icons = {
    success: <Lucide.CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />,
    error:   <Lucide.XCircle      className="w-4 h-4 shrink-0 text-rose-400" />,
    info:    <Lucide.Info         className="w-4 h-4 shrink-0 text-sky-400" />,
    warn:    <Lucide.AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />,
  };
  const colors = {
    success: "bg-emerald-950/90 border-emerald-700/60 text-emerald-100",
    error:   "bg-rose-950/90   border-rose-700/60   text-rose-100",
    info:    "bg-sky-950/90    border-sky-700/60    text-sky-100",
    warn:    "bg-amber-950/90  border-amber-700/60  text-amber-100",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`toast-item${t.exiting ? " toast-exit" : ""} pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl text-xs font-semibold ${colors[t.type]}`}>
            {icons[t.type]}
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
              <Lucide.X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastAPI {
  return useContext(ToastContext);
}
