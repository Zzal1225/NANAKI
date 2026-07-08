import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[100] flex items-end justify-center sm:items-center'>
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onClose}
      />
      <div className='relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-surface-raised sm:rounded-3xl'>
        <div className='flex items-center justify-between border-b border-border px-5 py-4'>
          <h2 className='text-lg font-bold'>{title}</h2>
          <button
            onClick={onClose}
            className='rounded-full p-1.5 text-text-muted hover:bg-surface-overlay hover:text-text-primary'
          >
            <X size={20} />
          </button>
        </div>
        <div className='overflow-y-auto px-5 py-4'>{children}</div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className='flex flex-col gap-1.5'>
      <span className='text-sm text-text-secondary'>{label}</span>
      {children}
    </label>
  );
}

export const fieldBase =
  'rounded-xl border border-border bg-surface text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent';

export const inputClass = `w-full px-3 py-2.5 placeholder:text-text-muted ${fieldBase}`;

export const inputInlineClass = `min-w-0 flex-1 px-2.5 py-2 placeholder:text-text-muted ${fieldBase}`;

export const selectClass = inputClass;

export const selectInlineClass = `shrink-0 px-2 py-2 ${fieldBase}`;

export const btnPrimary =
  'w-full rounded-xl bg-accent py-3 text-sm font-semibold text-surface hover:bg-accent-dim active:scale-[0.98] transition-all';

export const btnSecondary =
  'w-full rounded-xl border border-border bg-surface-overlay py-3 text-sm font-medium text-text-primary hover:border-accent/50 active:scale-[0.98] transition-all';

export const btnDanger =
  'rounded-xl border border-danger/30 px-4 py-2 text-sm text-danger hover:bg-danger/10';
