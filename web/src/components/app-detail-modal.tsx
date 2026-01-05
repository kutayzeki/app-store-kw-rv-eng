'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatsCards } from './stats-cards';
import { KeywordTable } from './keyword-table';
import { Skeleton } from './ui/skeleton';
import type { AppWithStats, KeywordAnalysis, AnalysisSummary } from '@/types';

interface AppDetailModalProps {
    app: AppWithStats | null;
    open: boolean;
    onClose: () => void;
}

interface AppDetailData {
    id: number;
    title: string;
    description: string;
    genres: string[];
    keywords: KeywordAnalysis[];
    summary: AnalysisSummary;
}

export function AppDetailModal({ app, open, onClose }: AppDetailModalProps) {
    const [data, setData] = useState<AppDetailData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (app && open) {
            setLoading(true);
            fetch(`/api/apps/${app.id}`)
                .then((res) => res.json())
                .then((result) => {
                    setData(result);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error('Error loading app details:', err);
                    setLoading(false);
                });
        } else {
            setData(null);
        }
    }, [app, open]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{app?.title || 'App Details'}</DialogTitle>
                    <DialogDescription>
                        {app && (
                            <div className="flex gap-2 mt-1">
                                {Array.isArray(app.genres) && app.genres.map((genre) => (
                                    <Badge key={genre} variant="outline">
                                        {genre}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-6 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-20" />
                            ))}
                        </div>
                        <Skeleton className="h-64" />
                    </div>
                ) : data ? (
                    <Tabs defaultValue="keywords" className="flex-1 overflow-hidden flex flex-col">
                        <TabsList>
                            <TabsTrigger value="keywords">Keywords</TabsTrigger>
                            <TabsTrigger value="info">App Info</TabsTrigger>
                        </TabsList>

                        <TabsContent value="keywords" className="flex-1 overflow-hidden flex flex-col mt-4">
                            <StatsCards summary={data.summary} />
                            <ScrollArea className="flex-1 mt-4">
                                <KeywordTable keywords={data.keywords} />
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="info" className="mt-4">
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-4 pr-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Description</h3>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {data.description}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-2">Categories</h3>
                                        <div className="flex gap-2 flex-wrap">
                                            {data.genres.map((genre) => (
                                                <Badge key={genre} variant="secondary">
                                                    {genre}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        No data available
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
