import { Plugin } from '../../src/core/plugin-system.js';

export default class ExamplePlugin extends Plugin {
  constructor() {
    super('1.0.0.0-beta', '1.0.0', 'An example plugin demonstrating the plugin system');
  }
  
  async onLoad() {
    console.log('Example plugin loaded!');
  }
  
  async onUnload() {
    console.log('Example plugin unloaded!');
  }
  
  async onEnable() {
    console.log('Example plugin enabled!');
  }
  
  async onDisable() {
    console.log('Example plugin disabled!');
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
