'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import type { AnalysisSummary } from '@/types';

interface StatsCardsProps {
    summary: AnalysisSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
    const stats = [
        {
            title: 'Total Keywords',
            value: summary.total,
            icon: Target,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Excellent',
            value: summary.excellent,
            icon: Sparkles,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            title: 'Good',
            value: summary.good,
            icon: TrendingUp,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        {
            title: 'Consider',
            value: summary.consider,
            icon: Target,
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10',
        },
        {
            title: 'Challenging',
            value: summary.challenging,
            icon: AlertTriangle,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
        },
        {
            title: 'Avoid',
            value: summary.avoid,
            icon: XCircle,
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat) => (
                <Card key={stat.title} className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {stat.title}
                        </CardTitle>
                        <div className={`p-2 rounded-full ${stat.bgColor}`}>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
