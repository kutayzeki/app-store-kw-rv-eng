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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecommendationBadge } from './recommendation-badge';
import { ArrowUpDown, Search } from 'lucide-react';
import type { KeywordAnalysis } from '@/types';

interface KeywordTableProps {
    keywords: KeywordAnalysis[];
}

type SortField = 'keyword' | 'traffic' | 'difficulty' | 'opportunity' | 'recommendation';
type SortDirection = 'asc' | 'desc';

export function KeywordTable({ keywords }: KeywordTableProps) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('opportunity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filterRecommendation, setFilterRecommendation] = useState<string>('all');

    const filteredAndSorted = useMemo(() => {
        let result = [...keywords];

        // Filter by search
        if (search) {
            result = result.filter((k) =>
                k.keyword.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Filter by recommendation
        if (filterRecommendation !== 'all') {
            result = result.filter((k) => k.recommendation === filterRecommendation);
        }

        // Sort
        result.sort((a, b) => {
            let aVal: string | number | null = a[sortField];
            let bVal: string | number | null = b[sortField];

            // Handle null values
            if (aVal === null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
            if (bVal === null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

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
    }, [keywords, search, sortField, sortDirection, filterRecommendation]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const recommendationFilters = [
        { value: 'all', label: 'All' },
        { value: 'excellent', label: 'Excellent' },
        { value: 'good', label: 'Good' },
        { value: 'consider', label: 'Consider' },
        { value: 'challenging', label: 'Challenging' },
        { value: 'avoid', label: 'Avoid' },
    ];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search keywords..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {recommendationFilters.map((filter) => (
                        <Button
                            key={filter.value}
                            variant={filterRecommendation === filter.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterRecommendation(filter.value)}
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground">
                Showing {filteredAndSorted.length} of {keywords.length} keywords
            </p>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('keyword')}
                                    className="-ml-3"
                                >
                                    Keyword
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('traffic')}
                                >
                                    Traffic
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('difficulty')}
                                >
                                    Difficulty
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('opportunity')}
                                >
                                    Opportunity
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">Recommendation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No keywords found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSorted.map((keyword) => (
                                <TableRow key={keyword.id}>
                                    <TableCell className="font-medium">{keyword.keyword}</TableCell>
                                    <TableCell className="text-center">
                                        {keyword.traffic !== null ? (
                                            <span className="font-mono">{keyword.traffic}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {keyword.difficulty !== null ? (
                                            <span className="font-mono">{keyword.difficulty}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {keyword.opportunity !== null ? (
                                            <span className="font-mono font-bold">{keyword.opportunity}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <RecommendationBadge recommendation={keyword.recommendation} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
