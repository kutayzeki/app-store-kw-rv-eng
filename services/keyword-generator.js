require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const { KEYWORD_FUNCTION } = require('../tools/keyword-tool');

// Initialize Gemini client with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Downloads image from URL and converts to base64 with proper media type detection
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<Object>} Object with base64 string and mediaType
 */
async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect image format from Content-Type header or URL extension
    let mediaType = 'image/jpeg'; // default
    const contentType = response.headers.get('content-type');

    if (contentType) {
      if (contentType.includes('image/png')) {
        mediaType = 'image/png';
      } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
        mediaType = 'image/jpeg';
      } else if (contentType.includes('image/webp')) {
        mediaType = 'image/webp';
      } else if (contentType.includes('image/gif')) {
        mediaType = 'image/gif';
      }
    } else {
      // Fallback to URL extension
      if (imageUrl.toLowerCase().includes('.png')) {
        mediaType = 'image/png';
      } else if (imageUrl.toLowerCase().includes('.webp')) {
        mediaType = 'image/webp';
      } else if (imageUrl.toLowerCase().includes('.gif')) {
        mediaType = 'image/gif';
      }
    }

    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mediaType
      }
    };
  } catch (error) {
    console.error(`Error fetching image ${imageUrl}:`, error);
    throw new Error(`Failed to fetch image: ${imageUrl}`);
  }
}

/**
 * Generates relevant search keywords from app store data using Gemini 1.5 Flash
 * @param {Object} appData - Object containing title, description, and screenshots (image paths)
 * @returns {Promise<Object>} JSON object with structure: { "keywords": [string] }
 */
async function generateKeywords(appData) {
  try {
    // Transform KEYWORD_FUNCTION for Gemini
    const tools = [
      {
        functionDeclarations: [
          {
            name: KEYWORD_FUNCTION.name,
            description: KEYWORD_FUNCTION.description,
            parameters: {
              type: "OBJECT",
              properties: {
                keywords: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                  description: KEYWORD_FUNCTION.input_schema.properties.keywords.description
                }
              },
              required: ["keywords"]
            }
          }
        ]
      }
    ];

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: tools,
      toolConfig: { functionCallingConfig: { mode: "ANY" } }
    });

    const prompt = `Analyze this app store data and generate the most relevant search keywords that users would likely use to find this app:

Title: ${appData.title}

Description: ${appData.description}

I'm also providing screenshots of the app store page. Using the information provided in the screenshots, and the description of the app, provide the most relevant search queries directly related to the app and the information provided in screenshots, title, subtitle and description. ensuring only keywords/search queries that would be exact search phrases derived from title, subtitle, app screenshots, and description. exclude long tail keywords, "* app" search phrases and any search phrases a user just wouldnt search, only keywords that are relevant to title, subtitle, screenshots, and description (if not matching context to all these elements then ignore), must have a relevancy score of atleast 95%. Please create at least 20 keywords.

Use the generate_app_keywords function to return your response with the identified keywords.`;

    const parts = [prompt];

    // Add screenshot images to the parts
    for (const screenshot of appData.screenshots) {
      try {
        const imageData = await fetchImageAsBase64(screenshot);
        parts.push(imageData);
      } catch (error) {
        console.warn(`⚠️ Failed to process screenshot: ${error.message}`);
      }
    }

    // Call Gemini API
    const result = await model.generateContent(parts);
    const response = await result.response;
    const functionCall = response.candidates[0].content.parts.find(part => part.functionCall);
    
    if (functionCall && functionCall.functionCall.name === 'generate_app_keywords') {
      return { keywords: functionCall.functionCall.args.keywords };
    } else {
      throw new Error('No valid function call found in Gemini response');
    }

  } catch (error) {
    console.error('Error generating keywords:', error.message);
    throw error;
  }
}

module.exports = {
  generateKeywords
};