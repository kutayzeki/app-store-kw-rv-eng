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
import { Plus, Loader2, AlertCircle } from 'lucide-react';

interface AddAppDialogProps {
    onAppAdded: () => void;
}

export function AddAppDialog({ onAppAdded }: AddAppDialogProps) {
    const [open, setOpen] = useState(false);
    const [appStoreId, setAppStoreId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

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

        try {
            // For now, just show a placeholder - actual analysis would require backend integration
            setError('Analysis feature not yet implemented. Use Import to bring in existing results.');
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze app');
            setLoading(false);
        }
    };

    const handleImport = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/import', { method: 'POST' });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            setOpen(false);
            setAppStoreId('');
            onAppAdded();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add App
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add App for Analysis</DialogTitle>
                    <DialogDescription>
                        Enter an App Store ID to analyze, or import existing results.
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
                        />
                        <p className="text-xs text-muted-foreground">
                            Find this in the App Store URL: apps.apple.com/app/id
                            <span className="text-primary font-mono">310633997</span>
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleImport}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Import Existing Results
                        </Button>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Analyze App
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
