'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppsSidebar } from '@/components/apps-sidebar';
import { KeywordsMainTable } from '@/components/keywords-main-table';
import { AddAppDialog } from '@/components/add-app-dialog';
import { toast } from 'sonner';
import type { AppWithStats, KeywordAnalysis } from '@/types';

interface AppDetailData {
  id: number;
  title: string;
  description: string;
  genres: string[];
  keywords: KeywordAnalysis[];
}

export default function Dashboard() {
  const [apps, setApps] = useState<AppWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppWithStats | null>(null);
  const [appDetail, setAppDetail] = useState<AppDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/apps');
      if (!response.ok) throw new Error('Failed to fetch apps');
      const data = await response.json();
      setApps(data);

      // Auto-select first app if none selected
      if (data.length > 0 && !selectedApp) {
        handleSelectApp(data[0]);
      }
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

  const handleSelectApp = async (app: AppWithStats) => {
    setSelectedApp(app);
    setLoadingDetail(true);

    try {
      const response = await fetch(`/api/apps/${app.id}`);
      if (!response.ok) throw new Error('Failed to fetch app details');
      const data = await response.json();
      setAppDetail(data);
    } catch (error) {
      console.error('Error fetching app details:', error);
      toast.error('Failed to load keywords');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAppAdded = () => {
    fetchApps();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Apps List */}
        <AppsSidebar
          apps={apps}
          selectedAppId={selectedApp?.id ?? null}
          onSelectApp={handleSelectApp}
          onRefresh={fetchApps}
          loading={loading}
        />

        {/* Main Content - Keywords Table */}
        <KeywordsMainTable
          keywords={appDetail?.keywords ?? []}
          appTitle={selectedApp?.title}
          loading={loadingDetail}
        />
      </div>

      {/* Hidden Add App Dialog - Triggered from sidebar */}
      <div className="hidden">
        <AddAppDialog onAppAdded={handleAppAdded} />
      </div>
    </div>
  );
}
