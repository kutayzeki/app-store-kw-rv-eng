'use client';

import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Trash2, ArrowUpDown, Sparkles, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AppWithStats } from '@/types';

interface AppsTableProps {
    apps: AppWithStats[];
    loading?: boolean;
    onViewApp: (app: AppWithStats) => void;
    onDeleteApp: (appId: number) => void;
}

type SortField = 'title' | 'analyzedAt' | 'totalKeywords' | 'excellentCount';
type SortDirection = 'asc' | 'desc';

export function AppsTable({ apps, loading, onViewApp, onDeleteApp }: AppsTableProps) {
    const [sortField, setSortField] = useState<SortField>('analyzedAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const sortedApps = useMemo(() => {
        const result = [...apps];
        result.sort((a, b) => {
            let aVal: string | number = a[sortField];
            let bVal: string | number = b[sortField];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }

            return sortDirection === 'asc'
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });
        return result;
    }, [apps, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    if (loading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>App</TableHead>
                            <TableHead className="text-center">Keywords</TableHead>
                            <TableHead className="text-center">Top Opportunities</TableHead>
                            <TableHead className="text-center">Analyzed</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[1, 2, 3].map((i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (apps.length === 0) {
        return (
            <div className="rounded-md border p-12 text-center">
                <p className="text-muted-foreground mb-2">No apps analyzed yet</p>
                <p className="text-sm text-muted-foreground">
                    Add your first app to start analyzing keywords
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('title')}
                                className="-ml-3"
                            >
                                App
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('totalKeywords')}
                            >
                                Keywords
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('excellentCount')}
                            >
                                Top Opportunities
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSort('analyzedAt')}
                            >
                                Analyzed
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedApps.map((app) => {
                        const topCount = app.excellentCount + app.goodCount;
                        return (
                            <TableRow
                                key={app.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => onViewApp(app)}
                            >
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{app.title}</p>
                                        <div className="flex gap-1 mt-1">
                                            {Array.isArray(app.genres) && app.genres.slice(0, 2).map((genre) => (
                                                <Badge key={genre} variant="outline" className="text-xs">
                                                    {genre}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-mono font-medium">{app.totalKeywords}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {app.excellentCount > 0 && (
                                            <Badge className="bg-emerald-500 hover:bg-emerald-600">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                {app.excellentCount}
                                            </Badge>
                                        )}
                                        {app.goodCount > 0 && (
                                            <Badge className="bg-green-500 hover:bg-green-600">
                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                {app.goodCount}
                                            </Badge>
                                        )}
                                        {topCount === 0 && (
                                            <span className="text-muted-foreground text-sm">None</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground text-sm">
                                    {formatDistanceToNow(new Date(app.analyzedAt), { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onViewApp(app)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => onDeleteApp(app.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
