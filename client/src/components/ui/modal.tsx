import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          {...(!description && { "aria-describedby": undefined })}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border p-6 shadow-2xl outline-none",
            // light
            "border-slate-200 bg-white",
            // dark
            "dark:border-white/10 dark:bg-slate-900",
            className
          )}
        >
          <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
