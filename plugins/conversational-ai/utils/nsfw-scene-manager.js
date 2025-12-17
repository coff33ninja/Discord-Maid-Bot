/**
 * NSFW Scene Manager
 * 
 * Manages scene state, settings, locations, and immersive features
 * for NSFW roleplay channels.
 * 
 * @module plugins/conversational-ai/utils/nsfw-scene-manager
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('nsfw-scene-manager');

// ============ SCENARIO PRESETS ============
export const SCENARIO_PRESETS = {
  bedroom: {
    name: '🛏️ Bedroom',
    description: 'A cozy, intimate bedroom with soft lighting',
    setting: 'You are in a luxurious bedroom with silk sheets, dim candlelight, and soft music playing.',
    mood: 'intimate'
  },
  office: {
    name: '🏢 Office',
    description: 'A private office after hours',
    setting: 'You are in a corner office late at night. The city lights twinkle through the windows. The desk is cleared...',
    mood: 'forbidden'
  },
  beach: {
    name: '🏖️ Private Beach',
    description: 'A secluded beach at sunset',
    setting: 'You are on a private beach as the sun sets. Warm sand, gentle waves, and complete privacy.',
    mood: 'romantic'
  },
  dungeon: {
    name: '⛓️ Dungeon',
    description: 'A well-equipped BDSM dungeon',
    setting: 'You are in a private dungeon with restraints, toys, and everything needed for intense play.',
    mood: 'dominant'
  },
  hotspring: {
    name: '♨️ Hot Spring',
    description: 'A steamy Japanese onsen',
    setting: 'You are in a private hot spring, steam rising around you, completely nude and relaxed.',
    mood: 'sensual'
  },
  mansion: {
    name: '🏰 Mansion',
    description: 'A wealthy estate with many rooms',
    setting: 'You are in a grand mansion with endless rooms to explore and get lost in together.',
    mood: 'adventurous'
  },
  forest: {
    name: '🌲 Enchanted Forest',
    description: 'A magical forest clearing',
    setting: 'You are in a moonlit forest clearing, surrounded by fireflies and soft moss.',
    mood: 'mystical'
  },
  spaceship: {
    name: '🚀 Spaceship',
    description: 'A private cabin on a starship',
    setting: 'You are in a private cabin aboard a luxury starship, stars streaming past the viewport.',
    mood: 'futuristic'
  },
  pool: {
    name: '🏊 Pool Party',
    description: 'A private pool at night',
    setting: 'You are at a private pool party. The water is warm, the lights are low, and inhibitions are gone.',
    mood: 'playful'
  },
  classroom: {
    name: '📚 After Class',
    description: 'An empty classroom after hours',
    setting: 'You are in an empty classroom after everyone has left. The door is locked...',
    mood: 'taboo'
  }
};

// ============ INTENSITY LEVELS ============
export const INTENSITY_LEVELS = {
  gentle: {
    name: '💕 Gentle',
    description: 'Soft, romantic, tender',
    modifier: 'Be gentle, romantic, and tender. Focus on emotional connection, soft touches, and sweet words.'
  },
  passionate: {
    name: '🔥 Passionate', 
    description: 'Heated, intense, eager',
    modifier: 'Be passionate and intense. Show desire and eagerness. Balance emotion with physical intensity.'
  },
  rough: {
    name: '💢 Rough',
    description: 'Dominant, intense, primal',
    modifier: 'Be rough and dominant. Use commanding language, physical intensity, and primal energy.'
  },
  extreme: {
    name: '⚡ Extreme',
    description: 'No holds barred',
    modifier: 'Go all out. Maximum intensity, explicit detail, and uninhibited expression. Push boundaries.'
  }
};

// ============ KINK TAGS ============
export const KINK_TAGS = {
  // Preferences (things user likes)
  preferences: {
    vanilla: '🍦 Vanilla',
    bdsm: '⛓️ BDSM',
    roleplay: '🎭 Roleplay',
    dirty_talk: '🗣️ Dirty Talk',
    teasing: '😏 Teasing',
    worship: '🙇 Worship',
    exhibitionism: '👀 Exhibitionism',
    toys: '🎀 Toys',
    multiple: '👥 Multiple Partners',
    oral: '👅 Oral',
    anal: '🍑 Anal'
  },
  // Limits (things to avoid)
  limits: {
    no_pain: '🚫 No Pain',
    no_degradation: '🚫 No Degradation', 
    no_blood: '🚫 No Blood',
    no_extreme: '🚫 No Extreme',
    no_public: '🚫 No Public'
  }
};

// ============ SCENE STATE STORAGE ============
// In-memory cache (persisted to DB)
const sceneStates = new Map();

/**
 * Get or create scene state for a channel
 */
export function getSceneState(channelId) {
  if (!sceneStates.has(channelId)) {
    sceneStates.set(channelId, createDefaultState());
  }
  return sceneStates.get(channelId);
}

/**
 * Create default scene state
 */
function createDefaultState() {
  return {
    scenario: null,
    intensity: 'passionate',
    location: null,
    locationDetails: '',
    clothing: new Map(), // participantId -> clothing state
    mood: 'sensual',
    safeWordTriggered: false,
    isPaused: false,
    turnOrder: [],
    currentTurn: 0,
    spectators: new Set(),
    bookmarks: [],
    lastActivity: Date.now(),
    kinks: new Map(), // participantId -> { preferences: [], limits: [] }
    diceEnabled: true,
    autoInitiate: false
  };
}

/**
 * Set scenario for a channel
 */
export async function setScenario(channelId, scenarioKey) {
  const state = getSceneState(channelId);
  const scenario = SCENARIO_PRESETS[scenarioKey];
  
  if (!scenario) {
    return { success: false, error: 'Unknown scenario' };
  }
  
  state.scenario = scenarioKey;
  state.location = scenario.name;
  state.locationDetails = scenario.setting;
  state.mood = scenario.mood;
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  logger.info(`Scene set to ${scenarioKey} in channel ${channelId}`);
  
  return { success: true, scenario };
}

/**
 * Set intensity level
 */
export async function setIntensity(channelId, intensityKey) {
  const state = getSceneState(channelId);
  const intensity = INTENSITY_LEVELS[intensityKey];
  
  if (!intensity) {
    return { success: false, error: 'Unknown intensity level' };
  }
  
  state.intensity = intensityKey;
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  logger.info(`Intensity set to ${intensityKey} in channel ${channelId}`);
  
  return { success: true, intensity };
}

/**
 * Update clothing state for a participant
 */
export async function updateClothing(channelId, participantId, clothingState) {
  const state = getSceneState(channelId);
  state.clothing.set(participantId, clothingState);
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  return { success: true };
}

/**
 * Get clothing state for all participants
 */
export function getClothingStates(channelId) {
  const state = getSceneState(channelId);
  return Object.fromEntries(state.clothing);
}

/**
 * Trigger safe word - pause the scene
 */
export async function triggerSafeWord(channelId) {
  const state = getSceneState(channelId);
  state.safeWordTriggered = true;
  state.isPaused = true;
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  logger.info(`Safe word triggered in channel ${channelId}`);
  
  return { success: true };
}

/**
 * Resume scene after safe word
 */
export async function resumeScene(channelId) {
  const state = getSceneState(channelId);
  state.safeWordTriggered = false;
  state.isPaused = false;
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  logger.info(`Scene resumed in channel ${channelId}`);
  
  return { success: true };
}

/**
 * Check if scene is paused
 */
export function isScenePaused(channelId) {
  const state = getSceneState(channelId);
  return state.isPaused;
}

/**
 * Set turn order for turn-based mode
 */
export async function setTurnOrder(channelId, participantIds) {
  const state = getSceneState(channelId);
  state.turnOrder = participantIds;
  state.currentTurn = 0;
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  return { success: true };
}

/**
 * Advance to next turn
 */
export function advanceTurn(channelId) {
  const state = getSceneState(channelId);
  if (state.turnOrder.length === 0) return null;
  
  state.currentTurn = (state.currentTurn + 1) % state.turnOrder.length;
  state.lastActivity = Date.now();
  
  return state.turnOrder[state.currentTurn];
}

/**
 * Get current turn participant
 */
export function getCurrentTurn(channelId) {
  const state = getSceneState(channelId);
  if (state.turnOrder.length === 0) return null;
  return state.turnOrder[state.currentTurn];
}

/**
 * Add spectator
 */
export async function addSpectator(channelId, participantId) {
  const state = getSceneState(channelId);
  state.spectators.add(participantId);
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  return { success: true };
}

/**
 * Remove spectator (join the action)
 */
export async function removeSpectator(channelId, participantId) {
  const state = getSceneState(channelId);
  state.spectators.delete(participantId);
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  return { success: true };
}

/**
 * Check if user is spectating
 */
export function isSpectator(channelId, participantId) {
  const state = getSceneState(channelId);
  return state.spectators.has(participantId);
}

/**
 * Save bookmark
 */
export async function saveBookmark(channelId, name, description) {
  const state = getSceneState(channelId);
  
  const bookmark = {
    id: Date.now().toString(36),
    name,
    description,
    scenario: state.scenario,
    intensity: state.intensity,
    location: state.location,
    locationDetails: state.locationDetails,
    mood: state.mood,
    timestamp: Date.now()
  };
  
  state.bookmarks.push(bookmark);
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  logger.info(`Bookmark saved: ${name} in channel ${channelId}`);
  
  return { success: true, bookmark };
}

/**
 * Load bookmark
 */
export async function loadBookmark(channelId, bookmarkId) {
  const state = getSceneState(channelId);
  const bookmark = state.bookmarks.find(b => b.id === bookmarkId);
  
  if (!bookmark) {
    return { success: false, error: 'Bookmark not found' };
  }
  
  state.scenario = bookmark.scenario;
  state.intensity = bookmark.intensity;
  state.location = bookmark.location;
  state.locationDetails = bookmark.locationDetails;
  state.mood = bookmark.mood;
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  logger.info(`Bookmark loaded: ${bookmark.name} in channel ${channelId}`);
  
  return { success: true, bookmark };
}

/**
 * Get all bookmarks
 */
export function getBookmarks(channelId) {
  const state = getSceneState(channelId);
  return state.bookmarks;
}

/**
 * Set user kinks/preferences
 */
export async function setUserKinks(channelId, userId, preferences = [], limits = []) {
  const state = getSceneState(channelId);
  state.kinks.set(userId, { preferences, limits });
  state.lastActivity = Date.now();
  
  await saveSceneState(channelId, state);
  return { success: true };
}

/**
 * Get user kinks
 */
export function getUserKinks(channelId, userId) {
  const state = getSceneState(channelId);
  return state.kinks.get(userId) || { preferences: [], limits: [] };
}

/**
 * Get all participants' limits (for AI to respect)
 */
export function getAllLimits(channelId) {
  const state = getSceneState(channelId);
  const allLimits = new Set();
  
  for (const [, kinks] of state.kinks) {
    for (const limit of kinks.limits) {
      allLimits.add(limit);
    }
  }
  
  return Array.from(allLimits);
}

/**
 * Roll dice for random outcomes
 */
export function rollDice(sides = 20, modifier = 0) {
  const roll = Math.floor(Math.random() * sides) + 1;
  const total = roll + modifier;
  
  let outcome = 'normal';
  if (roll === 1) outcome = 'critical_fail';
  else if (roll === sides) outcome = 'critical_success';
  else if (roll >= sides * 0.75) outcome = 'success';
  else if (roll <= sides * 0.25) outcome = 'fail';
  
  return { roll, modifier, total, sides, outcome };
}

/**
 * Build scene context for AI prompt
 */
export function buildSceneContext(channelId) {
  const state = getSceneState(channelId);
  const parts = [];
  
  // Scenario/Location
  if (state.scenario && SCENARIO_PRESETS[state.scenario]) {
    const scenario = SCENARIO_PRESETS[state.scenario];
    parts.push(`**Current Setting:** ${scenario.name}`);
    parts.push(`${scenario.setting}`);
  } else if (state.location) {
    parts.push(`**Location:** ${state.location}`);
    if (state.locationDetails) parts.push(state.locationDetails);
  }
  
  // Intensity
  if (state.intensity && INTENSITY_LEVELS[state.intensity]) {
    const intensity = INTENSITY_LEVELS[state.intensity];
    parts.push(`**Intensity:** ${intensity.name}`);
    parts.push(intensity.modifier);
  }
  
  // Clothing states
  if (state.clothing.size > 0) {
    parts.push('**Clothing States:**');
    for (const [participantId, clothing] of state.clothing) {
      parts.push(`- ${participantId}: ${clothing}`);
    }
  }
  
  // Limits to respect
  const limits = getAllLimits(channelId);
  if (limits.length > 0) {
    parts.push(`**HARD LIMITS (DO NOT INCLUDE):** ${limits.map(l => KINK_TAGS.limits[l] || l).join(', ')}`);
  }
  
  // Paused state
  if (state.isPaused) {
    parts.push('**⚠️ SCENE IS PAUSED - Safe word was used. Be supportive and check in with participants.**');
  }
  
  return parts.join('\n');
}

/**
 * Save scene state to database
 */
async function saveSceneState(channelId, state) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    
    // Convert Maps and Sets to serializable format
    const serializable = {
      ...state,
      clothing: Object.fromEntries(state.clothing),
      spectators: Array.from(state.spectators),
      kinks: Object.fromEntries(
        Array.from(state.kinks.entries()).map(([k, v]) => [k, v])
      )
    };
    
    configOps.set(`nsfw_scene_${channelId}`, JSON.stringify(serializable));
  } catch (e) {
    logger.error('Failed to save scene state:', e.message);
  }
}

/**
 * Load scene state from database
 */
export async function loadSceneState(channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const data = configOps.get(`nsfw_scene_${channelId}`);
    
    if (data) {
      const parsed = JSON.parse(data);
      
      // Convert back to Maps and Sets
      const state = {
        ...parsed,
        clothing: new Map(Object.entries(parsed.clothing || {})),
        spectators: new Set(parsed.spectators || []),
        kinks: new Map(Object.entries(parsed.kinks || {}))
      };
      
      sceneStates.set(channelId, state);
      return state;
    }
  } catch (e) {
    logger.error('Failed to load scene state:', e.message);
  }
  
  return getSceneState(channelId);
}

/**
 * Clear scene state
 */
export async function clearSceneState(channelId) {
  sceneStates.delete(channelId);
  
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`nsfw_scene_${channelId}`);
  } catch (e) {
    logger.error('Failed to clear scene state:', e.message);
  }
  
  return { success: true };
}

export default {
  SCENARIO_PRESETS,
  INTENSITY_LEVELS,
  KINK_TAGS,
  getSceneState,
  setScenario,
  setIntensity,
  updateClothing,
  getClothingStates,
  triggerSafeWord,
  resumeScene,
  isScenePaused,
  setTurnOrder,
  advanceTurn,
  getCurrentTurn,
  addSpectator,
  removeSpectator,
  isSpectator,
  saveBookmark,
  loadBookmark,
  getBookmarks,
  setUserKinks,
  getUserKinks,
  getAllLimits,
  rollDice,
  buildSceneContext,
  loadSceneState,
  clearSceneState
};
