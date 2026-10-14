import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Estados de erro e vazio com a mesma aparência em todas as telas.
// Carregamento usa o LoadingState.
export function ErrorPanel({ message, onRetry, className = "" }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 ${className}`}>
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function EmptyPanel({ title, description, action, className = "" }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-white/15 ${className}`}>
      <Inbox className="size-6 text-slate-400" aria-hidden="true" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
