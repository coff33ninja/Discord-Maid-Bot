import { Plugin } from '../../src/core/plugin-system.js';

/**
 * Example Plugin
 * 
 * Demonstrates the plugin system including:
 * - Basic plugin lifecycle (load, unload, enable, disable)
 * - Event handlers (network scan, speed test)
 * - Custom methods
 * - AI Action Registration (for conversational AI integration)
 */
export default class ExamplePlugin extends Plugin {
  constructor() {
    super('example-plugin', '1.0.0', 'An example plugin demonstrating the plugin system');
  }
  
  async onLoad() {
    console.log('Example plugin loaded!');
    
    // Register actions with the conversational AI (if available)
    await this.registerAIActions();
  }
  
  async onUnload() {
    console.log('Example plugin unloaded!');
    
    // Unregister AI actions
    await this.unregisterAIActions();
  }
  
  async onEnable() {
    console.log('Example plugin enabled!');
  }
  
  async onDisable() {
    console.log('Example plugin disabled!');
  }
  
  /**
   * Register actions with the conversational AI
   * This allows users to trigger plugin features via natural language
   */
  async registerAIActions() {
    try {
      const { registerAction, registerCapabilities } = await import('../conversational-ai/context/action-registry.js');
      
      // Register an action the AI can execute
      // Users can say "greet me" or "say hello" and the AI will execute this
      registerAction('example-greet', {
        keywords: ['greet me', 'say hello', 'example greeting'],
        plugin: 'example-plugin',
        description: 'Send a greeting from the example plugin',
        // Permission level: 'everyone', 'moderator', or 'admin'
        permission: 'everyone',
        async execute(context) {
          const name = context.username || 'friend';
          return { 
            greeting: `Hello, ${name}! This is the example plugin speaking.`,
            timestamp: new Date().toISOString()
          };
        },
        formatResult(result) {
          return `👋 ${result.greeting}`;
        }
      });
      
      // Register plugin capabilities for AI awareness
      // This tells the AI what this plugin can do
      registerCapabilities('example-plugin', {
        description: 'Example plugin demonstrating the plugin system',
        features: [
          'Greeting users',
          'Demonstrating plugin lifecycle',
          'Handling network and speed test events'
        ],
        commands: [
          { name: '/example greet', description: 'Get a greeting' }
        ],
        naturalLanguage: [
          { triggers: ['greet me', 'say hello'], action: 'Sends a friendly greeting' }
        ]
      });
      
      console.log('Example plugin: Registered AI actions');
    } catch (e) {
      // Conversational AI plugin not available - that's okay
      console.log('Example plugin: Conversational AI not available, skipping action registration');
    }
  }
  
  /**
   * Unregister AI actions when plugin unloads
   */
  async unregisterAIActions() {
    try {
      const { unregisterAction, unregisterCapabilities } = await import('../conversational-ai/context/action-registry.js');
      unregisterAction('example-greet');
      unregisterCapabilities('example-plugin');
      console.log('Example plugin: Unregistered AI actions');
    } catch (e) {
      // Conversational AI plugin not available
    }
  }
  
  // Custom command
  async greet(name) {
    return `Hello, ${name}! This is the example plugin.`;
  }
  
  // Event handlers
  async onNetworkScan(devices) {
    console.log(`Example plugin: Network scan found ${devices.length} devices`);
    return { processed: true, deviceCount: devices.length };
  }
  
  async onSpeedTest(results) {
    console.log(`Example plugin: Speed test completed - ${results.download} Mbps`);
    return { processed: true };
  }
}
