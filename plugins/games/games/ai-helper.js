/**
 * AI Helper for Games
 * Provides generateWithRotation for game files
 */

// Re-export from the main gemini-keys config
export async function generateWithRotation(prompt, options = {}) {
  try {
    const { generateWithRotation: generate } = await import('../../../src/config/gemini-keys.js');
    return await generate(prompt, options);
  } catch (error) {
    console.error('AI generation error:', error.message);
    throw error;
  }
}

export default { generateWithRotation };
