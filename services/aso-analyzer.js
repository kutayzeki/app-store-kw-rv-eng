const { ASO } = require('aso-v2');

/**
 * ASO keyword analysis service using aso-v2
 */
class ASOAnalyzer {
  constructor(platform = 'gplay') {
    // Initialize ASO for specified platform ('gplay' or 'itunes')
    this.aso = new ASO(platform);
    this.platform = platform;
  }

  /**
   * Analyzes a single keyword for traffic and difficulty scores
   * @param {string} keyword - The keyword to analyze
   * @returns {Promise<Object>} Analysis results with traffic and difficulty scores
   */
  async analyzeKeyword(keyword) {
    try {
      console.log(`Analyzing keyword: "${keyword}" on ${this.platform}...`);
      
      // Get keyword analysis from ASO-V2
      const analysis = await this.aso.analyzeKeyword(keyword);
      
      // DEFENSIVE PARSING: Check if we got valid data back
      // Some keywords return undefined/null when there's no data (not an error, just no results)
      if (!analysis || typeof analysis !== 'object') {
        throw new Error('ASO returned empty or invalid response');
      }
      
      // Check if traffic object exists and has a score
      if (!analysis.traffic || analysis.traffic.score === undefined || analysis.traffic.score === null) {
        throw new Error('No traffic data returned - keyword may have no search volume');
      }
      
      // Check if difficulty object exists and has a score
      if (!analysis.difficulty || analysis.difficulty.score === undefined || analysis.difficulty.score === null) {
        throw new Error('No difficulty data returned - insufficient ranking data');
      }
      
      // Extract scores from the correct properties
      const trafficScore = analysis.traffic.score;
      const difficultyScore = analysis.difficulty.score;
      
      // Convert to 0-100 scale (ASO-V2 uses 0-10 scale)
      const trafficScore100 = Math.round(trafficScore * 10);
      const difficultyScore100 = Math.round(difficultyScore * 10);
      
      return {
        keyword: keyword,
        platform: this.platform,
        trafficScore: trafficScore100,
        difficultyScore: difficultyScore100,
        competitionLevel: this.getCompetitionLevel(difficultyScore100),
        trafficLevel: this.getTrafficLevel(trafficScore100),
        recommendation: this.getRecommendation(trafficScore100, difficultyScore100),
        analysisSucceeded: true,
        rawData: analysis,
        // Include detailed breakdown
        details: {
          traffic: {
            original: trafficScore,
            scaled: trafficScore100,
            breakdown: analysis.traffic
          },
          difficulty: {
            original: difficultyScore,
            scaled: difficultyScore100,
            breakdown: analysis.difficulty
          }
        }
      };
      
    } catch (error) {
      console.error(`Error analyzing keyword "${keyword}":`, error.message);
      return {
        keyword: keyword,
        platform: this.platform,
        trafficScore: null,  // null instead of 0 - distinguishes "failed" from "actually zero"
        difficultyScore: null,
        competitionLevel: 'unknown',
        trafficLevel: 'unknown',
        recommendation: 'analysis_failed',
        analysisSucceeded: false,
        error: error.message
      };
    }
  }

  /**
   * Analyzes multiple keywords in batch
   * @param {Array<string>} keywords - Array of keywords to analyze
   * @returns {Promise<Array<Object>>} Array of analysis results
   */
  async analyzeKeywords(keywords) {
    console.log(`Analyzing ${keywords.length} keywords on ${this.platform}...`);
    
    const results = [];
    
    // Process keywords with delay to avoid rate limiting
    for (const keyword of keywords) {
      const analysis = await this.analyzeKeyword(keyword);
      results.push(analysis);
      
      // Add small delay between requests
      await this.delay(500);
    }
    
    return results;
  }

  /**
   * Gets human-readable competition level
   * @param {number} difficultyScore - Difficulty score (0-100)
   * @returns {string} Competition level description
   */
  getCompetitionLevel(difficultyScore) {
    if (difficultyScore >= 80) return 'very_high';
    if (difficultyScore >= 60) return 'high';
    if (difficultyScore >= 40) return 'medium';
    if (difficultyScore >= 20) return 'low';
    return 'very_low';
  }

  /**
   * Gets human-readable traffic level
   * @param {number} trafficScore - Traffic score (0-100)
   * @returns {string} Traffic level description
   */
  getTrafficLevel(trafficScore) {
    if (trafficScore >= 80) return 'very_high';
    if (trafficScore >= 60) return 'high';
    if (trafficScore >= 40) return 'medium';
    if (trafficScore >= 20) return 'low';
    return 'very_low';
  }

  /**
   * Provides keyword recommendation based on traffic and difficulty
   * CALIBRATED FOR REAL APP STORE DATA:
   * - Most niche keywords have traffic scores of 10-30
   * - Traffic 40+ is already considered good volume
   * - Traffic 60+ is high-volume competitive terms
   * 
   * @param {number} trafficScore - Traffic score (0-100)
   * @param {number} difficultyScore - Difficulty score (0-100)
   * @returns {string} Recommendation
   */
  getRecommendation(trafficScore, difficultyScore) {
    // EXCELLENT: Good traffic with low competition - prioritize these!
    // Traffic >= 25 (decent search volume) + Difficulty <= 35 (easy to rank)
    if (trafficScore >= 25 && difficultyScore <= 35) return 'excellent';
    
    // GOOD: Moderate traffic with manageable competition
    // Traffic >= 15 (some volume) + Difficulty <= 45 (winnable)
    if (trafficScore >= 15 && difficultyScore <= 45) return 'good';
    
    // CHALLENGING: High traffic but very competitive
    // Worth it only if it's core to your app
    if (trafficScore >= 40 && difficultyScore >= 60) return 'challenging';
    
    // AVOID: Low traffic + high difficulty = waste of effort
    if (trafficScore <= 15 && difficultyScore >= 50) return 'avoid';
    
    // CONSIDER: Everything else - evaluate case by case
    return 'consider';
  }

  /**
   * Utility function to add delay between requests
   * @param {number} ms - Milliseconds to wait
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Analyzes keyword opportunities by finding the best keywords from a list
   * @param {Array<string>} keywords - Keywords to analyze
   * @param {number} topN - Number of top keywords to return (default: 10)
   * @returns {Promise<Object>} Analysis summary with top keywords
   */
  async findKeywordOpportunities(keywords, topN = 10) {
    const analyses = await this.analyzeKeywords(keywords);
    
    // Sort by recommendation score (excellent > good > consider > challenging > avoid)
    const recommendationOrder = { excellent: 5, good: 4, consider: 3, challenging: 2, avoid: 1, analysis_failed: 0 };
    
    const sortedKeywords = analyses.sort((a, b) => {
      // First sort by recommendation
      const recDiff = recommendationOrder[b.recommendation] - recommendationOrder[a.recommendation];
      if (recDiff !== 0) return recDiff;
      
      // Then by traffic score
      const trafficDiff = b.trafficScore - a.trafficScore;
      if (trafficDiff !== 0) return trafficDiff;
      
      // Finally by inverse difficulty (lower is better)
      return a.difficultyScore - b.difficultyScore;
    });
    
    return {
      platform: this.platform,
      totalAnalyzed: analyses.length,
      topOpportunities: sortedKeywords.slice(0, topN),
      summary: {
        excellent: analyses.filter(a => a.recommendation === 'excellent').length,
        good: analyses.filter(a => a.recommendation === 'good').length,
        consider: analyses.filter(a => a.recommendation === 'consider').length,
        challenging: analyses.filter(a => a.recommendation === 'challenging').length,
        avoid: analyses.filter(a => a.recommendation === 'avoid').length,
        failed: analyses.filter(a => a.recommendation === 'analysis_failed').length
      }
    };
  }
}

module.exports = {
  ASOAnalyzer
};