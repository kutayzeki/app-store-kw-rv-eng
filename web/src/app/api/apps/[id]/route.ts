import { db } from '@/lib/db';
import { apps, keywords } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/apps/[id] - Get single app with all keywords
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const appId = parseInt(id, 10);

        if (isNaN(appId)) {
            return NextResponse.json({ error: 'Invalid app ID' }, { status: 400 });
        }

        // Get app data
        const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);

        if (!app) {
            return NextResponse.json({ error: 'App not found' }, { status: 404 });
        }

        // Get all keywords for this app
        const appKeywords = await db
            .select()
            .from(keywords)
            .where(eq(keywords.appId, appId))
            .orderBy(sql`${keywords.opportunity} DESC NULLS LAST`);

        // Calculate summary stats
        const summary = {
            total: appKeywords.length,
            analyzed: appKeywords.filter(k => k.analysisSucceeded).length,
            failed: appKeywords.filter(k => !k.analysisSucceeded).length,
            excellent: appKeywords.filter(k => k.recommendation === 'excellent').length,
            good: appKeywords.filter(k => k.recommendation === 'good').length,
            consider: appKeywords.filter(k => k.recommendation === 'consider').length,
            challenging: appKeywords.filter(k => k.recommendation === 'challenging').length,
            avoid: appKeywords.filter(k => k.recommendation === 'avoid').length,
        };

        return NextResponse.json({
            ...app,
            genres: JSON.parse(app.genres || '[]'),
            keywords: appKeywords,
            summary,
        });
    } catch (error) {
        console.error('Error fetching app:', error);
        return NextResponse.json({ error: 'Failed to fetch app' }, { status: 500 });
    }
}

// DELETE /api/apps/[id] - Delete app and all its keywords
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const appId = parseInt(id, 10);

        if (isNaN(appId)) {
            return NextResponse.json({ error: 'Invalid app ID' }, { status: 400 });
        }

        // Delete app (keywords will cascade delete due to foreign key)
        const result = await db.delete(apps).where(eq(apps.id, appId)).returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'App not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, deleted: result[0] });
    } catch (error) {
        console.error('Error deleting app:', error);
        return NextResponse.json({ error: 'Failed to delete app' }, { status: 500 });
    }
}
