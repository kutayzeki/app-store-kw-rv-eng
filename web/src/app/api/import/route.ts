import { db } from '@/lib/db';
import { apps, keywords } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// POST /api/import - Import existing JSON results from results/ directory
export async function POST() {
    try {
        const resultsDir = path.join(process.cwd(), '..', 'results');

        if (!fs.existsSync(resultsDir)) {
            return NextResponse.json({ error: 'Results directory not found' }, { status: 404 });
        }

        const imported: string[] = [];
        const skipped: string[] = [];
        const errors: string[] = [];

        // Get all app folders
        const appFolders = fs.readdirSync(resultsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        for (const folder of appFolders) {
            const folderPath = path.join(resultsDir, folder);
            const files = fs.readdirSync(folderPath);

            // Find the final JSON file
            const finalFile = files.find(f => f.endsWith('_progressive_final.json'));

            if (!finalFile) {
                skipped.push(folder);
                continue;
            }

            try {
                const filePath = path.join(folderPath, finalFile);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

                if (!data.appData || !data.results) {
                    errors.push(`${folder}: Invalid data structure`);
                    continue;
                }

                // Check if app already exists by title (since we don't have appStoreId in JSON)
                const existingApps = await db.select().from(apps).limit(1000);
                const exists = existingApps.some(a => a.title === data.appData.title);

                if (exists) {
                    skipped.push(`${folder} (already exists)`);
                    continue;
                }

                // Insert app
                const [newApp] = await db.insert(apps).values({
                    appStoreId: `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    title: data.appData.title,
                    description: data.appData.description || '',
                    genres: JSON.stringify(data.appData.genres || []),
                    screenshotCount: data.appData.screenshots?.length || 0,
                    analyzedAt: data.completedAt || new Date().toISOString(),
                }).returning();

                // Insert keywords
                if (data.results.length > 0) {
                    const keywordInserts = data.results.map((kw: any) => ({
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

                imported.push(`${folder} (${data.results.length} keywords)`);
            } catch (err) {
                errors.push(`${folder}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            errors,
            summary: {
                totalFolders: appFolders.length,
                imported: imported.length,
                skipped: skipped.length,
                errors: errors.length,
            }
        });
    } catch (error) {
        console.error('Error importing data:', error);
        return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
    }
}
