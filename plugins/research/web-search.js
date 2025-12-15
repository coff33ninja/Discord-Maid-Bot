/**
 * Web Search Module
 * 
 * Provides web search functionality using DuckDuckGo Instant Answer API.
 * 
 * @module plugins/research/web-search
 */

import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('web-search');

/**
 * Search result structure
 * @typedef {Object} SearchResult
 * @property {string} title - Result title
 * @property {string} snippet - Result description/snippet
 * @property {string} url - Result URL
 */

/**
 * Search response structure
 * @typedef {Object} SearchResponse
 * @property {string} query - Original search query
 * @property {SearchResult[]} results - Array of search results
 * @property {string} searchUrl - Direct search URL
 * @property {number} totalResults - Number of results returned
 */

/**
 * Search the web using DuckDuckGo Instant Answer API
 * 
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results (1-10, default 5)
 * @returns {Promise<SearchResponse>} Search results
 */
export async function searchWeb(query, maxResults = 5) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query is required');
  }
  
  // Clamp maxResults to valid range
  const limit = Math.min(10, Math.max(1, maxResults));
  
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  
  try {
    // DuckDuckGo Instant Answer API
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    logger.debug(`Searching DuckDuckGo for: ${query}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Discord-Maid-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }
    
    const data = await response.json();
    const results = [];
    
    // Add abstract (main answer) if available
    if (data.AbstractText && data.AbstractText.trim()) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || searchUrl,
        type: 'abstract'
      });
    }
    
    // Add answer if available (for calculations, conversions, etc.)
    if (data.Answer && data.Answer.trim()) {
      results.push({
        title: 'Answer',
        snippet: data.Answer,
        url: searchUrl,
        type: 'answer'
      });
    }
    
    // Add definition if available
    if (data.Definition && data.Definition.trim()) {
      results.push({
        title: 'Definition',
        snippet: data.Definition,
        url: data.DefinitionURL || searchUrl,
        type: 'definition'
      });
    }
    
    // Add related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= limit) break;
        
        // Skip nested topics (categories)
        if (topic.Topics) continue;
        
        if (topic.Text && topic.FirstURL) {
          // Extract title from text (usually "Title - Description" format)
          const parts = topic.Text.split(' - ');
          const title = parts[0] || topic.Text.substring(0, 50);
          
          results.push({
            title: title.trim(),
            snippet: topic.Text,
            url: topic.FirstURL,
            type: 'related'
          });
        }
      }
    }
    
    // Add results from Results array if available
    if (data.Results && Array.isArray(data.Results)) {
      for (const result of data.Results) {
        if (results.length >= limit) break;
        
        if (result.Text && result.FirstURL) {
          results.push({
            title: result.Text.substring(0, 100),
            snippet: result.Text,
            url: result.FirstURL,
            type: 'result'
          });
        }
      }
    }
    
    logger.info(`Web search for "${query}" returned ${results.length} results`);
    
    return {
      query,
      results: results.slice(0, limit),
      searchUrl,
      totalResults: results.length,
      source: 'duckduckgo'
    };
    
  } catch (error) {
    logger.error(`Web search error for "${query}":`, error);
    
    // Return empty results with search URL so user can search manually
    return {
      query,
      results: [],
      searchUrl,
      totalResults: 0,
      error: error.message,
      source: 'duckduckgo'
    };
  }
}

/**
 * Format search results for Discord display
 * 
 * @param {SearchResponse} response - Search response
 * @returns {string} Formatted string for Discord
 */
export function formatSearchResults(response) {
  if (!response.results || response.results.length === 0) {
    if (response.error) {
      return `❌ Search failed: ${response.error}\n\n` +
        `Try searching directly: [DuckDuckGo](${response.searchUrl})`;
    }
    return `🔎 No instant results for "${response.query}"\n\n` +
      `Try searching directly: [DuckDuckGo](${response.searchUrl})`;
  }
  
  let output = `**🔎 Search: ${response.query}**\n\n`;
  
  for (const result of response.results) {
    // Truncate snippet if too long
    const snippet = result.snippet.length > 200 
      ? result.snippet.substring(0, 200) + '...' 
      : result.snippet;
    
    output += `**${result.title}**\n`;
    output += `${snippet}\n`;
    output += `[Link](${result.url})\n\n`;
  }
  
  output += `_[More results](${response.searchUrl})_`;
  
  return output;
}

/**
 * Check if a query looks like a factual question
 * 
 * @param {string} query - User's message
 * @returns {boolean} True if it looks like a factual question
 */
export function isFactualQuestion(query) {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  
  // Question patterns that suggest factual lookup
  const factualPatterns = [
    /^what\s+is\s+/i,
    /^who\s+is\s+/i,
    /^when\s+(?:was|did|is)\s+/i,
    /^where\s+is\s+/i,
    /^how\s+(?:many|much|old|tall|long)\s+/i,
    /^why\s+(?:is|are|do|does)\s+/i,
    /\?$/  // Ends with question mark
  ];
  
  return factualPatterns.some(pattern => pattern.test(lowerQuery));
}

export default {
  searchWeb,
  formatSearchResults,
  isFactualQuestion
};
