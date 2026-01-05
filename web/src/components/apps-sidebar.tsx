'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AddAppDialog } from '@/components/add-app-dialog';
import { Apple, Smartphone } from 'lucide-react';
import type { AppWithStats } from '@/types';

interface AppsSidebarProps {
    apps: AppWithStats[];
    selectedAppId: number | null;
    onSelectApp: (app: AppWithStats) => void;
    onRefresh: () => void;
    loading?: boolean;
}

export function AppsSidebar({ apps, selectedAppId, onSelectApp, onRefresh, loading }: AppsSidebarProps) {
    if (loading) {
        return (
            <div className="w-64 border-r bg-card flex flex-col">
                <div className="p-3 border-b">
                    <Skeleton className="h-5 w-16" />
                </div>
                <div className="p-2 space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-64 border-r bg-card flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Apps</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {apps.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-3">No apps yet</p>
                            <AddAppDialog
                                onAppAdded={onRefresh}
                                trigger={
                                    <Button size="sm" variant="outline">
                                        Add Your First App
                                    </Button>
                                }
                            />
                        </div>
                    ) : (
                        apps.map((app) => (
                            <button
                                key={app.id}
                                onClick={() => onSelectApp(app)}
                                className={cn(
                                    'w-full p-3 rounded-lg text-left transition-colors',
                                    'hover:bg-accent',
                                    selectedAppId === app.id && 'bg-accent border border-primary/20'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <Apple className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{app.title}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Smartphone className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">iPhone</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>

            <div className="p-2 border-t">
                <AddAppDialog
                    onAppAdded={onRefresh}
                    trigger={
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                            + Add App
                        </Button>
                    }
                />
            </div>
        </div>
    );
}
