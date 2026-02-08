import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        planning: 'bg-secondary text-secondary-foreground',
        in_progress: 'bg-info/10 text-info',
        at_risk: 'bg-warning/10 text-warning',
        completed: 'bg-success/10 text-success',
        on_hold: 'bg-muted text-muted-foreground',
        todo: 'bg-secondary text-secondary-foreground',
        blocked: 'bg-destructive/10 text-destructive',
        pending: 'bg-secondary text-secondary-foreground',
        delayed: 'bg-warning/10 text-warning',
      },
    },
    defaultVariants: {
      variant: 'planning',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: string;
}

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  in_progress: 'In Progress',
  at_risk: 'At Risk',
  completed: 'Completed',
  on_hold: 'On Hold',
  todo: 'To Do',
  blocked: 'Blocked',
  pending: 'Pending',
  delayed: 'Delayed',
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <div
      className={cn(statusBadgeVariants({ variant: status as any }), className)}
      {...props}
    >
      {statusLabels[status] || status}
    </div>
  );
}
