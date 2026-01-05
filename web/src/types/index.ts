export interface AppData {
  id: number;
  appStoreId: string;
  title: string;
  description: string;
  genres: string[];
  screenshotCount: number;
  analyzedAt: string;
}

export interface KeywordAnalysis {
  id: number;
  appId: number;
  keyword: string;
  traffic: number | null;
  difficulty: number | null;
  opportunity: number | null;
  recommendation: 'excellent' | 'good' | 'consider' | 'challenging' | 'avoid' | 'analysis_failed';
  analysisSucceeded: boolean;
  analyzedAt: string;
}

export interface AppWithStats extends AppData {
  totalKeywords: number;
  excellentCount: number;
  goodCount: number;
  considerCount: number;
  challengingCount: number;
  avoidCount: number;
  failedCount: number;
}

export interface AnalysisSummary {
  total: number;
  analyzed: number;
  failed: number;
  excellent: number;
  good: number;
  consider: number;
  challenging: number;
  avoid: number;
}

export type RecommendationType = KeywordAnalysis['recommendation'];
