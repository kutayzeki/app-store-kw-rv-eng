import { db } from '@/lib/db';
import { apps, keywords } from '@/lib/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/apps - List all apps with stats
export async function GET() {
    try {
        const appsWithStats = await db
            .select({
                id: apps.id,
                appStoreId: apps.appStoreId,
                title: apps.title,
                description: apps.description,
                genres: apps.genres,
                screenshotCount: apps.screenshotCount,
                analyzedAt: apps.analyzedAt,
                totalKeywords: count(keywords.id),
                excellentCount: sql<number>`SUM(CASE WHEN ${keywords.recommendation} = 'excellent' THEN 1 ELSE 0 END)`,
                goodCount: sql<number>`SUM(CASE WHEN ${keywords.recommendation} = 'good' THEN 1 ELSE 0 END)`,
                considerCount: sql<number>`SUM(CASE WHEN ${keywords.recommendation} = 'consider' THEN 1 ELSE 0 END)`,
                challengingCount: sql<number>`SUM(CASE WHEN ${keywords.recommendation} = 'challenging' THEN 1 ELSE 0 END)`,
                avoidCount: sql<number>`SUM(CASE WHEN ${keywords.recommendation} = 'avoid' THEN 1 ELSE 0 END)`,
                failedCount: sql<number>`SUM(CASE WHEN ${keywords.recommendation} = 'analysis_failed' THEN 1 ELSE 0 END)`,
            })
            .from(apps)
            .leftJoin(keywords, eq(apps.id, keywords.appId))
            .groupBy(apps.id)
            .orderBy(sql`${apps.analyzedAt} DESC`);

        const result = appsWithStats.map(app => ({
            ...app,
            genres: JSON.parse(app.genres || '[]'),
            excellentCount: app.excellentCount || 0,
            goodCount: app.goodCount || 0,
            considerCount: app.considerCount || 0,
            challengingCount: app.challengingCount || 0,
            avoidCount: app.avoidCount || 0,
            failedCount: app.failedCount || 0,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching apps:', error);
        return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 });
    }
}

// POST /api/apps - Add a new app (just stores data, analysis is separate)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { appStoreId, title, description, genres, screenshotCount, keywords: keywordResults } = body;

        if (!appStoreId || !title) {
            return NextResponse.json({ error: 'appStoreId and title are required' }, { status: 400 });
        }

        // Check if app already exists
        const existing = await db.select().from(apps).where(eq(apps.appStoreId, appStoreId)).limit(1);
        if (existing.length > 0) {
            return NextResponse.json({ error: 'App already exists', app: existing[0] }, { status: 409 });
        }

        // Insert new app
        const [newApp] = await db.insert(apps).values({
            appStoreId,
            title,
            description: description || '',
            genres: JSON.stringify(genres || []),
            screenshotCount: screenshotCount || 0,
            analyzedAt: new Date().toISOString(),
        }).returning();

        // Insert keywords if provided
        if (keywordResults && keywordResults.length > 0) {
            const keywordInserts = keywordResults.map((kw: any) => ({
                appId: newApp.id,
                keyword: kw.keyword,
                traffic: kw.traffic,
                difficulty: kw.difficulty,
                opportunity: kw.opportunity,
                recommendation: kw.recommendation,
                analysisSucceeded: kw.analysisSucceeded ?? true,
                analyzedAt: kw.analyzedAt || new Date().toISOString(),
            }));

            await db.insert(keywords).values(keywordInserts);
        }

        return NextResponse.json(newApp, { status: 201 });
    } catch (error) {
        console.error('Error creating app:', error);
        return NextResponse.json({ error: 'Failed to create app' }, { status: 500 });
    }
}
