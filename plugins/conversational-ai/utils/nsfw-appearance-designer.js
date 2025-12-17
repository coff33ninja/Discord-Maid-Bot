/**
 * NSFW Appearance Designer
 * 
 * Allows users to customize the AI's appearance for roleplay.
 * Features: hair, outfit, body type, accessories, special features.
 * 
 * @module plugins/conversational-ai/utils/nsfw-appearance-designer
 */

import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder 
} from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('nsfw-appearance');

// ============ APPEARANCE OPTIONS ============

export const HAIR_OPTIONS = {
  black_long: { name: 'Long Black Hair', emoji: '🖤', desc: 'Silky black hair flowing down her back' },
  blonde_long: { name: 'Long Blonde Hair', emoji: '💛', desc: 'Golden blonde locks cascading over her shoulders' },
  red_long: { name: 'Long Red Hair', emoji: '❤️', desc: 'Fiery red hair reaching her waist' },
  pink_twintails: { name: 'Pink Twintails', emoji: '💗', desc: 'Cute pink twintails bouncing with every move' },
  blue_short: { name: 'Short Blue Hair', emoji: '💙', desc: 'Stylish short blue hair framing her face' },
  white_long: { name: 'Long White Hair', emoji: '🤍', desc: 'Ethereal white hair like moonlight' },
  purple_wavy: { name: 'Wavy Purple Hair', emoji: '💜', desc: 'Mysterious wavy purple locks' },
  brown_ponytail: { name: 'Brown Ponytail', emoji: '🤎', desc: 'Practical brown ponytail swaying behind her' },
  silver_bob: { name: 'Silver Bob Cut', emoji: '🩶', desc: 'Sleek silver bob cut with sharp edges' },
  rainbow: { name: 'Rainbow Hair', emoji: '🌈', desc: 'Vibrant rainbow-colored hair' }
};

export const OUTFIT_OPTIONS = {
  maid_classic: { name: 'Classic Maid', emoji: '🎀', desc: 'Traditional black and white maid uniform with frills' },
  maid_sexy: { name: 'Sexy Maid', emoji: '💋', desc: 'Revealing maid outfit with short skirt and deep neckline' },
  lingerie_black: { name: 'Black Lingerie', emoji: '🖤', desc: 'Elegant black lace lingerie set' },
  lingerie_red: { name: 'Red Lingerie', emoji: '❤️', desc: 'Seductive red satin lingerie' },
  lingerie_white: { name: 'White Lingerie', emoji: '🤍', desc: 'Innocent white bridal lingerie' },
  naked: { name: 'Nothing~', emoji: '🔥', desc: 'Completely bare, hiding nothing' },
  apron_only: { name: 'Naked Apron', emoji: '👩‍🍳', desc: 'Wearing only an apron, bare underneath' },
  schoolgirl: { name: 'Schoolgirl', emoji: '📚', desc: 'Pleated skirt and sailor uniform' },
  bunny: { name: 'Bunny Suit', emoji: '🐰', desc: 'Tight bunny suit with ears and tail' },
  nurse: { name: 'Nurse Outfit', emoji: '👩‍⚕️', desc: 'Short nurse uniform with stockings' },
  kimono: { name: 'Loose Kimono', emoji: '👘', desc: 'Loosely tied kimono showing skin' },
  latex: { name: 'Latex Suit', emoji: '✨', desc: 'Shiny tight latex bodysuit' },
  casual: { name: 'Casual Clothes', emoji: '👕', desc: 'Relaxed t-shirt and shorts' },
  swimsuit: { name: 'Bikini', emoji: '👙', desc: 'Tiny bikini barely covering anything' }
};

export const BODY_OPTIONS = {
  petite: { name: 'Petite', emoji: '🌸', desc: 'Small and delicate frame, cute and compact' },
  slim: { name: 'Slim', emoji: '✨', desc: 'Slender figure with graceful proportions' },
  athletic: { name: 'Athletic', emoji: '💪', desc: 'Toned muscles and fit physique' },
  curvy: { name: 'Curvy', emoji: '⏳', desc: 'Generous curves in all the right places' },
  thicc: { name: 'Thicc', emoji: '🍑', desc: 'Extra thick thighs and voluptuous figure' },
  busty: { name: 'Busty', emoji: '🍈', desc: 'Impressively large chest' },
  tall: { name: 'Tall & Elegant', emoji: '👠', desc: 'Long legs and statuesque beauty' },
  shortstack: { name: 'Shortstack', emoji: '🔥', desc: 'Short but incredibly curvy' }
};

export const ACCESSORY_OPTIONS = {
  none: { name: 'None', emoji: '➖', desc: 'No accessories' },
  collar: { name: 'Collar', emoji: '📿', desc: 'Leather collar around her neck' },
  choker: { name: 'Choker', emoji: '💎', desc: 'Elegant choker necklace' },
  glasses: { name: 'Glasses', emoji: '👓', desc: 'Cute glasses adding a nerdy charm' },
  stockings: { name: 'Thigh-Highs', emoji: '🦵', desc: 'Sexy thigh-high stockings' },
  garter: { name: 'Garter Belt', emoji: '🎀', desc: 'Lacy garter belt with straps' },
  heels: { name: 'High Heels', emoji: '👠', desc: 'Tall stiletto heels' },
  ribbons: { name: 'Hair Ribbons', emoji: '🎀', desc: 'Cute ribbons in her hair' },
  piercing: { name: 'Piercings', emoji: '💍', desc: 'Subtle piercings adding edge' },
  tattoo: { name: 'Tattoos', emoji: '🖋️', desc: 'Artistic tattoos on her body' }
};

export const SPECIAL_OPTIONS = {
  none: { name: 'Human', emoji: '👩', desc: 'Regular human appearance' },
  catgirl: { name: 'Cat Ears & Tail', emoji: '🐱', desc: 'Cute cat ears and fluffy tail' },
  foxgirl: { name: 'Fox Ears & Tail', emoji: '🦊', desc: 'Fluffy fox ears and bushy tail' },
  bunny: { name: 'Bunny Ears', emoji: '🐰', desc: 'Long floppy bunny ears' },
  demon: { name: 'Demon Horns & Tail', emoji: '😈', desc: 'Small horns and spaded tail' },
  angel: { name: 'Angel Wings', emoji: '😇', desc: 'Ethereal white wings' },
  elf: { name: 'Elf Ears', emoji: '🧝', desc: 'Pointed elven ears' },
  vampire: { name: 'Vampire Fangs', emoji: '🧛', desc: 'Sharp fangs peeking out' },
  succubus: { name: 'Succubus', emoji: '💋', desc: 'Horns, wings, and tail of a succubus' }
};

// ============ DEFAULT LOOKS PER PERSONALITY ============

export const PERSONALITY_DEFAULTS = {
  maid: {
    hair: 'black_long',
    outfit: 'maid_classic',
    body: 'slim',
    accessory: 'stockings',
    special: 'none'
  },
  tsundere: {
    hair: 'pink_twintails',
    outfit: 'schoolgirl',
    body: 'petite',
    accessory: 'ribbons',
    special: 'none'
  },
  yandere: {
    hair: 'black_long',
    outfit: 'schoolgirl',
    body: 'slim',
    accessory: 'choker',
    special: 'none'
  },
  oneesan: {
    hair: 'brown_ponytail',
    outfit: 'casual',
    body: 'curvy',
    accessory: 'glasses',
    special: 'none'
  },
  catgirl: {
    hair: 'white_long',
    outfit: 'lingerie_black',
    body: 'petite',
    accessory: 'collar',
    special: 'catgirl'
  },
  succubus: {
    hair: 'purple_wavy',
    outfit: 'lingerie_red',
    body: 'curvy',
    accessory: 'choker',
    special: 'succubus'
  },
  innocent: {
    hair: 'blonde_long',
    outfit: 'lingerie_white',
    body: 'petite',
    accessory: 'ribbons',
    special: 'angel'
  },
  dominatrix: {
    hair: 'red_long',
    outfit: 'latex',
    body: 'athletic',
    accessory: 'heels',
    special: 'demon'
  },
  gyaru: {
    hair: 'blonde_long',
    outfit: 'casual',
    body: 'thicc',
    accessory: 'piercing',
    special: 'none'
  },
  kuudere: {
    hair: 'silver_bob',
    outfit: 'maid_classic',
    body: 'slim',
    accessory: 'glasses',
    special: 'none'
  }
};

// ============ APPEARANCE STATE STORAGE ============

const appearanceStates = new Map();

/**
 * Get appearance state for a channel (sync version, uses cached or default)
 */
export function getAppearance(channelId) {
  if (!appearanceStates.has(channelId)) {
    // Try to load from DB synchronously (will be async loaded properly elsewhere)
    // For now return default, but trigger async load
    loadAppearance(channelId).catch(() => {});
    appearanceStates.set(channelId, { ...PERSONALITY_DEFAULTS.maid });
  }
  return appearanceStates.get(channelId);
}

/**
 * Get appearance state for a channel (async version, ensures DB is loaded)
 */
export async function getAppearanceAsync(channelId) {
  if (!appearanceStates.has(channelId)) {
    await loadAppearance(channelId);
  }
  return appearanceStates.get(channelId) || { ...PERSONALITY_DEFAULTS.maid };
}

/**
 * Set appearance for a channel
 */
export async function setAppearance(channelId, appearance) {
  appearanceStates.set(channelId, appearance);
  
  // Save to DB
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.set(`nsfw_appearance_${channelId}`, JSON.stringify(appearance));
  } catch (e) {
    logger.error('Failed to save appearance:', e.message);
  }
  
  return { success: true };
}

/**
 * Load appearance from DB
 */
export async function loadAppearance(channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const data = configOps.get(`nsfw_appearance_${channelId}`);
    
    if (data) {
      const appearance = JSON.parse(data);
      appearanceStates.set(channelId, appearance);
      return appearance;
    }
  } catch (e) {
    logger.error('Failed to load appearance:', e.message);
  }
  
  return getAppearance(channelId);
}

/**
 * Apply personality defaults
 */
export async function applyPersonalityDefaults(channelId, personalityKey) {
  const defaults = PERSONALITY_DEFAULTS[personalityKey] || PERSONALITY_DEFAULTS.maid;
  await setAppearance(channelId, { ...defaults });
  return defaults;
}

/**
 * Build appearance description for AI prompt (async to ensure DB is loaded)
 */
export async function buildAppearanceDescription(channelId) {
  const app = await getAppearanceAsync(channelId);
  
  const hair = HAIR_OPTIONS[app.hair] || HAIR_OPTIONS.black_long;
  const outfit = OUTFIT_OPTIONS[app.outfit] || OUTFIT_OPTIONS.maid_classic;
  const body = BODY_OPTIONS[app.body] || BODY_OPTIONS.slim;
  const accessory = ACCESSORY_OPTIONS[app.accessory] || ACCESSORY_OPTIONS.none;
  const special = SPECIAL_OPTIONS[app.special] || SPECIAL_OPTIONS.none;
  
  const parts = [
    `**Your Appearance:**`,
    `- Hair: ${hair.desc}`,
    `- Body: ${body.desc}`,
    `- Outfit: ${outfit.desc}`
  ];
  
  if (accessory.name !== 'None') {
    parts.push(`- Accessory: ${accessory.desc}`);
  }
  
  if (special.name !== 'Human') {
    parts.push(`- Special: ${special.desc}`);
  }
  
  parts.push('');
  parts.push('IMPORTANT: Reference your appearance in your responses! Describe how your outfit moves, how your hair falls, etc.');
  
  return parts.join('\n');
}

/**
 * Build appearance preview for embed (async to ensure DB is loaded)
 */
export async function buildAppearancePreview(channelId) {
  const app = await getAppearanceAsync(channelId);
  
  const hair = HAIR_OPTIONS[app.hair] || HAIR_OPTIONS.black_long;
  const outfit = OUTFIT_OPTIONS[app.outfit] || OUTFIT_OPTIONS.maid_classic;
  const body = BODY_OPTIONS[app.body] || BODY_OPTIONS.slim;
  const accessory = ACCESSORY_OPTIONS[app.accessory] || ACCESSORY_OPTIONS.none;
  const special = SPECIAL_OPTIONS[app.special] || SPECIAL_OPTIONS.none;
  
  return {
    hair: `${hair.emoji} ${hair.name}`,
    outfit: `${outfit.emoji} ${outfit.name}`,
    body: `${body.emoji} ${body.name}`,
    accessory: `${accessory.emoji} ${accessory.name}`,
    special: `${special.emoji} ${special.name}`,
    description: [
      hair.desc,
      body.desc,
      outfit.desc,
      accessory.name !== 'None' ? accessory.desc : null,
      special.name !== 'Human' ? special.desc : null
    ].filter(Boolean).join('. ') + '.'
  };
}

export default {
  HAIR_OPTIONS,
  OUTFIT_OPTIONS,
  BODY_OPTIONS,
  ACCESSORY_OPTIONS,
  SPECIAL_OPTIONS,
  PERSONALITY_DEFAULTS,
  getAppearance,
  setAppearance,
  loadAppearance,
  applyPersonalityDefaults,
  buildAppearanceDescription,
  buildAppearancePreview
};
