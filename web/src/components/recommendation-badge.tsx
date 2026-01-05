'use client';

import { Badge } from '@/components/ui/badge';
import type { RecommendationType } from '@/types';

interface RecommendationBadgeProps {
    recommendation: RecommendationType;
}

const badgeConfig: Record<RecommendationType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    excellent: {
        label: 'Excellent',
        variant: 'default',
        className: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    },
    good: {
        label: 'Good',
        variant: 'default',
        className: 'bg-green-500 hover:bg-green-600 text-white',
    },
    consider: {
        label: 'Consider',
        variant: 'secondary',
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    },
    challenging: {
        label: 'Challenging',
        variant: 'secondary',
        className: 'bg-orange-500 hover:bg-orange-600 text-white',
    },
    avoid: {
        label: 'Avoid',
        variant: 'destructive',
        className: 'bg-red-500 hover:bg-red-600 text-white',
    },
    analysis_failed: {
        label: 'Failed',
        variant: 'outline',
        className: 'border-gray-400 text-gray-500',
    },
};

export function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
    const config = badgeConfig[recommendation] || badgeConfig.analysis_failed;

    return (
        <Badge variant={config.variant} className={config.className}>
            {config.label}
        </Badge>
    );
}
