import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Database file location - in the web directory
const dbPath = path.join(process.cwd(), 'aso-analytics.db');

// Create database connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_store_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    genres TEXT NOT NULL,
    screenshot_count INTEGER DEFAULT 0,
    analyzed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    traffic INTEGER,
    difficulty INTEGER,
    opportunity INTEGER,
    recommendation TEXT NOT NULL,
    analysis_succeeded INTEGER NOT NULL,
    analyzed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_keywords_app_id ON keywords(app_id);
  CREATE INDEX IF NOT EXISTS idx_keywords_recommendation ON keywords(recommendation);
`);

export { sqlite };
