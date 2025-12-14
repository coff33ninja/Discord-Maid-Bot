import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * Speed Alerts Plugin
 * Monitors internet speed and sends alerts when speed drops below threshold
 */
export default class SpeedAlertsPlugin extends Plugin {
  constructor() {
    super('speed-alerts', '1.0.0', 'Alert when internet speed drops below threshold');
    this.logger = createLogger('speed-alerts');
    this.threshold = 50; // Default 50 Mbps
    this.alertChannel = null;
    this.client = null;
  }
  
  async onLoad() {
    this.logger.info('🚨 Speed Alerts plugin loaded');
    
    // Load settings from database
    const { configOps } = await import('../../src/database/db.js');
    const savedThreshold = configOps.get('speed_alert_threshold');
    const savedChannel = configOps.get('speed_alert_channel');
    
    if (savedThreshold) {
      this.threshold = parseFloat(savedThreshold);
    }
    
    if (savedChannel) {
      this.alertChannel = savedChannel;
    }
    
    this.logger.info(`   Threshold: ${this.threshold} Mbps`);
    this.logger.info(`   Alert Channel: ${this.alertChannel || 'Not configured'}`);
  }
  
  setClient(client) {
    this.client = client;
  }
  
  async setThreshold(mbps) {
    this.threshold = mbps;
    const { configOps } = await import('../../src/database/db.js');
    configOps.set('speed_alert_threshold', mbps.toString());
    return { success: true, threshold: mbps };
  }
  
  async setAlertChannel(channelId) {
    this.alertChannel = channelId;
    const { configOps } = await import('../../src/database/db.js');
    configOps.set('speed_alert_channel', channelId);
    return { success: true, channelId };
  }
  
  async getSettings() {
    return {
      threshold: this.threshold,
      alertChannel: this.alertChannel,
      enabled: this.enabled
    };
  }
  
  async onSpeedTest(results) {
    if (!this.enabled || !this.alertChannel || !this.client) {
      return { processed: false };
    }
    
    const { download, upload, ping, server } = results;
    
    // Check if speed is below threshold
    if (download < this.threshold) {
      try {
        const channel = await this.client.channels.fetch(this.alertChannel);
        
        const severity = download < this.threshold * 0.5 ? '🔴 CRITICAL' : '🟡 WARNING';
        const percentage = Math.round((download / this.threshold) * 100);
        
        await channel.send({
          embeds: [{
            color: download < this.threshold * 0.5 ? 0xFF0000 : 0xFFA500,
            title: `${severity} - Slow Internet Detected`,
            description: `Your internet speed has dropped below the alert threshold!`,
            fields: [
              { name: '📥 Download', value: `${download.toFixed(2)} Mbps`, inline: true },
              { name: '📤 Upload', value: `${upload.toFixed(2)} Mbps`, inline: true },
              { name: '🏓 Ping', value: `${ping.toFixed(0)} ms`, inline: true },
              { name: '🎯 Threshold', value: `${this.threshold} Mbps`, inline: true },
              { name: '📊 Performance', value: `${percentage}% of threshold`, inline: true },
              { name: '🌐 Server', value: server || 'Unknown', inline: true }
            ],
            footer: { text: 'Speed Alerts Plugin' },
            timestamp: new Date()
          }]
        });
        
        this.logger.info(`🚨 Speed alert sent: ${download.toFixed(2)} Mbps (threshold: ${this.threshold} Mbps)`);
        
        return { processed: true, alerted: true };
      } catch (error) {
        this.logger.error('Failed to send speed alert:', error);
        return { processed: false, error: error.message };
      }
    }
    
    return { processed: true, alerted: false };
  }
}
