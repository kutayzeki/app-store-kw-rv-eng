'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppsTable } from '@/components/apps-table';
import { AddAppDialog } from '@/components/add-app-dialog';
import { AppDetailModal } from '@/components/app-detail-modal';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { AppWithStats } from '@/types';

export default function Dashboard() {
  const [apps, setApps] = useState<AppWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppWithStats | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/apps');
      if (!response.ok) throw new Error('Failed to fetch apps');
      const data = await response.json();
      setApps(data);
    } catch (error) {
      console.error('Error fetching apps:', error);
      toast.error('Failed to load apps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleViewApp = (app: AppWithStats) => {
    setSelectedApp(app);
    setDetailModalOpen(true);
  };

  const handleDeleteApp = async (appId: number) => {
    if (!confirm('Are you sure you want to delete this app and all its keywords?')) {
      return;
    }

    try {
      const response = await fetch(`/api/apps/${appId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete app');
      toast.success('App deleted successfully');
      fetchApps();
    } catch (error) {
      console.error('Error deleting app:', error);
      toast.error('Failed to delete app');
    }
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedApp(null);
  };

  // Calculate total stats
  const totalStats = apps.reduce(
    (acc, app) => ({
      totalApps: acc.totalApps + 1,
      totalKeywords: acc.totalKeywords + app.totalKeywords,
      totalExcellent: acc.totalExcellent + app.excellentCount,
      totalGood: acc.totalGood + app.goodCount,
    }),
    { totalApps: 0, totalKeywords: 0, totalExcellent: 0, totalGood: 0 }
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ASO Analytics</h1>
                <p className="text-sm text-muted-foreground">App Store Keyword Research</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchApps} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <AddAppDialog onAppAdded={fetchApps} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Apps Analyzed</p>
            <p className="text-2xl font-bold">{totalStats.totalApps}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Keywords</p>
            <p className="text-2xl font-bold">{totalStats.totalKeywords}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Excellent Opportunities</p>
            <p className="text-2xl font-bold text-emerald-500">{totalStats.totalExcellent}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Good Opportunities</p>
            <p className="text-2xl font-bold text-green-500">{totalStats.totalGood}</p>
          </div>
        </div>

        {/* Apps Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Analyzed Apps</h2>
          <AppsTable
            apps={apps}
            loading={loading}
            onViewApp={handleViewApp}
            onDeleteApp={handleDeleteApp}
          />
        </div>
      </main>

      {/* Detail Modal */}
      <AppDetailModal
        app={selectedApp}
        open={detailModalOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
