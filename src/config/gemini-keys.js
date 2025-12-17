import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Safety settings for NSFW content - set to BLOCK_NONE to allow explicit content
const NSFW_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Default safety settings (more restrictive)
const DEFAULT_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Gemini API Key Rotation Manager
class GeminiKeyManager {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.keyStats = new Map(); // Track usage per key
    this.cooldowns = new Map(); // Track rate-limited keys
    this.models = new Map(); // Cache model instances
    this.keysLoaded = false;
  }
  
  // Load keys from environment (lazy loading)
  loadKeys() {
    if (this.keysLoaded) return;
    
    // Primary key
    if (process.env.GEMINI_API_KEY) {
      this.addKey(process.env.GEMINI_API_KEY, 'primary');
    }
    
    // Additional keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
    for (let i = 2; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.addKey(key, `key_${i}`);
      }
    }
    
    this.keysLoaded = true;
    console.log(`🔑 Loaded ${this.keys.length} Gemini API key(s)`);
  }
  
  // Add a key to the rotation
  addKey(apiKey, label = 'unknown') {
    const keyId = this.keys.length;
    this.keys.push({ apiKey, label, id: keyId });
    this.keyStats.set(keyId, { 
      requests: 0, 
      errors: 0, 
      lastUsed: null,
      rateLimited: false 
    });
  }
  
  // Get the next available key (round-robin with cooldown check)
  // Ensures keys are loaded first
  getNextKey() {
    this.loadKeys(); // Lazy load keys
    
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured. Add GEMINI_API_KEY to your .env file.');
    }
    
    const now = Date.now();
    let attempts = 0;
    
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      const cooldownUntil = this.cooldowns.get(key.id);
      
      // Check if key is on cooldown
      if (!cooldownUntil || now > cooldownUntil) {
        this.cooldowns.delete(key.id);
        const selectedKey = key;
        
        // Move to next key for next request
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        
        return selectedKey;
      }
      
      // Try next key
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }
    
    // All keys on cooldown, return the one with shortest cooldown
    let shortestCooldown = Infinity;
    let bestKey = this.keys[0];
    
    for (const key of this.keys) {
      const cooldown = this.cooldowns.get(key.id) || 0;
      if (cooldown < shortestCooldown) {
        shortestCooldown = cooldown;
        bestKey = key;
      }
    }
    
    return bestKey;
  }
  
  // Get a model instance for the current key
  // options.nsfw = true will use relaxed safety settings for NSFW content
  getModel(modelName = 'gemini-2.5-flash', options = {}) {
    const key = this.getNextKey();
    const isNsfw = options.nsfw || false;
    const cacheKey = `${key.id}_${modelName}_${isNsfw ? 'nsfw' : 'sfw'}`;
    
    if (!this.models.has(cacheKey)) {
      const genAI = new GoogleGenerativeAI(key.apiKey);
      const safetySettings = isNsfw ? NSFW_SAFETY_SETTINGS : DEFAULT_SAFETY_SETTINGS;
      
      this.models.set(cacheKey, {
        model: genAI.getGenerativeModel({ 
          model: modelName,
          safetySettings
        }),
        keyId: key.id,
        label: key.label
      });
    }
    
    const cached = this.models.get(cacheKey);
    
    // Update stats
    const stats = this.keyStats.get(key.id);
    stats.requests++;
    stats.lastUsed = new Date();
    
    return {
      model: cached.model,
      keyId: key.id,
      label: key.label
    };
  }
  
  // Report an error for a key (for rate limiting)
  reportError(keyId, error) {
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.errors++;
    }
    
    // Check if rate limited
    const errorMsg = error?.message?.toLowerCase() || '';
    if (errorMsg.includes('rate') || errorMsg.includes('quota') || errorMsg.includes('429')) {
      // Put key on cooldown for 60 seconds
      this.cooldowns.set(keyId, Date.now() + 60000);
      stats.rateLimited = true;
      console.log(`⚠️ Gemini key ${keyId} rate limited, cooling down for 60s`);
    }
  }
  
  // Report success (clear rate limit flag)
  reportSuccess(keyId) {
    const stats = this.keyStats.get(keyId);
    if (stats) {
      stats.rateLimited = false;
    }
  }
  
  // Generate content with automatic retry on different key
  // options.nsfw = true will use relaxed safety settings for explicit content
  async generateContent(prompt, options = {}) {
    // Ensure keys are loaded
    this.loadKeys();
    
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured. Add GEMINI_API_KEY to your .env file.');
    }
    
    const maxRetries = Math.min(this.keys.length, 3);
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { model, keyId, label } = this.getModel(options.model, { nsfw: options.nsfw });
      
      try {
        const result = await model.generateContent(prompt);
        this.reportSuccess(keyId);
        return {
          result,
          keyUsed: label
        };
      } catch (error) {
        lastError = error;
        this.reportError(keyId, error);
        console.error(`Gemini API error (key ${label}):`, error?.message || error);
        
        if (attempt < maxRetries - 1) {
          console.log(`🔄 Retrying with different key (attempt ${attempt + 2}/${maxRetries})`);
        }
      }
    }
    
    throw lastError || new Error('All Gemini API keys failed');
  }
  
  // Get stats for all keys
  getStats() {
    const stats = [];
    for (const key of this.keys) {
      const keyStats = this.keyStats.get(key.id);
      const cooldown = this.cooldowns.get(key.id);
      stats.push({
        id: key.id,
        label: key.label,
        requests: keyStats.requests,
        errors: keyStats.errors,
        lastUsed: keyStats.lastUsed,
        rateLimited: keyStats.rateLimited,
        onCooldown: cooldown ? cooldown > Date.now() : false,
        cooldownRemaining: cooldown ? Math.max(0, Math.ceil((cooldown - Date.now()) / 1000)) : 0
      });
    }
    return stats;
  }
  
  // Get total key count
  getKeyCount() {
    return this.keys.length;
  }
}

// Singleton instance
export const geminiKeys = new GeminiKeyManager();

// Helper function for easy content generation
export async function generateWithRotation(prompt, options = {}) {
  return geminiKeys.generateContent(prompt, options);
}

export default geminiKeys;
