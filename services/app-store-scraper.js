const store = require('app-store-scraper');

/**
 * App Store scraper service
 * Fetches app data, similar apps, and search suggestions
 */
async function getAppData(trackId) {
  try {
    // Validate trackId is numeric
    const numericTrackId = parseInt(trackId, 10);
    if (isNaN(numericTrackId)) {
      throw new Error('Invalid trackId. Must be a numeric value.');
    }

    // Fetch app data from app-store-scraper
    const appData = await store.app({ id: numericTrackId });
    
    // Return structured data with title, description, and screenshots
    return {
      title: appData.title,
      description: appData.description,
      genres: appData.genres || [],
      screenshots: appData.screenshots || []
    };
    
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('404')) {
      throw new Error('App not found');
    }
    throw new Error(`Failed to fetch app data: ${error.message}`);
  }
}

/**
 * Get similar apps by track ID
 */
async function getSimilarApps(trackId) {
  try {
    // Validate trackId is numeric
    const numericTrackId = parseInt(trackId, 10);
    if (isNaN(numericTrackId)) {
      throw new Error('Invalid trackId. Must be a numeric value.');
    }

    // Fetch similar apps data from app-store-scraper
    const similarApps = await store.similar({ id: numericTrackId });
    
    return similarApps;
    
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('404')) {
      throw new Error('App not found');
    }
    throw new Error(`Failed to fetch similar apps: ${error.message}`);
  }
}

/**
 * Get App Store search suggestions (autocomplete)
 * These are PROVEN user searches - what real users type
 */
async function getSearchSuggestions(term) {
  try {
    if (!term || term.trim().length === 0) {
      return [];
    }

    // Use app-store-scraper's suggest function
    const suggestions = await store.suggest({ term: term.trim() });
    
    // Extract just the search terms
    return suggestions.map(s => s.term || s);
    
  } catch (error) {
    // Suggestions failing shouldn't break the whole flow
    console.warn(`Could not get suggestions for "${term}": ${error.message}`);
    return [];
  }
}

module.exports = {
  getAppData,
  getSimilarApps,
  getSearchSuggestions
};