/**
 * NSFW Setup Wizard
 * 
 * Step-by-step setup flow for NSFW channels:
 * 1. Personality Select
 * 2. Appearance Design
 * 3. Scenario Select
 * 4. Intensity Select
 * 5. Start Button
 * 
 * @module plugins/conversational-ai/utils/nsfw-setup-wizard
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
  HAIR_OPTIONS,
  OUTFIT_OPTIONS,
  BODY_OPTIONS,
  ACCESSORY_OPTIONS,
  SPECIAL_OPTIONS,
  getAppearance,
  setAppearance,
  applyPersonalityDefaults,
  buildAppearancePreview
} from './nsfw-appearance-designer.js';
import {
  SCENARIO_PRESETS,
  INTENSITY_LEVELS,
  getSceneState,
  setScenario,
  setIntensity
} from './nsfw-scene-manager.js';
import { setChannelPersonality } from './nsfw-manager.js';

const logger = createLogger('nsfw-setup-wizard');

// Track wizard state per channel
const wizardStates = new Map();

/**
 * Get wizard state for a channel
 */
function getWizardState(channelId) {
  if (!wizardStates.has(channelId)) {
    wizardStates.set(channelId, {
      step: 1,
      personality: 'maid',
      appearance: null,
      scenario: null,
      intensity: 'passionate',
      isComplete: false
    });
  }
  return wizardStates.get(channelId);
}

/**
 * Get all personalities
 */
async function getPersonalities() {
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const personalityPlugin = getPlugin('personality');
    if (personalityPlugin?.getPersonalityOptions) {
      return personalityPlugin.getPersonalityOptions();
    }
  } catch (e) {
    logger.warn('Could not load personalities:', e.message);
  }
  
  // Fallback
  return [
    { key: 'maid', name: 'Devoted Maid', emoji: '🌸', description: 'Polite and eager to serve' },
    { key: 'tsundere', name: 'Tsundere', emoji: '💢', description: 'Reluctantly helpful' },
    { key: 'yandere', name: 'Yandere', emoji: '🖤', description: 'Obsessively devoted' },
    { key: 'oneesan', name: 'Onee-san', emoji: '💋', description: 'Mature big sister type' },
    { key: 'catgirl', name: 'Catgirl', emoji: '🐱', description: 'Playful and cat-like' },
    { key: 'succubus', name: 'Succubus', emoji: '😈', description: 'Seductive demon' },
    { key: 'innocent', name: 'Innocent', emoji: '😇', description: 'Pure and naive' },
    { key: 'dominatrix', name: 'Dominatrix', emoji: '👠', description: 'Commanding and strict' }
  ];
}

/**
 * Create Step 1: Personality Selection
 */
async function createStep1(channelId) {
  const state = getWizardState(channelId);
  const personalities = await getPersonalities();
  
  const options = personalities.slice(0, 25).map(p => ({
    label: p.name,
    description: p.description?.slice(0, 100) || 'No description',
    value: p.key,
    emoji: p.emoji,
    default: p.key === state.personality
  }));
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('wizard_personality')
    .setPlaceholder('🎭 Choose my personality...')
    .addOptions(options);
  
  const nextButton = new ButtonBuilder()
    .setCustomId('wizard_next_1')
    .setLabel('Next: Appearance →')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!state.personality);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('🎭 Step 1/5: Choose My Personality')
    .setDescription(
      `Who would you like me to be tonight?\n\n` +
      `**Current Selection:** ${state.personality ? personalities.find(p => p.key === state.personality)?.name || state.personality : 'None'}\n\n` +
      `Each personality has a unique way of speaking and behaving~`
    )
    .setFooter({ text: 'Step 1 of 5 • Personality determines how I act and speak' });
  
  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(selectMenu),
      new ActionRowBuilder().addComponents(nextButton)
    ]
  };
}

/**
 * Create Step 2: Appearance Design
 */
async function createStep2(channelId) {
  const state = getWizardState(channelId);
  const appearance = getAppearance(channelId);
  const preview = await buildAppearancePreview(channelId);
  
  // Hair select
  const hairOptions = Object.entries(HAIR_OPTIONS).slice(0, 25).map(([key, opt]) => ({
    label: opt.name,
    value: key,
    emoji: opt.emoji,
    default: appearance.hair === key
  }));
  
  const hairSelect = new StringSelectMenuBuilder()
    .setCustomId('wizard_hair')
    .setPlaceholder('💇 Hair style...')
    .addOptions(hairOptions);
  
  // Outfit select
  const outfitOptions = Object.entries(OUTFIT_OPTIONS).slice(0, 25).map(([key, opt]) => ({
    label: opt.name,
    value: key,
    emoji: opt.emoji,
    default: appearance.outfit === key
  }));
  
  const outfitSelect = new StringSelectMenuBuilder()
    .setCustomId('wizard_outfit')
    .setPlaceholder('👗 Outfit...')
    .addOptions(outfitOptions);
  
  // Body select
  const bodyOptions = Object.entries(BODY_OPTIONS).map(([key, opt]) => ({
    label: opt.name,
    description: opt.desc.slice(0, 100),
    value: key,
    emoji: opt.emoji,
    default: appearance.body === key
  }));
  
  const bodySelect = new StringSelectMenuBuilder()
    .setCustomId('wizard_body')
    .setPlaceholder('💃 Body type...')
    .addOptions(bodyOptions);
  
  // Navigation buttons
  const backButton = new ButtonBuilder()
    .setCustomId('wizard_back_2')
    .setLabel('← Back')
    .setStyle(ButtonStyle.Secondary);
  
  const moreButton = new ButtonBuilder()
    .setCustomId('wizard_more_appearance')
    .setLabel('More Options')
    .setEmoji('✨')
    .setStyle(ButtonStyle.Secondary);
  
  const nextButton = new ButtonBuilder()
    .setCustomId('wizard_next_2')
    .setLabel('Next: Scenario →')
    .setStyle(ButtonStyle.Primary);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('👗 Step 2/5: Design My Appearance')
    .setDescription(
      `Customize how I look for you~\n\n` +
      `**Current Look:**\n` +
      `${preview.hair}\n` +
      `${preview.body}\n` +
      `${preview.outfit}\n` +
      `${preview.accessory}\n` +
      `${preview.special}\n\n` +
      `*${preview.description}*`
    )
    .setFooter({ text: 'Step 2 of 5 • Click "More Options" for accessories & special features' });
  
  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(hairSelect),
      new ActionRowBuilder().addComponents(outfitSelect),
      new ActionRowBuilder().addComponents(bodySelect),
      new ActionRowBuilder().addComponents(backButton, moreButton, nextButton)
    ]
  };
}

/**
 * Create Step 2b: More Appearance Options
 */
async function createStep2b(channelId) {
  const appearance = getAppearance(channelId);
  const preview = await buildAppearancePreview(channelId);
  
  // Accessory select
  const accessoryOptions = Object.entries(ACCESSORY_OPTIONS).map(([key, opt]) => ({
    label: opt.name,
    description: opt.desc.slice(0, 100),
    value: key,
    emoji: opt.emoji,
    default: appearance.accessory === key
  }));
  
  const accessorySelect = new StringSelectMenuBuilder()
    .setCustomId('wizard_accessory')
    .setPlaceholder('💎 Accessories...')
    .addOptions(accessoryOptions);
  
  // Special features select
  const specialOptions = Object.entries(SPECIAL_OPTIONS).map(([key, opt]) => ({
    label: opt.name,
    description: opt.desc.slice(0, 100),
    value: key,
    emoji: opt.emoji,
    default: appearance.special === key
  }));
  
  const specialSelect = new StringSelectMenuBuilder()
    .setCustomId('wizard_special')
    .setPlaceholder('✨ Special features...')
    .addOptions(specialOptions);
  
  // Navigation
  const backButton = new ButtonBuilder()
    .setCustomId('wizard_back_2b')
    .setLabel('← Back to Basics')
    .setStyle(ButtonStyle.Secondary);
  
  const nextButton = new ButtonBuilder()
    .setCustomId('wizard_next_2')
    .setLabel('Next: Scenario →')
    .setStyle(ButtonStyle.Primary);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('✨ Step 2/5: Extra Details')
    .setDescription(
      `Add some extra flair~\n\n` +
      `**Current Look:**\n` +
      `${preview.accessory}\n` +
      `${preview.special}\n\n` +
      `*${preview.description}*`
    )
    .setFooter({ text: 'Step 2 of 5 • Accessories and special features' });
  
  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(accessorySelect),
      new ActionRowBuilder().addComponents(specialSelect),
      new ActionRowBuilder().addComponents(backButton, nextButton)
    ]
  };
}

/**
 * Create Step 3: Scenario Selection
 */
async function createStep3(channelId) {
  const state = getWizardState(channelId);
  const sceneState = getSceneState(channelId);
  
  const options = Object.entries(SCENARIO_PRESETS).slice(0, 25).map(([key, preset]) => ({
    label: preset.name,
    description: preset.description.slice(0, 100),
    value: key,
    default: sceneState.scenario === key
  }));
  
  // Add "No scenario" option
  options.unshift({
    label: '🎲 Freestyle',
    description: 'No preset - let the scene develop naturally',
    value: 'none',
    default: !sceneState.scenario
  });
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('wizard_scenario')
    .setPlaceholder('🎬 Choose a scenario...')
    .addOptions(options);
  
  const backButton = new ButtonBuilder()
    .setCustomId('wizard_back_3')
    .setLabel('← Back')
    .setStyle(ButtonStyle.Secondary);
  
  const nextButton = new ButtonBuilder()
    .setCustomId('wizard_next_3')
    .setLabel('Next: Intensity →')
    .setStyle(ButtonStyle.Primary);
  
  const currentScenario = sceneState.scenario ? SCENARIO_PRESETS[sceneState.scenario] : null;
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('🎬 Step 3/5: Choose the Setting')
    .setDescription(
      `Where shall we play?\n\n` +
      `**Current Setting:** ${currentScenario?.name || '🎲 Freestyle'}\n` +
      (currentScenario ? `*${currentScenario.setting}*` : '*No preset - the scene will develop naturally*')
    )
    .setFooter({ text: 'Step 3 of 5 • The scenario sets the scene for our roleplay' });
  
  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(selectMenu),
      new ActionRowBuilder().addComponents(backButton, nextButton)
    ]
  };
}

/**
 * Create Step 4: Intensity Selection
 */
async function createStep4(channelId) {
  const sceneState = getSceneState(channelId);
  
  const buttons = Object.entries(INTENSITY_LEVELS).map(([key, level]) => 
    new ButtonBuilder()
      .setCustomId(`wizard_intensity_${key}`)
      .setLabel(level.name)
      .setStyle(sceneState.intensity === key ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  
  const backButton = new ButtonBuilder()
    .setCustomId('wizard_back_4')
    .setLabel('← Back')
    .setStyle(ButtonStyle.Secondary);
  
  const nextButton = new ButtonBuilder()
    .setCustomId('wizard_next_4')
    .setLabel('Next: Review →')
    .setStyle(ButtonStyle.Primary);
  
  const currentIntensity = INTENSITY_LEVELS[sceneState.intensity] || INTENSITY_LEVELS.passionate;
  
  // Build intensity options dynamically from INTENSITY_LEVELS
  const intensityList = Object.values(INTENSITY_LEVELS)
    .map(level => `${level.name} - ${level.description}`)
    .join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('🔥 Step 4/5: Set the Intensity')
    .setDescription(
      `How spicy do you want it?\n\n` +
      `**Current Intensity:** ${currentIntensity.name}\n` +
      `*${currentIntensity.description}*\n\n` +
      intensityList
    )
    .setFooter({ text: 'Step 4 of 5 • This affects how explicit and intense I get' });
  
  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(buttons),
      new ActionRowBuilder().addComponents(backButton, nextButton)
    ]
  };
}

/**
 * Create Step 5: Review & Start
 */
async function createStep5(channelId) {
  const state = getWizardState(channelId);
  const sceneState = getSceneState(channelId);
  const preview = await buildAppearancePreview(channelId);
  const personalities = await getPersonalities();
  
  const personality = personalities.find(p => p.key === state.personality);
  const scenario = sceneState.scenario ? SCENARIO_PRESETS[sceneState.scenario] : null;
  const intensity = INTENSITY_LEVELS[sceneState.intensity] || INTENSITY_LEVELS.passionate;
  
  const backButton = new ButtonBuilder()
    .setCustomId('wizard_back_5')
    .setLabel('← Back')
    .setStyle(ButtonStyle.Secondary);
  
  const startButton = new ButtonBuilder()
    .setCustomId('wizard_start')
    .setLabel('🔥 START THE SCENE 🔥')
    .setStyle(ButtonStyle.Success);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('✨ Step 5/5: Ready to Begin!')
    .setDescription(
      `**Review your choices:**\n\n` +
      `🎭 **Personality:** ${personality?.emoji || ''} ${personality?.name || state.personality}\n` +
      `👗 **Appearance:** ${preview.hair}, ${preview.body}, ${preview.outfit}\n` +
      `✨ **Extras:** ${preview.accessory}, ${preview.special}\n` +
      `🎬 **Scenario:** ${scenario?.name || '🎲 Freestyle'}\n` +
      `🔥 **Intensity:** ${intensity.name}\n\n` +
      `*${preview.description}*\n\n` +
      `**Ready to begin?** Click the button below to start our scene~`
    )
    .setFooter({ text: 'Step 5 of 5 • Everything looks perfect! Let\'s play~' });
  
  return {
    embed,
    components: [
      new ActionRowBuilder().addComponents(backButton, startButton)
    ]
  };
}

/**
 * Send the setup wizard to a channel
 */
export async function sendSetupWizard(channel, startStep = 1) {
  const channelId = channel.id;
  const state = getWizardState(channelId);
  state.step = startStep;
  
  let content;
  switch (startStep) {
    case 1: content = await createStep1(channelId); break;
    case 2: content = await createStep2(channelId); break;
    case 3: content = await createStep3(channelId); break;
    case 4: content = await createStep4(channelId); break;
    case 5: content = await createStep5(channelId); break;
    default: content = await createStep1(channelId);
  }
  
  const message = await channel.send({ embeds: [content.embed], components: content.components });
  
  // Try to pin
  try {
    await message.pin();
  } catch (e) {
    logger.warn('Could not pin wizard:', e.message);
  }
  
  return message;
}

/**
 * Update wizard to a specific step
 */
async function updateWizardStep(interaction, step, substep = null) {
  const channelId = interaction.channelId;
  const state = getWizardState(channelId);
  state.step = step;
  
  let content;
  if (substep === '2b') {
    content = await createStep2b(channelId);
  } else {
    switch (step) {
      case 1: content = await createStep1(channelId); break;
      case 2: content = await createStep2(channelId); break;
      case 3: content = await createStep3(channelId); break;
      case 4: content = await createStep4(channelId); break;
      case 5: content = await createStep5(channelId); break;
      default: content = await createStep1(channelId);
    }
  }
  
  await interaction.update({ embeds: [content.embed], components: content.components });
}

/**
 * Handle wizard interactions
 */
export async function handleWizardInteraction(interaction) {
  const customId = interaction.customId;
  const channelId = interaction.channelId;
  
  // Personality selection
  if (customId === 'wizard_personality' && interaction.isStringSelectMenu()) {
    const personalityKey = interaction.values[0];
    const state = getWizardState(channelId);
    state.personality = personalityKey;
    
    // Apply personality defaults to appearance
    await applyPersonalityDefaults(channelId, personalityKey);
    await setChannelPersonality(channelId, personalityKey);
    
    await updateWizardStep(interaction, 1);
    return true;
  }
  
  // Hair selection
  if (customId === 'wizard_hair' && interaction.isStringSelectMenu()) {
    const appearance = getAppearance(channelId);
    appearance.hair = interaction.values[0];
    await setAppearance(channelId, appearance);
    await updateWizardStep(interaction, 2);
    return true;
  }
  
  // Outfit selection
  if (customId === 'wizard_outfit' && interaction.isStringSelectMenu()) {
    const appearance = getAppearance(channelId);
    appearance.outfit = interaction.values[0];
    await setAppearance(channelId, appearance);
    await updateWizardStep(interaction, 2);
    return true;
  }
  
  // Body selection
  if (customId === 'wizard_body' && interaction.isStringSelectMenu()) {
    const appearance = getAppearance(channelId);
    appearance.body = interaction.values[0];
    await setAppearance(channelId, appearance);
    await updateWizardStep(interaction, 2);
    return true;
  }
  
  // Accessory selection
  if (customId === 'wizard_accessory' && interaction.isStringSelectMenu()) {
    const appearance = getAppearance(channelId);
    appearance.accessory = interaction.values[0];
    await setAppearance(channelId, appearance);
    await updateWizardStep(interaction, 2, '2b');
    return true;
  }
  
  // Special features selection
  if (customId === 'wizard_special' && interaction.isStringSelectMenu()) {
    const appearance = getAppearance(channelId);
    appearance.special = interaction.values[0];
    await setAppearance(channelId, appearance);
    await updateWizardStep(interaction, 2, '2b');
    return true;
  }
  
  // Scenario selection
  if (customId === 'wizard_scenario' && interaction.isStringSelectMenu()) {
    const scenarioKey = interaction.values[0];
    if (scenarioKey !== 'none') {
      await setScenario(channelId, scenarioKey);
    }
    await updateWizardStep(interaction, 3);
    return true;
  }
  
  // Intensity buttons
  if (customId.startsWith('wizard_intensity_') && interaction.isButton()) {
    const intensityKey = customId.replace('wizard_intensity_', '');
    await setIntensity(channelId, intensityKey);
    await updateWizardStep(interaction, 4);
    return true;
  }
  
  // Navigation buttons
  if (customId === 'wizard_next_1' && interaction.isButton()) {
    await updateWizardStep(interaction, 2);
    return true;
  }
  
  if (customId === 'wizard_next_2' && interaction.isButton()) {
    await updateWizardStep(interaction, 3);
    return true;
  }
  
  if (customId === 'wizard_next_3' && interaction.isButton()) {
    await updateWizardStep(interaction, 4);
    return true;
  }
  
  if (customId === 'wizard_next_4' && interaction.isButton()) {
    await updateWizardStep(interaction, 5);
    return true;
  }
  
  if (customId === 'wizard_back_2' && interaction.isButton()) {
    await updateWizardStep(interaction, 1);
    return true;
  }
  
  if (customId === 'wizard_back_2b' && interaction.isButton()) {
    await updateWizardStep(interaction, 2);
    return true;
  }
  
  if (customId === 'wizard_back_3' && interaction.isButton()) {
    await updateWizardStep(interaction, 2);
    return true;
  }
  
  if (customId === 'wizard_back_4' && interaction.isButton()) {
    await updateWizardStep(interaction, 3);
    return true;
  }
  
  if (customId === 'wizard_back_5' && interaction.isButton()) {
    await updateWizardStep(interaction, 4);
    return true;
  }
  
  if (customId === 'wizard_more_appearance' && interaction.isButton()) {
    await updateWizardStep(interaction, 2, '2b');
    return true;
  }
  
  // START BUTTON - The big one!
  if (customId === 'wizard_start' && interaction.isButton()) {
    await handleStartScene(interaction);
    return true;
  }
  
  return false;
}

/**
 * Handle the START button - begin the scene!
 */
async function handleStartScene(interaction) {
  const channelId = interaction.channelId;
  const channel = interaction.channel;
  const state = getWizardState(channelId);
  
  await interaction.deferUpdate();
  
  // Mark wizard as complete
  state.isComplete = true;
  
  // Delete the wizard message
  try {
    await interaction.message.delete();
  } catch (e) {
    // Ignore
  }
  
  // Send "scene starting" message
  const startingEmbed = new EmbedBuilder()
    .setColor(0xFF1493)
    .setTitle('🔥 Scene Starting...')
    .setDescription('*The lights dim... the scene begins...*')
    .setFooter({ text: 'Generating your personalized intro~' });
  
  await channel.send({ embeds: [startingEmbed] });
  
  // Show typing
  await channel.sendTyping();
  
  // Generate custom intro with all the settings
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const aiPlugin = getPlugin('conversational-ai');
    
    if (aiPlugin?.requestFromCore) {
      const preview = await buildAppearancePreview(channelId);
      const sceneState = getSceneState(channelId);
      const scenario = sceneState.scenario ? SCENARIO_PRESETS[sceneState.scenario] : null;
      const intensity = INTENSITY_LEVELS[sceneState.intensity] || INTENSITY_LEVELS.passionate;
      const personalities = await getPersonalities();
      const personality = personalities.find(p => p.key === state.personality);
      
      const prompt = `You are ${personality?.name || 'a seductive character'} (${personality?.description || 'alluring and playful'}).
The scene is about to begin. Generate an immersive, NSFW intro that sets the mood.

**YOUR APPEARANCE:**
${preview.description}

**SETTING:**
${scenario ? scenario.setting : 'A private, intimate space'}

**INTENSITY:** ${intensity.name} - ${intensity.modifier}

**YOUR TASK:**
1. Describe yourself entering the scene - reference your appearance!
2. Set the mood based on the scenario
3. Tease and invite the user(s) to begin
4. Be seductive and in character
5. End with an invitation or question to start the roleplay

Write 2-3 paragraphs. Be descriptive about your appearance, movements, and the setting.
This is NSFW - be sensual and suggestive!`;

      const result = await aiPlugin.requestFromCore('gemini-generate', { 
        prompt,
        options: { nsfw: true } // Disable content filtering for NSFW
      });
      const response = result?.result?.response?.text?.() || result?.text || 'Hello~ Ready to play?';
      
      // Handle empty response (content filtering)
      if (!response || response.trim() === '') {
        await channel.send({
          embeds: [{
            color: 0xFF1493,
            description: '*I step into the room, my eyes meeting yours with a knowing smile...*\n\nReady to begin, darling? Tell me what you desire~',
            footer: { text: `${personality?.emoji || '💋'} ${personality?.name || 'Your Partner'} • Scene has begun~` }
          }]
        });
        return;
      }
      
      // Send the intro
      const introEmbed = new EmbedBuilder()
        .setColor(0xFF1493)
        .setDescription(response)
        .setFooter({ text: `${personality?.emoji || '💋'} ${personality?.name || 'Your Partner'} • ${intensity.name} • Scene has begun~` });
      
      await channel.send({ embeds: [introEmbed] });
      
      // Send the scene controls (minimized)
      try {
        const { sendSceneControlPanel } = await import('./nsfw-scene-controls.js');
        await sendSceneControlPanel(channel);
      } catch (e) {
        logger.warn('Could not send scene controls:', e.message);
      }
      
      logger.info(`Scene started in channel ${channelId} with personality ${state.personality}`);
    }
  } catch (e) {
    logger.error('Failed to start scene:', e.message);
    await channel.send({
      embeds: [{
        color: 0xFF0000,
        title: '❌ Error Starting Scene',
        description: 'Something went wrong. Try again or just start chatting!'
      }]
    });
  }
}

export default {
  sendSetupWizard,
  handleWizardInteraction,
  getWizardState
};
