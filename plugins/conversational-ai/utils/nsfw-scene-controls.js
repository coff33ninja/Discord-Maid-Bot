/**
 * NSFW Scene Controls
 * 
 * Discord UI components for scene management:
 * - Scenario selector dropdown
 * - Intensity slider (buttons)
 * - Safe word button
 * - Continue button
 * - Dice roll button
 * - Bookmark controls
 * 
 * @module plugins/conversational-ai/utils/nsfw-scene-controls
 */

import { 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder 
} from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';
import {
  SCENARIO_PRESETS,
  INTENSITY_LEVELS,
  getSceneState,
  setScenario,
  setIntensity,
  triggerSafeWord,
  resumeScene,
  rollDice,
  saveBookmark,
  getBookmarks,
  loadBookmark,
  isScenePaused
} from './nsfw-scene-manager.js';

const logger = createLogger('nsfw-scene-controls');

/**
 * Create the main scene control panel
 */
export async function createSceneControlPanel(channelId) {
  const state = getSceneState(channelId);
  
  // Scenario dropdown
  const scenarioOptions = Object.entries(SCENARIO_PRESETS).map(([key, preset]) => ({
    label: preset.name,
    description: preset.description.slice(0, 100),
    value: key,
    default: state.scenario === key
  }));
  
  const scenarioSelect = new StringSelectMenuBuilder()
    .setCustomId('nsfw_scenario_select')
    .setPlaceholder('🎬 Choose a scenario...')
    .addOptions(scenarioOptions);
  
  // Intensity buttons
  const intensityButtons = Object.entries(INTENSITY_LEVELS).map(([key, level]) => 
    new ButtonBuilder()
      .setCustomId(`nsfw_intensity_${key}`)
      .setLabel(level.name)
      .setStyle(state.intensity === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  
  // Action buttons
  const actionButtons = [
    new ButtonBuilder()
      .setCustomId('nsfw_continue')
      .setLabel('Continue...')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('nsfw_dice_roll')
      .setLabel('Roll Dice')
      .setEmoji('🎲')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('nsfw_bookmark_save')
      .setLabel('Bookmark')
      .setEmoji('🔖')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('nsfw_safe_word')
      .setLabel('Safe Word')
      .setEmoji('🛑')
      .setStyle(ButtonStyle.Danger)
  ];
  
  const rows = [
    new ActionRowBuilder().addComponents(scenarioSelect),
    new ActionRowBuilder().addComponents(intensityButtons),
    new ActionRowBuilder().addComponents(actionButtons)
  ];
  
  // Build embed
  const currentScenario = state.scenario ? SCENARIO_PRESETS[state.scenario] : null;
  const currentIntensity = INTENSITY_LEVELS[state.intensity] || INTENSITY_LEVELS.passionate;
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('🎮 Scene Controls')
    .setDescription(
      `**Scenario:** ${currentScenario?.name || 'Not set'}\n` +
      `**Intensity:** ${currentIntensity.name}\n` +
      `**Status:** ${state.isPaused ? '⏸️ Paused (Safe word used)' : '▶️ Active'}\n\n` +
      `Use the controls below to customize your experience~`
    )
    .setFooter({ text: 'Safe word pauses everything • Dice add randomness • Bookmarks save scenes' });
  
  return { embed, components: rows };
}

/**
 * Send scene control panel to channel
 */
export async function sendSceneControlPanel(channel) {
  const { embed, components } = await createSceneControlPanel(channel.id);
  
  const message = await channel.send({ embeds: [embed], components });
  
  // Try to pin it
  try {
    await message.pin();
  } catch (e) {
    logger.warn('Could not pin scene controls:', e.message);
  }
  
  return message;
}

/**
 * Handle scenario selection
 */
export async function handleScenarioSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (interaction.customId !== 'nsfw_scenario_select') return false;
  
  const scenarioKey = interaction.values[0];
  const channelId = interaction.channelId;
  
  const result = await setScenario(channelId, scenarioKey);
  
  if (result.success) {
    const scenario = result.scenario;
    
    await interaction.reply({
      embeds: [{
        color: 0xFF1493,
        title: `🎬 Scene Changed: ${scenario.name}`,
        description: scenario.setting,
        footer: { text: `Mood: ${scenario.mood}` }
      }]
    });
    
    // Update the control panel
    try {
      const { embed, components } = await createSceneControlPanel(channelId);
      await interaction.message.edit({ embeds: [embed], components });
    } catch (e) {
      // Ignore edit errors
    }
  } else {
    await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
  }
  
  return true;
}

/**
 * Handle intensity button
 */
export async function handleIntensityButton(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith('nsfw_intensity_')) return false;
  
  const intensityKey = interaction.customId.replace('nsfw_intensity_', '');
  const channelId = interaction.channelId;
  
  const result = await setIntensity(channelId, intensityKey);
  
  if (result.success) {
    const intensity = result.intensity;
    
    await interaction.reply({
      embeds: [{
        color: 0xFF1493,
        title: `🔥 Intensity: ${intensity.name}`,
        description: intensity.description,
        footer: { text: intensity.modifier }
      }]
    });
    
    // Update the control panel
    try {
      const { embed, components } = await createSceneControlPanel(channelId);
      await interaction.message.edit({ embeds: [embed], components });
    } catch (e) {
      // Ignore edit errors
    }
  } else {
    await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
  }
  
  return true;
}

/**
 * Handle continue button - AI continues the scene
 */
export async function handleContinueButton(interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== 'nsfw_continue') return false;
  
  await interaction.deferReply();
  
  const channelId = interaction.channelId;
  const channel = interaction.channel;
  
  // Check if paused
  if (isScenePaused(channelId)) {
    await interaction.editReply({
      content: '⏸️ Scene is paused. Use the Resume button or type "resume" to continue.',
      ephemeral: true
    });
    return true;
  }
  
  try {
    // Get AI plugin to generate continuation
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const aiPlugin = getPlugin('conversational-ai');
    
    if (aiPlugin?.requestFromCore) {
      const state = getSceneState(channelId);
      const scenario = state.scenario ? SCENARIO_PRESETS[state.scenario] : null;
      const intensity = INTENSITY_LEVELS[state.intensity] || INTENSITY_LEVELS.passionate;
      
      const prompt = `Continue the NSFW roleplay scene. 
${scenario ? `Setting: ${scenario.setting}` : ''}
Intensity: ${intensity.modifier}

The user clicked "Continue" - they want you to advance the scene on your own.
Take initiative, describe what happens next, and invite them to respond.
Be descriptive, sensual, and in character. Don't ask what they want - just DO something exciting!`;
      
      const result = await aiPlugin.requestFromCore('gemini-generate', { 
        prompt,
        options: { nsfw: true } // Disable content filtering for NSFW
      });
      let response = result?.result?.response?.text?.() || result?.text || '';
      
      // Handle empty response (content filtering)
      if (!response || response.trim() === '') {
        response = '*I move closer, my breath warm against your skin...*\n\nWhat happens next is up to you~';
      }
      
      await interaction.editReply({
        embeds: [{
          color: 0xFF1493,
          description: response,
          footer: { text: '▶️ Scene continued...' }
        }]
      });
    }
  } catch (e) {
    logger.error('Continue button error:', e.message);
    await interaction.editReply({ content: '❌ Could not continue scene.' });
  }
  
  return true;
}

/**
 * Handle dice roll button
 */
export async function handleDiceRollButton(interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== 'nsfw_dice_roll') return false;
  
  const roll = rollDice(20);
  
  let outcomeText = '';
  let color = 0xFF1493;
  
  switch (roll.outcome) {
    case 'critical_success':
      outcomeText = '🌟 CRITICAL SUCCESS! Something amazing happens...';
      color = 0xFFD700;
      break;
    case 'critical_fail':
      outcomeText = '💀 CRITICAL FAIL! Something embarrassing happens...';
      color = 0x8B0000;
      break;
    case 'success':
      outcomeText = '✨ Success! Things go your way~';
      color = 0x00FF00;
      break;
    case 'fail':
      outcomeText = '😅 Fail! Not quite what you hoped for...';
      color = 0xFF6600;
      break;
    default:
      outcomeText = '🎲 Normal result - the scene continues...';
  }
  
  await interaction.reply({
    embeds: [{
      color,
      title: `🎲 Dice Roll: ${roll.roll}`,
      description: outcomeText,
      footer: { text: `d${roll.sides} • Use this to add randomness to the scene!` }
    }]
  });
  
  return true;
}

/**
 * Handle safe word button
 */
export async function handleSafeWordButton(interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== 'nsfw_safe_word') return false;
  
  const channelId = interaction.channelId;
  
  await triggerSafeWord(channelId);
  
  // Create resume button
  const resumeButton = new ButtonBuilder()
    .setCustomId('nsfw_resume')
    .setLabel('Resume Scene')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Success);
  
  const row = new ActionRowBuilder().addComponents(resumeButton);
  
  await interaction.reply({
    embeds: [{
      color: 0xFF0000,
      title: '🛑 Safe Word Activated',
      description: 
        '**The scene is now paused.**\n\n' +
        'Take a moment. Check in with everyone.\n' +
        'When you\'re ready to continue, click Resume or type "resume".\n\n' +
        '*Your comfort and safety always come first.* 💕',
      footer: { text: 'No judgment, no pressure. Take your time.' }
    }],
    components: [row]
  });
  
  // Update control panel
  try {
    const { embed, components } = await createSceneControlPanel(channelId);
    await interaction.message.edit({ embeds: [embed], components });
  } catch (e) {
    // Ignore
  }
  
  return true;
}

/**
 * Handle resume button
 */
export async function handleResumeButton(interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== 'nsfw_resume') return false;
  
  const channelId = interaction.channelId;
  
  await resumeScene(channelId);
  
  await interaction.reply({
    embeds: [{
      color: 0x00FF00,
      title: '▶️ Scene Resumed',
      description: 'Welcome back~ Ready to continue where we left off? 💋',
      footer: { text: 'The safe word is always available if you need it.' }
    }]
  });
  
  return true;
}

/**
 * Handle bookmark save button
 */
export async function handleBookmarkSaveButton(interaction) {
  if (!interaction.isButton()) return false;
  if (interaction.customId !== 'nsfw_bookmark_save') return false;
  
  const channelId = interaction.channelId;
  const state = getSceneState(channelId);
  
  const name = `Scene ${Date.now().toString(36)}`;
  const description = state.scenario ? SCENARIO_PRESETS[state.scenario]?.name : 'Custom scene';
  
  const result = await saveBookmark(channelId, name, description);
  
  if (result.success) {
    await interaction.reply({
      embeds: [{
        color: 0xFF1493,
        title: '🔖 Scene Bookmarked!',
        description: `Saved as: **${name}**\n\nYou can load this scene later to pick up where you left off.`,
        footer: { text: `Bookmark ID: ${result.bookmark.id}` }
      }],
      ephemeral: true
    });
  } else {
    await interaction.reply({ content: '❌ Could not save bookmark.', ephemeral: true });
  }
  
  return true;
}

/**
 * Handle all scene control interactions
 */
export async function handleSceneControlInteraction(interaction) {
  // Scenario select
  if (await handleScenarioSelect(interaction)) return true;
  
  // Intensity buttons
  if (await handleIntensityButton(interaction)) return true;
  
  // Action buttons
  if (await handleContinueButton(interaction)) return true;
  if (await handleDiceRollButton(interaction)) return true;
  if (await handleSafeWordButton(interaction)) return true;
  if (await handleResumeButton(interaction)) return true;
  if (await handleBookmarkSaveButton(interaction)) return true;
  
  return false;
}

export default {
  createSceneControlPanel,
  sendSceneControlPanel,
  handleSceneControlInteraction
};
