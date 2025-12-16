# profile-components.js

**Path:** `plugins\user-profiles\profile-components.js`

## Description
* Interactive Profile Setup Components

## Dependencies
- `discord.js` → ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)

## Exports
- **GENDER_OPTIONS** [const] (L15) - Gender options
- **PRONOUN_OPTIONS** [const] (L26) - Pronoun options - Extended
- **PERSONALITY_OPTIONS** [const] (L45) - Personality type options - Extended with MBTI and more
- **INTEREST_CATEGORIES** [const] (L72) - Interest categories - Extended
- **INTEREST_CATEGORIES_2** [const] (L108) - More interest categories (page 2)
- **buildWelcomeMessage** [function] (L141) - Build the welcome message with interactive setup
- **buildGenderSelect** [function] (L190) - Build gender selection menu
- **buildPronounSelect** [function] (L214) - Build pronoun selection menu
- **buildPersonalitySelect** [function] (L237) - Build personality selection menu
- **buildInterestsSelect** [function] (L262) - Build interests selection menu (multi-select with two pages)
- **buildSetupStep** [function] (L310) - Build the full setup wizard step
- **buildSetupComplete** [function] (L356) - Build setup complete message
- **buildProfileEmbed** [function] (L394) - Build profile view embed

## Functions
- ✓ `buildWelcomeMessage()` (L141) - Build the welcome message with interactive setup
- ✓ `buildGenderSelect()` (L190) - Build gender selection menu
- ✓ `buildPronounSelect()` (L214) - Build pronoun selection menu
- ✓ `buildPersonalitySelect()` (L237) - Build personality selection menu
- ✓ `buildInterestsSelect(page = 1)` (L262) - Build interests selection menu (multi-select with two pages)
- ✓ `buildSetupStep(step, profile = {})` (L310) - Build the full setup wizard step
- ✓ `buildSetupComplete(profile)` (L356) - Build setup complete message
- ✓ `buildProfileEmbed(profile, user)` (L394) - Build profile view embed

## Constants
- ✓ **GENDER_OPTIONS** [array] (L15) - Gender options
- ✓ **PRONOUN_OPTIONS** [array] (L26) - Pronoun options - Extended
- ✓ **PERSONALITY_OPTIONS** [array] (L45) - Personality type options - Extended with MBTI and more
- ✓ **INTEREST_CATEGORIES** [array] (L72) - Interest categories - Extended
- ✓ **INTEREST_CATEGORIES_2** [array] (L108) - More interest categories (page 2)

