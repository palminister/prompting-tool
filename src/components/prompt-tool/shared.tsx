import { Check, X, type LucideIcon, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SidebarButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'group flex w-full items-start gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition',
        active
          ? 'border border-border bg-card text-foreground'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
      onClick={onClick}
      type='button'
    >
      <div className='flex min-w-0 items-start gap-3'>
        <Icon className='mt-0.5 size-4 shrink-0' />
        <div className='type-title-card min-w-0'>{label}</div>
      </div>
    </button>
  );
}

export function EmptyPanel({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className='flex min-h-96 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border bg-transparent px-6 py-10 text-center'>
      <div className='max-w-sm'>
        <div className='mb-3 inline-flex rounded-full border border-border bg-secondary px-3 py-2 text-muted-foreground'>
          <Icon className='size-4' />
        </div>
        <div className='type-kicker mb-2 text-muted-foreground'>
          {title}
        </div>
        <p className='type-body-muted text-muted-foreground'>{text}</p>
      </div>
    </div>
  );
}

export function ActionIconButton({
  active = false,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        'rounded-full border border-transparent p-2 text-muted-foreground transition hover:bg-secondary hover:text-accent-foreground',
        active &&
          'border-border bg-card text-foreground hover:bg-card hover:text-foreground',
      )}
      onClick={onClick}
      title={title}
      type='button'
    >
      {children}
    </button>
  );
}

export function ConfirmDeleteActions({
  armed,
  confirmLabel,
  onArm,
  onCancel,
  onConfirm,
}: {
  armed: boolean;
  confirmLabel: string;
  onArm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!armed) {
    return (
      <ActionIconButton onClick={onArm} title={confirmLabel}>
        <Trash2 className='size-4' />
      </ActionIconButton>
    );
  }

  return (
    <div className='flex items-center gap-1'>
      <Button
        onClick={onConfirm}
        size='xs'
        type='button'
        variant='destructive'
      >
        <Check className='size-3' />
        Confirm
      </Button>
      <Button onClick={onCancel} size='xs' type='button' variant='ghost'>
        <X className='size-3' />
        Cancel
      </Button>
    </div>
  );
}
