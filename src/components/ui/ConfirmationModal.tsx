import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'danger' | 'warning' | 'info';
type ConfirmVariant = 'default' | 'danger';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Color/icon for the leading badge. Defaults to "danger" (red triangle). */
  tone?: Tone;
  /** Style of the confirm button. Defaults to "danger". */
  confirmVariant?: ConfirmVariant;
  /** Disable the confirm button (e.g. while a parent action is in flight). */
  busy?: boolean;
}

const toneStyles: Record<Tone, { wrap: string; icon: string; Icon: React.ComponentType<{ className?: string }> }> = {
  danger: {
    wrap: 'bg-red-50 border-red-100',
    icon: 'text-red-600',
    Icon: AlertTriangle,
  },
  warning: {
    wrap: 'bg-amber-50 border-amber-100',
    icon: 'text-amber-600',
    Icon: AlertTriangle,
  },
  info: {
    wrap: 'bg-brand-50 border-brand-200/60',
    icon: 'text-brand-600',
    Icon: Info,
  },
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'danger',
  confirmVariant = 'danger',
  busy = false,
}) => {
  const t = toneStyles[tone];
  const Icon = t.Icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex items-start gap-3 mb-6">
        <div className={cn('p-2 rounded-full border shrink-0', t.wrap)}>
          <Icon className={cn('w-4 h-4', t.icon)} />
        </div>
        <div className="text-sm text-neutral-600 mt-1.5 min-w-0">{message}</div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          disabled={busy}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
