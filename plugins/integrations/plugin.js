import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

// Import subplugin classes
import HomeAssistantPlugin from './homeassistant/plugin.js';
import WeatherPlugin from './weather/plugin.js';
import SpeedTestPlugin from './speedtest/plugin.js';

/**
 * Integrations Plugin
 * 
 * Container plugin for external service integrations.
 * Manages lifecycle of sub-plugins:
 * - Home Assistant - Smart home control
 * - Weather - Weather information
 * - Speedtest - Internet speed testing
 */
export default class IntegrationsPlugin extends Plugin {
  constructor() {
    super('integrations', '1.0.0', 'External service integrations (HA, Weather, Speedtest)');
    this.logger = createLogger('integrations');
    
    // Initialize subplugins
    this.homeassistant = new HomeAssistantPlugin();
    this.weather = new WeatherPlugin();
    this.speedtest = new SpeedTestPlugin();
  }
  
  async onLoad() {
    this.logger.info('🔌 Integrations plugin loading...');
    
    // Load subplugins
    await this.homeassistant.onLoad();
    await this.weather.onLoad();
    await this.speedtest.onLoad();
    
    this.logger.info('   ✅ All integrations loaded');
  }
  
  async onUnload() {
    this.logger.info('🔌 Integrations plugin unloading...');
    
    // Unload subplugins
    await this.homeassistant.onUnload();
    await this.weather.onUnload();
    await this.speedtest.onUnload();
  }
  
  // Expose subplugins for other plugins to use
  getHomeAssistant() {
    return this.homeassistant;
  }
  
  getWeather() {
    return this.weather;
  }
  
  getSpeedTest() {
    return this.speedtest;
  }
}
