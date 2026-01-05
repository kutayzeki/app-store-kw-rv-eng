import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const apps = sqliteTable('apps', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    appStoreId: text('app_store_id').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    genres: text('genres').notNull(), // JSON array stored as string
    screenshotCount: integer('screenshot_count').default(0),
    analyzedAt: text('analyzed_at').notNull(),
});

export const keywords = sqliteTable('keywords', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    appId: integer('app_id').notNull().references(() => apps.id, { onDelete: 'cascade' }),
    keyword: text('keyword').notNull(),
    traffic: integer('traffic'),
    difficulty: integer('difficulty'),
    opportunity: integer('opportunity'),
    recommendation: text('recommendation').notNull(),
    analysisSucceeded: integer('analysis_succeeded', { mode: 'boolean' }).notNull(),
    analyzedAt: text('analyzed_at').notNull(),
});

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
export type Keyword = typeof keywords.$inferSelect;
export type NewKeyword = typeof keywords.$inferInsert;
