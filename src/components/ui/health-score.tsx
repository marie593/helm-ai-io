import { cn } from '@/lib/utils';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function HealthScore({ score, size = 'md', showLabel = false }: HealthScoreProps) {
  const getColorClass = (score: number) => {
    if (score >= 80) return 'bg-health-excellent';
    if (score >= 60) return 'bg-health-good';
    if (score >= 40) return 'bg-health-warning';
    return 'bg-health-critical';
  };

  const getLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'At Risk';
    return 'Critical';
  };

  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white',
          sizeClasses[size],
          getColorClass(score)
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{getLabel(score)}</span>
      )}
    </div>
  );
}
