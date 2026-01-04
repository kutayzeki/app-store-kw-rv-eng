const { getAppData, getSimilarApps, getSearchSuggestions } = require('./services/app-store-scraper');
const { generateKeywords } = require('./services/keyword-generator');
const { ASOAnalyzer } = require('./services/aso-analyzer');
const fs = require('fs');
const path = require('path');

// Configuration
const MAX_COMPETITORS = 7;  // Increased from 3 for more keyword coverage

/**
 * Collects app data and similar apps, then logs the main app
 */
async function collectAppData(appId) {
  // Validate app ID is numeric
  const numericAppId = parseInt(appId, 10);
  if (isNaN(numericAppId) || numericAppId <= 0) {
    throw new Error('App ID must be a valid numeric value');
  }

  console.log(`🚀 Starting analysis for app ID: ${numericAppId}`);
  
  // Get app data from App Store
  const appData = await getAppData(numericAppId);

  // Get similar apps (increased to 7 for better keyword coverage)
  const allSimilarApps = await getSimilarApps(numericAppId);
  const topSimilarApps = allSimilarApps.slice(0, MAX_COMPETITORS);

  // Scrape app data for similar apps
  const similarAppsData = [];
  for (const similarApp of topSimilarApps) {
    try {
      const similarAppData = await getAppData(similarApp.id);
      similarAppsData.push(similarAppData);
    } catch (error) {
      console.warn(`⚠️ Failed to scrape data for similar app ${similarApp.id}: ${error.message}`);
    }
  }

  // Log the main app data
  console.log(`\n📋 Scraped App Data for ${appData.title}`);
  console.log(`📋 Also scraped data of ${similarAppsData.length} similar apps`);
  
  return { appData, similarApps: similarAppsData, numericAppId };
}

/**
 * Deduplicates keywords - removes duplicates and near-duplicates
 */
function deduplicateKeywords(keywords) {
  const seen = new Set();
  const unique = [];
  
  for (const keyword of keywords) {
    // Normalize: lowercase, trim, remove extra spaces
    const normalized = keyword.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }
  
  return unique;
}

/**
 * Generates keywords for main app and similar apps
 */
async function generateAppKeywords(appData, similarApps) {
  console.log('\n🧠 Generating keywords for main app...');
  const mainAppKeywords = await generateKeywords(appData);
  
  console.log(`✅ Generated keywords for ${appData.title}:`);
  console.log(mainAppKeywords.keywords.join(', '));
  
  console.log(`\n🧠 Generating keywords for ${similarApps.length} similar apps...`);
  const similarAppKeywords = [];
  for (const similarApp of similarApps) {
    try {
      const keywords = await generateKeywords(similarApp);
      similarAppKeywords.push(...keywords.keywords);
      console.log(`✅ Generated keywords for ${similarApp.title}:`);
      console.log(keywords.keywords.join(', '));
    } catch (error) {
      console.warn(`⚠️ Failed to generate keywords for ${similarApp.title}: ${error.message}`);
    }
  }
  
  // Combine all keywords
  const allRawKeywords = [...mainAppKeywords.keywords, ...similarAppKeywords];
  
  // Deduplicate to avoid wasting analysis on duplicates
  const allKeywords = deduplicateKeywords(allRawKeywords);
  
  console.log(`\n🔄 Deduplicated: ${allRawKeywords.length} → ${allKeywords.length} unique keywords`);
  
  return {
    mainAppKeywords: mainAppKeywords.keywords,
    similarAppKeywords: similarAppKeywords,
    allKeywords: allKeywords
  };
}

/**
 * Fetches App Store autocomplete suggestions for seed keywords
 * These are PROVEN user searches, not AI guesses
 */
async function getAutocompleteSuggestions(seedKeywords) {
  console.log('\n🔍 Fetching App Store autocomplete suggestions (proven searches)...');
  
  // Use first 5 keywords as seeds to get suggestions
  const seeds = seedKeywords.slice(0, 5);
  const suggestions = new Set();
  
  for (const seed of seeds) {
    try {
      const results = await getSearchSuggestions(seed);
      results.forEach(s => suggestions.add(s.toLowerCase().trim()));
    } catch (error) {
      console.warn(`⚠️ Failed to get suggestions for "${seed}": ${error.message}`);
    }
  }
  
  const uniqueSuggestions = Array.from(suggestions);
  console.log(`✅ Found ${uniqueSuggestions.length} autocomplete suggestions`);
  
  return uniqueSuggestions;
}

/**
 * Calculates opportunity score: higher traffic + lower difficulty = better opportunity
 * Score ranges from 0-100, with 100 being the best opportunity
 * Returns null if either score is null (failed analysis)
 */
function calculateOpportunityScore(trafficScore, difficultyScore) {
  // If either score is null (failed analysis), return null
  if (trafficScore === null || difficultyScore === null) {
    return null;
  }
  
  // Opportunity = Traffic potential weighted against difficulty
  // Formula: (traffic * 0.6) + ((100 - difficulty) * 0.4)
  // Traffic matters more, but low difficulty is a nice bonus
  return Math.round((trafficScore * 0.6) + ((100 - difficultyScore) * 0.4));
}

/**
 * Generate summary data from current results
 */
function generateSummaryData(results, allKeywords, appData) {
  const successfulResults = results.filter(r => r.analysisSucceeded !== false);
  const failedResults = results.filter(r => r.analysisSucceeded === false);

  return {
    appData,
    lastUpdated: new Date().toISOString(),
    totalKeywords: allKeywords.length,
    analyzedSoFar: results.length,
    results: results,
    summary: {
      total: results.length,
      analyzed: successfulResults.length,
      failed: failedResults.length,
      excellent: successfulResults.filter(k => k.recommendation === 'excellent').length,
      good: successfulResults.filter(k => k.recommendation === 'good').length,
      consider: successfulResults.filter(k => k.recommendation === 'consider').length,
      challenging: successfulResults.filter(k => k.recommendation === 'challenging').length,
      avoid: successfulResults.filter(k => k.recommendation === 'avoid').length
    }
  };
}

/**
 * Update summary file with current progress
 */
function updateSummaryFile(results, allKeywords, appData, baseFilename, appResultsDir) {
  const summaryData = generateSummaryData(results, allKeywords, appData);
  const summaryText = generateSummaryText(summaryData);
  const summaryFile = path.join(appResultsDir, `${baseFilename}_summary.txt`);
  fs.writeFileSync(summaryFile, summaryText);
}

/**
 * Analyzes ALL keywords with ASO metrics and ranks by opportunity
 * Saves results incrementally after each keyword for resilience
 * Updates summary file after every 10 keywords
 */
async function analyzeAllKeywords(allKeywords, appData) {
  console.log(`\n📊 Analyzing ALL ${allKeywords.length} keywords with ASO (this may take a moment)...`);

  const asoAnalyzer = new ASOAnalyzer('itunes');
  const results = [];
  const resultsDir = path.join(process.cwd(), 'results');
  const appName = appData.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const baseFilename = `${appName}_progressive`;

  // Create app-specific results folder
  const appResultsDir = path.join(resultsDir, appName);
  if (!fs.existsSync(appResultsDir)) {
    fs.mkdirSync(appResultsDir, { recursive: true });
  }

  // Check if there's an existing progress file to resume from
  const progressFile = path.join(appResultsDir, `${baseFilename}.json`);
  let startIndex = 0;

  if (fs.existsSync(progressFile)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      results.push(...existingData.results);
      startIndex = existingData.lastAnalyzedIndex + 1;
      console.log(`\n📂 Resuming from keyword ${startIndex + 1}/${allKeywords.length}...`);
    } catch (error) {
      console.log(`\n⚠️ Could not resume from progress file, starting fresh...`);
    }
  }

  for (let i = startIndex; i < allKeywords.length; i++) {
    const keyword = allKeywords[i];
    try {
      const analysis = await asoAnalyzer.analyzeKeyword(keyword);
      
      // Check if analysis actually succeeded (not a silent failure with null scores)
      const analysisSucceeded = analysis.analysisSucceeded !== false && 
                                 analysis.trafficScore !== null && 
                                 analysis.difficultyScore !== null;
      
      const opportunityScore = analysisSucceeded 
        ? calculateOpportunityScore(analysis.trafficScore, analysis.difficultyScore)
        : null;

      const keywordResult = {
        keyword,
        traffic: analysis.trafficScore,
        difficulty: analysis.difficultyScore,
        opportunity: opportunityScore,
        recommendation: analysis.recommendation,
        analysisSucceeded: analysisSucceeded,
        error: analysis.error || null,
        analyzedAt: new Date().toISOString()
      };

      results.push(keywordResult);

      // Save progress after each keyword
      const progressData = {
        appData: appData,
        lastAnalyzedIndex: i,
        totalKeywords: allKeywords.length,
        results: results,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));

      // Progress indicator every 5 keywords (more frequent now)
      if ((i + 1) % 5 === 0 || i === allKeywords.length - 1) {
        const failedCount = results.filter(r => !r.analysisSucceeded).length;
        const failedNote = failedCount > 0 ? ` (${failedCount} failed)` : '';
        console.log(`   Analyzed ${i + 1}/${allKeywords.length} keywords...${failedNote} (💾 saved)`);

        // Update summary file after every 10 keywords
        if ((i + 1) % 10 === 0 || i === allKeywords.length - 1) {
          updateSummaryFile(results, allKeywords, appData, baseFilename, appResultsDir);
          console.log(`   📊 Summary updated! Check ${appName}/${baseFilename}_summary.txt`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to analyze keyword "${keyword}": ${error.message}`);

      // Record the failure properly
      const keywordResult = {
        keyword,
        traffic: null,
        difficulty: null,
        opportunity: null,
        recommendation: 'analysis_failed',
        analysisSucceeded: false,
        error: error.message,
        analyzedAt: new Date().toISOString()
      };
      
      results.push(keywordResult);

      // Save progress even on errors
      const progressData = {
        appData: appData,
        lastAnalyzedIndex: i,
        totalKeywords: allKeywords.length,
        results: results,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));
    }
  }

  // Separate successful analyses from failed ones
  const successfulResults = results.filter(r => r.analysisSucceeded !== false);
  const failedResults = results.filter(r => r.analysisSucceeded === false);
  
  // Sort successful results by opportunity score (highest first)
  successfulResults.sort((a, b) => (b.opportunity || 0) - (a.opportunity || 0));
  
  // Combine: successful first (sorted), then failed at the end
  const sortedResults = [...successfulResults, ...failedResults];

  // Save final results
  const finalData = {
    appData: appData,
    completedAt: new Date().toISOString(),
    totalKeywords: allKeywords.length,
    results: sortedResults,
    summary: {
      total: results.length,
      analyzed: successfulResults.length,
      failed: failedResults.length,
      excellent: successfulResults.filter(k => k.recommendation === 'excellent').length,
      good: successfulResults.filter(k => k.recommendation === 'good').length,
      consider: successfulResults.filter(k => k.recommendation === 'consider').length,
      challenging: successfulResults.filter(k => k.recommendation === 'challenging').length,
      avoid: successfulResults.filter(k => k.recommendation === 'avoid').length
    }
  };

  const finalFile = path.join(appResultsDir, `${baseFilename}_final.json`);
  fs.writeFileSync(finalFile, JSON.stringify(finalData, null, 2));
  console.log(`\n💾 Final results saved to: ${appName}/${baseFilename}_final.json`);

  return sortedResults;
}

/**
 * Displays analysis results with clear ranking
 */
function displayResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('🏆 KEYWORD OPPORTUNITIES - RANKED BY VALUE');
  console.log('='.repeat(80));
  
  // Separate successful from failed analyses
  const successfulResults = results.filter(r => r.analysisSucceeded !== false);
  const failedResults = results.filter(r => r.analysisSucceeded === false);
  
  // Top opportunities (excellent + good) - only from successful analyses
  const topOpportunities = successfulResults.filter(r => r.recommendation === 'excellent' || r.recommendation === 'good');
  const considerate = successfulResults.filter(r => r.recommendation === 'consider');
  const challenging = successfulResults.filter(r => r.recommendation === 'challenging');
  const avoid = successfulResults.filter(r => r.recommendation === 'avoid');
  
  if (topOpportunities.length > 0) {
    console.log('\n🌟 TOP OPPORTUNITIES (prioritize these):');
    topOpportunities.forEach((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      console.log(`${medal} ${r.keyword.padEnd(30)} | Traffic: ${String(r.traffic).padStart(3)} | Difficulty: ${String(r.difficulty).padStart(3)} | Opportunity: ${r.opportunity} | ${r.recommendation.toUpperCase()}`);
    });
  } else {
    console.log('\n🌟 TOP OPPORTUNITIES: None found in this analysis');
    console.log('   Consider lowering your traffic expectations or reviewing "worth considering" keywords');
  }
  
  if (considerate.length > 0) {
    console.log('\n📋 WORTH CONSIDERING:');
    considerate.slice(0, 10).forEach(r => {
      console.log(`   ${r.keyword.padEnd(30)} | Traffic: ${String(r.traffic).padStart(3)} | Difficulty: ${String(r.difficulty).padStart(3)} | Opportunity: ${r.opportunity}`);
    });
    if (considerate.length > 10) {
      console.log(`   ... and ${considerate.length - 10} more`);
    }
  }
  
  if (challenging.length > 0) {
    console.log('\n⚠️  CHALLENGING (high competition):');
    challenging.slice(0, 5).forEach(r => {
      console.log(`   ${r.keyword.padEnd(30)} | Traffic: ${String(r.traffic).padStart(3)} | Difficulty: ${String(r.difficulty).padStart(3)}`);
    });
  }
  
  if (avoid.length > 0) {
    console.log('\n❌ AVOID (not worth the effort):');
    console.log(`   ${avoid.length} keywords with low traffic and high difficulty`);
  }
  
  if (failedResults.length > 0) {
    console.log('\n🔧 ANALYSIS FAILED (need retry):');
    console.log(`   ${failedResults.length} keywords could not be analyzed (API returned no data)`);
    if (failedResults.length <= 10) {
      failedResults.forEach(r => {
        console.log(`   - ${r.keyword}`);
      });
    } else {
      failedResults.slice(0, 5).forEach(r => {
        console.log(`   - ${r.keyword}`);
      });
      console.log(`   ... and ${failedResults.length - 5} more`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Total keywords: ${results.length}`);
  console.log(`   Successfully analyzed: ${successfulResults.length}`);
  if (failedResults.length > 0) {
    console.log(`   ⚠️  Failed to analyze: ${failedResults.length}`);
  }
  console.log(`   🌟 Top opportunities: ${topOpportunities.length}`);
  console.log(`   📋 Worth considering: ${considerate.length}`);
  console.log(`   ⚠️  Challenging: ${challenging.length}`);
  console.log(`   ❌ Avoid: ${avoid.length}`);
  console.log('='.repeat(80));
}

/**
 * Main entry function for app analysis
 * @param {string|number} appId - The app ID (must be numeric)
 */
async function analyzeApp(appId) {
  try {
    // Step 1: Collect app data and similar apps (now 7 competitors instead of 3)
    const { appData, similarApps } = await collectAppData(appId);

    // Step 2: Generate keywords for main app and similar apps
    const { mainAppKeywords, similarAppKeywords, allKeywords } = await generateAppKeywords(appData, similarApps);

    // Step 3: Get App Store autocomplete suggestions (proven user searches)
    const autocompleteSuggestions = await getAutocompleteSuggestions(mainAppKeywords);
    
    // Combine AI-generated keywords with proven autocomplete searches
    const combinedKeywords = deduplicateKeywords([...allKeywords, ...autocompleteSuggestions]);
    console.log(`\n📦 Total unique keywords to analyze: ${combinedKeywords.length}`);

    // Step 4: Analyze ALL keywords (not random 5) and rank by opportunity
    const keywordAnalysis = await analyzeAllKeywords(combinedKeywords, appData);

    // Step 5: Display ranked results
    displayResults(keywordAnalysis);

    // Separate successful from failed analyses for summary
    const successfulAnalyses = keywordAnalysis.filter(k => k.analysisSucceeded !== false);
    const failedAnalyses = keywordAnalysis.filter(k => k.analysisSucceeded === false);
    
    return {
      appData,
      similarApps,
      mainAppKeywords,
      similarAppKeywords,
      autocompleteSuggestions,
      allKeywords: combinedKeywords,
      keywordAnalysis,
      // Quick access to best opportunities (only from successful analyses)
      topOpportunities: successfulAnalyses.filter(k => k.recommendation === 'excellent' || k.recommendation === 'good'),
      summary: {
        total: keywordAnalysis.length,
        analyzed: successfulAnalyses.length,
        failed: failedAnalyses.length,
        excellent: successfulAnalyses.filter(k => k.recommendation === 'excellent').length,
        good: successfulAnalyses.filter(k => k.recommendation === 'good').length,
        consider: successfulAnalyses.filter(k => k.recommendation === 'consider').length,
        challenging: successfulAnalyses.filter(k => k.recommendation === 'challenging').length,
        avoid: successfulAnalyses.filter(k => k.recommendation === 'avoid').length
      }
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Save analysis results to files
 */
function saveResultsToFile(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const appName = results.appData.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const baseFilename = `${appName}_${timestamp}`;

  // Create results directory if it doesn't exist
  const resultsDir = path.join(process.cwd(), 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  // Save full JSON results
  const jsonFilename = path.join(resultsDir, `${baseFilename}.json`);
  fs.writeFileSync(jsonFilename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved to: ${jsonFilename}`);

  // Save human-readable summary
  const summaryFilename = path.join(resultsDir, `${baseFilename}_summary.txt`);
  const summary = generateSummaryText(results);
  fs.writeFileSync(summaryFilename, summary);
  console.log(`💾 Summary saved to: ${summaryFilename}`);
}

/**
 * Generate human-readable summary text
 * Handles both full results format and intermediate summary format
 */
function generateSummaryText(results) {
  const lines = [];

  // Handle both formats: full results vs intermediate summary
  const isIntermediate = !results.keywordAnalysis; // intermediate format has 'results' directly
  const keywordAnalysis = isIntermediate ? results.results : results.keywordAnalysis;
  const summary = results.summary;

  // Separate successful from failed analyses
  const successfulAnalyses = keywordAnalysis.filter(k => k.analysisSucceeded !== false);
  const failedAnalyses = keywordAnalysis.filter(k => k.analysisSucceeded === false);

  lines.push('='.repeat(80));
  lines.push('🏆 APP STORE KEYWORD ANALYSIS REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`📱 App: ${results.appData.title}`);
  lines.push(`📊 Analysis Date: ${new Date().toLocaleString()}`);
  if (!isIntermediate) {
    lines.push(`🔍 Competitors Analyzed: ${results.similarApps.length}`);
    lines.push(`🏷️  Total Keywords Found: ${results.allKeywords.length}`);
  } else {
    lines.push(`📈 Progress: ${results.analyzedSoFar}/${results.totalKeywords} keywords analyzed`);
  }
  lines.push('');

  // Summary stats
  lines.push('📊 ANALYSIS SUMMARY');
  lines.push('-'.repeat(50));
  lines.push(`Total Keywords: ${keywordAnalysis.length}`);
  lines.push(`Successfully Analyzed: ${successfulAnalyses.length}`);
  if (failedAnalyses.length > 0) {
    lines.push(`⚠️  Failed to Analyze: ${failedAnalyses.length} (API returned no data)`);
  }
  lines.push(`🌟 Top Opportunities: ${summary.excellent + summary.good}`);
  lines.push(`📋 Worth Considering: ${summary.consider}`);
  lines.push(`⚠️  Challenging: ${summary.challenging}`);
  lines.push(`❌ Avoid: ${summary.avoid}`);
  lines.push('');

  // Top opportunities (only from successful analyses)
  const topOpportunities = successfulAnalyses.filter(k =>
    k.recommendation === 'excellent' || k.recommendation === 'good'
  );

  if (topOpportunities.length > 0) {
    lines.push('🌟 TOP KEYWORD OPPORTUNITIES');
    lines.push('-'.repeat(50));
    topOpportunities.slice(0, 20).forEach((k, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      lines.push(`${medal} ${k.keyword.padEnd(30)} | Traffic: ${String(k.traffic).padStart(3)} | Difficulty: ${String(k.difficulty).padStart(3)} | Opportunity: ${k.opportunity} | ${k.recommendation.toUpperCase()}`);
    });
    if (topOpportunities.length > 20) {
      lines.push(`   ... and ${topOpportunities.length - 20} more`);
    }
    lines.push('');
  }

  // Worth considering (only from successful analyses)
  const worthConsidering = successfulAnalyses.filter(k => k.recommendation === 'consider').slice(0, 15);
  if (worthConsidering.length > 0) {
    lines.push('📋 WORTH CONSIDERING');
    lines.push('-'.repeat(50));
    worthConsidering.forEach(k => {
      lines.push(`   ${k.keyword.padEnd(30)} | Traffic: ${String(k.traffic).padStart(3)} | Difficulty: ${String(k.difficulty).padStart(3)} | Opportunity: ${k.opportunity}`);
    });
    lines.push('');
  }

  // Failed analyses
  if (failedAnalyses.length > 0) {
    lines.push('🔧 FAILED ANALYSES (need retry)');
    lines.push('-'.repeat(50));
    lines.push(`${failedAnalyses.length} keywords could not be analyzed. These should be retried.`);
    failedAnalyses.slice(0, 10).forEach(k => {
      lines.push(`   - ${k.keyword}`);
    });
    if (failedAnalyses.length > 10) {
      lines.push(`   ... and ${failedAnalyses.length - 10} more`);
    }
    lines.push('');
  }

  // Keyword sources (only for full results, not intermediate)
  if (!isIntermediate) {
    lines.push('🔍 KEYWORD SOURCES');
    lines.push('-'.repeat(50));
    lines.push(`Main App Keywords: ${results.mainAppKeywords.length}`);
    lines.push(`Competitor Keywords: ${results.similarAppKeywords.length}`);
    lines.push(`Autocomplete Suggestions: ${results.autocompleteSuggestions.length}`);
    lines.push('');

    // Recommendations
    lines.push('🎯 BUSINESS RECOMMENDATIONS');
    lines.push('-'.repeat(50));
    if (topOpportunities.length > 0) {
      lines.push('✅ PRIORITIZE: Focus ASO efforts on the top opportunities above');
      lines.push('   These keywords offer the best traffic-to-difficulty ratio');
    } else {
      lines.push('📊 CONSIDER: Review "worth considering" keywords for potential');
      lines.push('   Look for keywords that align with your app\'s core features');
    }
    lines.push('');
    lines.push('💡 NEXT STEPS:');
    lines.push('   1. Test top keywords in app title and description');
    lines.push('   2. Monitor ranking improvements over 2-4 weeks');
    lines.push('   3. Re-run analysis quarterly as market changes');
  } else {
    // Progress indicator for intermediate summaries
    lines.push('📈 ANALYSIS IN PROGRESS');
    lines.push('-'.repeat(50));
    lines.push(`Progress: ${results.analyzedSoFar}/${results.totalKeywords} keywords analyzed`);
    lines.push(`Last updated: ${new Date(results.lastUpdated).toLocaleString()}`);
    lines.push('');
    lines.push('💡 This summary will update automatically every 10 keywords.');
    lines.push('   Check back later for more complete results!');
  }

  return lines.join('\n');
}

// Export for use in other modules
module.exports = {
  analyzeApp
};

// If run directly, get app ID from command line arguments
if (require.main === module) {
  const appId = process.argv[2];

  if (!appId) {
    console.error('❌ Please provide an app ID as argument');
    console.log('Usage: node main.js <appId>');
    console.log('Example: node main.js 310633997');
    process.exit(1);
  }

  // Run analysis (results and summaries are saved incrementally during analysis)
  analyzeApp(appId).then(results => {
    if (results) {
      const appName = results.appData.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      console.log('\n✅ Analysis complete! Check the results/ directory for:');
      console.log(`   📁 App folder: results/${appName}/`);
      console.log(`   📄 Final JSON: ${appName}/progressive_final.json`);
      console.log(`   📊 Summary: ${appName}/progressive_summary.txt`);
      console.log(`   📈 Progress: ${appName}/progressive.json`);
    }
  }).catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}