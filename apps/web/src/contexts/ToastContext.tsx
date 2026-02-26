import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  type: 'error' | 'info'
}

interface ToastContextValue {
  showToast: (message: string, type?: 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'error' | 'info' = 'error') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[360px]">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`flex items-start gap-2 px-4 py-3 rounded-md shadow-lg border text-[0.8125rem] animate-[fadeIn_0.15s_ease-out] ${
                toast.type === 'error'
                  ? 'bg-danger-surface border-danger-border text-danger'
                  : 'bg-surface border-border text-text'
              }`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                className="shrink-0 text-[0.75rem] opacity-60 hover:opacity-100 cursor-pointer"
                onClick={() => dismiss(toast.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
