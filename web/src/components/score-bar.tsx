'use client';

import { cn } from '@/lib/utils';

interface ScoreBarProps {
    value: number | null;
    maxValue?: number;
    type: 'popularity' | 'difficulty';
    showValue?: boolean;
}

export function ScoreBar({ value, maxValue = 100, type, showValue = true }: ScoreBarProps) {
    if (value === null) {
        return <span className="text-muted-foreground text-sm">-</span>;
    }

    const percentage = Math.min((value / maxValue) * 100, 100);

    // Color gradients based on type
    const getColor = () => {
        if (type === 'popularity') {
            // Green to yellow for popularity (higher is better)
            if (percentage >= 60) return 'bg-gradient-to-r from-green-500 to-green-400';
            if (percentage >= 30) return 'bg-gradient-to-r from-yellow-500 to-yellow-400';
            return 'bg-gradient-to-r from-orange-500 to-orange-400';
        } else {
            // Red gradient for difficulty (lower is better)
            if (percentage >= 60) return 'bg-gradient-to-r from-red-600 to-red-500';
            if (percentage >= 30) return 'bg-gradient-to-r from-red-500 to-orange-500';
            return 'bg-gradient-to-r from-orange-400 to-yellow-500';
        }
    };

    return (
        <div className="flex items-center gap-2">
            {showValue && (
                <span className="text-sm font-medium w-8 text-right">{value}</span>
            )}
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[60px]">
                <div
                    className={cn('h-full rounded-full transition-all', getColor())}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

interface OpportunityScoreProps {
    value: number | null;
    change?: number;
}

export function OpportunityScore({ value, change }: OpportunityScoreProps) {
    if (value === null) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <div className="flex items-center gap-1">
            <span className="font-medium">{value}</span>
            {change !== undefined && change !== 0 && (
                <span className={cn(
                    'text-xs',
                    change > 0 ? 'text-green-500' : 'text-red-500'
                )}>
                    {change > 0 ? `+${change}` : change}
                </span>
            )}
        </div>
    );
}
