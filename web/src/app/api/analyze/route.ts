import { db } from '@/lib/db';
import { apps, keywords } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Import the parent project's services
const path = require('path');
const parentDir = path.join(process.cwd(), '..');

// Dynamic imports for the services
async function getAppData(appId: number) {
    const store = require('app-store-scraper');
    const appData = await store.app({ id: appId });
    return {
        title: appData.title,
        description: appData.description,
        genres: appData.genres || [],
        screenshots: appData.screenshots || []
    };
}

async function generateKeywordsForApp(appData: any) {
    // Use Gemini to generate keywords
    require('dotenv').config({ path: path.join(parentDir, '.env') });
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze this app and generate the most relevant search keywords that users would use to find it on the App Store.

App Title: ${appData.title}

App Description: ${appData.description}

Generate 20-30 relevant keywords/search phrases. Return ONLY a JSON array of strings, nothing else.
Example: ["keyword 1", "keyword 2", "keyword 3"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse keywords from AI response');
}

async function analyzeKeyword(keyword: string) {
    const { ASO } = require('aso-v2');
    const aso = new ASO('itunes');

    try {
        const analysis = await aso.analyzeKeyword(keyword);

        if (!analysis || !analysis.traffic || !analysis.difficulty) {
            return null;
        }

        const trafficScore = Math.round(analysis.traffic.score * 10);
        const difficultyScore = Math.round(analysis.difficulty.score * 10);

        // Calculate recommendation
        let recommendation = 'consider';
        if (trafficScore >= 25 && difficultyScore <= 35) recommendation = 'excellent';
        else if (trafficScore >= 15 && difficultyScore <= 45) recommendation = 'good';
        else if (trafficScore >= 40 && difficultyScore >= 60) recommendation = 'challenging';
        else if (trafficScore <= 15 && difficultyScore >= 50) recommendation = 'avoid';

        return {
            traffic: trafficScore,
            difficulty: difficultyScore,
            opportunity: Math.round((trafficScore * 0.6) + ((100 - difficultyScore) * 0.4)),
            recommendation
        };
    } catch (error) {
        return null;
    }
}

// POST /api/analyze - Start analysis for a new app
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { appStoreId } = body;

        if (!appStoreId) {
            return NextResponse.json({ error: 'appStoreId is required' }, { status: 400 });
        }

        const numericId = parseInt(appStoreId, 10);
        if (isNaN(numericId)) {
            return NextResponse.json({ error: 'appStoreId must be a number' }, { status: 400 });
        }

        // Check if app already exists
        const existing = await db.select().from(apps).where(eq(apps.appStoreId, String(numericId))).limit(1);
        if (existing.length > 0) {
            return NextResponse.json({
                error: 'App already analyzed',
                app: existing[0]
            }, { status: 409 });
        }

        console.log(`Starting analysis for app ID: ${numericId}`);

        // Step 1: Get app data from App Store
        console.log('Fetching app data...');
        const appData = await getAppData(numericId);
        console.log(`Got app: ${appData.title}`);

        // Step 2: Insert app into database
        const [newApp] = await db.insert(apps).values({
            appStoreId: String(numericId),
            title: appData.title,
            description: appData.description,
            genres: JSON.stringify(appData.genres),
            screenshotCount: appData.screenshots.length,
            analyzedAt: new Date().toISOString(),
        }).returning();

        console.log(`App saved with ID: ${newApp.id}`);

        // Step 3: Generate keywords using AI
        console.log('Generating keywords with AI...');
        const generatedKeywords = await generateKeywordsForApp(appData);
        console.log(`Generated ${generatedKeywords.length} keywords`);

        // Step 4: Analyze each keyword (with rate limiting)
        console.log('Analyzing keywords...');
        const keywordResults = [];

        for (let i = 0; i < generatedKeywords.length; i++) {
            const keyword = generatedKeywords[i];
            const analysis = await analyzeKeyword(keyword);

            const keywordData = {
                appId: newApp.id,
                keyword,
                traffic: analysis?.traffic ?? null,
                difficulty: analysis?.difficulty ?? null,
                opportunity: analysis?.opportunity ?? null,
                recommendation: analysis?.recommendation ?? 'analysis_failed',
                analysisSucceeded: analysis !== null,
                analyzedAt: new Date().toISOString(),
            };

            keywordResults.push(keywordData);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));

            if ((i + 1) % 5 === 0) {
                console.log(`Analyzed ${i + 1}/${generatedKeywords.length} keywords`);
            }
        }

        // Step 5: Save all keywords to database
        if (keywordResults.length > 0) {
            await db.insert(keywords).values(keywordResults);
        }

        console.log(`Analysis complete! ${keywordResults.length} keywords saved.`);

        return NextResponse.json({
            success: true,
            app: newApp,
            keywordsAnalyzed: keywordResults.length,
            summary: {
                excellent: keywordResults.filter(k => k.recommendation === 'excellent').length,
                good: keywordResults.filter(k => k.recommendation === 'good').length,
                consider: keywordResults.filter(k => k.recommendation === 'consider').length,
                challenging: keywordResults.filter(k => k.recommendation === 'challenging').length,
                avoid: keywordResults.filter(k => k.recommendation === 'avoid').length,
                failed: keywordResults.filter(k => k.recommendation === 'analysis_failed').length,
            }
        });

    } catch (error) {
        console.error('Analysis failed:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Analysis failed'
        }, { status: 500 });
    }
}
