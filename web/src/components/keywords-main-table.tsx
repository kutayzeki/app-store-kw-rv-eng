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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScoreBar, OpportunityScore } from './score-bar';
import { RecommendationBadge } from './recommendation-badge';
import {
    ArrowUpDown,
    Search,
    Plus,
    Sparkles,
    StickyNote,
    ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { KeywordAnalysis } from '@/types';

interface KeywordsMainTableProps {
    keywords: KeywordAnalysis[];
    appTitle?: string;
    loading?: boolean;
}

type SortField = 'keyword' | 'traffic' | 'difficulty' | 'opportunity' | 'analyzedAt';
type SortDirection = 'asc' | 'desc';

export function KeywordsMainTable({ keywords, appTitle, loading }: KeywordsMainTableProps) {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState<SortField>('opportunity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filterRecommendation, setFilterRecommendation] = useState<string>('all');

    const filteredAndSorted = useMemo(() => {
        let result = [...keywords];

        if (search) {
            result = result.filter((k) =>
                k.keyword.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (filterRecommendation !== 'all') {
            result = result.filter((k) => k.recommendation === filterRecommendation);
        }

        result.sort((a, b) => {
            let aVal: string | number | null = a[sortField];
            let bVal: string | number | null = b[sortField];

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

    // Count suggestions (excellent + good)
    const suggestionsCount = keywords.filter(
        k => k.recommendation === 'excellent' || k.recommendation === 'good'
    ).length;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-muted-foreground">Loading keywords...</div>
            </div>
        );
    }

    if (keywords.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-2">No keywords yet</p>
                    <p className="text-sm text-muted-foreground">
                        Select an app from the sidebar to view its keywords
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Bar */}
            <div className="border-b bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                Keywords
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2">
                                🇺🇸 US
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button size="sm" className="gap-2 bg-blue-500 hover:bg-blue-600">
                            <Plus className="h-4 w-4" />
                            Add Keywords
                        </Button>
                        {suggestionsCount > 0 && (
                            <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                                <Sparkles className="h-3 w-3" />
                                Found {suggestionsCount} Suggestions
                            </Badge>
                        )}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 w-48"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="border-b bg-card/50 px-4 py-2">
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'All', count: keywords.length },
                        { value: 'excellent', label: 'Excellent', count: keywords.filter(k => k.recommendation === 'excellent').length },
                        { value: 'good', label: 'Good', count: keywords.filter(k => k.recommendation === 'good').length },
                        { value: 'consider', label: 'Consider', count: keywords.filter(k => k.recommendation === 'consider').length },
                        { value: 'challenging', label: 'Challenging', count: keywords.filter(k => k.recommendation === 'challenging').length },
                        { value: 'avoid', label: 'Avoid', count: keywords.filter(k => k.recommendation === 'avoid').length },
                    ].map((filter) => (
                        <Button
                            key={filter.value}
                            variant={filterRecommendation === filter.value ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setFilterRecommendation(filter.value)}
                            className="gap-1"
                        >
                            {filter.label}
                            <span className="text-xs opacity-70">({filter.count})</span>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div className="px-4 py-2 text-sm text-muted-foreground border-b">
                Showing {filteredAndSorted.length} of {keywords.length} keywords
                {appTitle && <span className="ml-2">for <strong>{appTitle}</strong></span>}
            </div>

            {/* Table */}
            <ScrollArea className="flex-1">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            <TableHead className="w-[280px]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('keyword')}
                                    className="-ml-3 gap-1"
                                >
                                    Keyword
                                    <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[60px] text-center">
                                <StickyNote className="h-4 w-4 mx-auto text-muted-foreground" />
                            </TableHead>
                            <TableHead className="w-[120px]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('analyzedAt')}
                                    className="gap-1"
                                >
                                    Last update
                                    <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[160px]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('traffic')}
                                    className="gap-1"
                                >
                                    Popularity
                                    <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[160px]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('difficulty')}
                                    className="gap-1"
                                >
                                    Difficulty
                                    <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[100px]">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSort('opportunity')}
                                    className="gap-1"
                                >
                                    Position
                                    <ArrowUpDown className="h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead>Recommendation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No keywords match your search
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSorted.map((keyword, index) => (
                                <TableRow
                                    key={keyword.id}
                                    className="hover:bg-muted/50 cursor-pointer"
                                >
                                    <TableCell className="font-medium">
                                        {keyword.keyword}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {keyword.recommendation === 'excellent' && (
                                            <div className="w-3 h-3 rounded-full bg-green-500 mx-auto" />
                                        )}
                                        {keyword.recommendation === 'good' && (
                                            <div className="w-3 h-3 rounded-full bg-yellow-500 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(keyword.analyzedAt), { addSuffix: false })}
                                    </TableCell>
                                    <TableCell>
                                        <ScoreBar value={keyword.traffic} type="popularity" />
                                    </TableCell>
                                    <TableCell>
                                        <ScoreBar value={keyword.difficulty} type="difficulty" />
                                    </TableCell>
                                    <TableCell>
                                        <OpportunityScore value={keyword.opportunity} />
                                    </TableCell>
                                    <TableCell>
                                        <RecommendationBadge recommendation={keyword.recommendation} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}
