'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddAppDialogProps {
    onAppAdded: () => void;
    trigger?: React.ReactNode;
}

export function AddAppDialog({ onAppAdded, trigger }: AddAppDialogProps) {
    const [open, setOpen] = useState(false);
    const [appStoreId, setAppStoreId] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatus('');

        if (!appStoreId.trim()) {
            setError('Please enter an App Store ID');
            return;
        }

        // Validate it's a numeric ID
        if (!/^\d+$/.test(appStoreId.trim())) {
            setError('App Store ID must be a number');
            return;
        }

        setLoading(true);
        setStatus('Fetching app from App Store...');

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appStoreId: appStoreId.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Analysis failed');
            }

            setStatus('');
            toast.success(`Analyzed "${result.app.title}" - ${result.keywordsAnalyzed} keywords found!`);
            setOpen(false);
            setAppStoreId('');
            onAppAdded();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
            setStatus('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add App
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Analyze New App</DialogTitle>
                    <DialogDescription>
                        Enter an App Store ID to analyze its keywords and opportunities.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="appStoreId" className="text-sm font-medium">
                            App Store ID
                        </label>
                        <Input
                            id="appStoreId"
                            placeholder="e.g., 310633997"
                            value={appStoreId}
                            onChange={(e) => setAppStoreId(e.target.value)}
                            disabled={loading}
                            autoComplete="off"
                        />
                        <p className="text-xs text-muted-foreground">
                            Find this in the App Store URL: apps.apple.com/app/id
                            <span className="text-primary font-mono">310633997</span>
                        </p>
                    </div>

                    {status && (
                        <div className="flex items-center gap-2 text-sm text-blue-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {status}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                'Analyze App'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
