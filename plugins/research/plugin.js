import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { researchOps } from '../../src/database/db.js';

/**
 * Research Plugin
 * 
 * Provides AI-powered research and web search functionality.
 * 
 * Features:
 * - AI-powered research using Gemini
 * - Research history tracking
 * - SMB file saving
 * - Web search integration
 * - Database persistence
 */
export default class ResearchPlugin extends Plugin {
  constructor() {
    super('1.0.0.0-beta', '1.0.0', 'AI-powered research and web search');
    this.logger = createLogger('research');
  }
  
  async onLoad() {
    this.logger.info('🔎 Research plugin loaded');
    this.logger.info('   Features: AI Research, Web Search, History');
  }
  
  async onUnload() {
    this.logger.info('🔎 Research plugin unloaded');
  }
  
  // Perform AI-powered research
  async webResearch(query, userId = null) {
    this.logger.info('🔎 Researching:', query);
    const prompt = `Research this topic and provide a comprehensive summary: ${query}
    
    Include:
    - Key findings
    - Important facts
    - Relevant data
    - Sources if possible
    
    Format as a clear, organized response.`;

    let responseText = '';
    let successful = false;

    try {
      const { result, keyUsed } = await this.requestFromCore('gemini-generate', { prompt });
      const response = result.response;
      
      if (response && typeof response.text === 'function' && response.candidates && response.candidates.length > 0) {
        responseText = response.text();
        successful = true;
        this.logger.info(`✅ Research completed using key: ${keyUsed}`);
      } else {
        const finishReason = response?.promptFeedback?.blockReason || 'unknown reason';
        responseText = `Research blocked or failed. Reason: ${finishReason}`;
        this.logger.warn(`Research for query "${query}" failed. Reason: ${finishReason}`, response);
      }
    } catch (error) {
      this.logger.error(`Error during web research for query "${query}":`, error);
      responseText = `An internal error occurred during research. Details: ${error.message}`;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `research_${query.replace(/\s+/g, '_').substring(0, 30)}_${timestamp}.txt`;
    const content = `Research Query: ${query}\n\nDate: ${new Date().toISOString()}\n\nResult:\n${responseText}`;
    
    let smbSaveResult = { savedToSMB: false, error: null };
    try {
      smbSaveResult = await this.requestFromCore('smb-save', { filename, content });
    } catch(smbError) {
      this.logger.error('SMB save error during research logging:', smbError);
      smbSaveResult.error = smbError.message;
    }

    try {
      researchOps.add({
        query,
        result: responseText,
        filename,
        savedToSmb: smbSaveResult.savedToSMB,
        userId
      });
    } catch (dbError) {
      this.logger.error('CRITICAL: Failed to save research log to database even after sanitizing.', dbError);
      throw dbError;
    }
    
    if (!successful) {
      throw new Error(responseText);
    }

    return { response: responseText, filename, savedToSmb: smbSaveResult.savedToSMB };
  }
  
  // Get research history
  getHistory(limit = 10) {
    return researchOps.getRecent(limit);
  }
  
  // Search research history
  searchHistory(searchTerm) {
    return researchOps.search(searchTerm);
  }
}
