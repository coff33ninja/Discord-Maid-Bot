import { Plugin } from '../src/core/plugin-system.js';

/**
 * Device Health Monitoring Plugin
 * Tracks device uptime, response times, and generates health reports
 * 
 * Features:
 * - Uptime percentage tracking
 * - Response time trends
 * - Offline duration tracking
 * - Predictive alerts (device usually online at this time)
 * - Health reports per device
 * - Device reliability comparison
 */
export default class DeviceHealthPlugin extends Plugin {
  constructor() {
    super('device-health', '1.0.0', 'Track device uptime and health metrics');
    this.healthData = new Map(); // deviceMac -> health stats
    this.checkInterval = null;
    this.client = null;
  }
  
  async onLoad() {
    console.log('🏥 Device Health Monitoring plugin loaded');
    
    // Load historical health data from database
    await this.loadHealthData();
    
    // Start periodic health checks (every 5 minutes)
    this.startHealthChecks();
    
    console.log(`   Monitoring ${this.healthData.size} device(s)`);
  }
  
  async onUnload() {
    // Stop health checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Save health data
    await this.saveHealthData();
    
    console.log('🏥 Device Health Monitoring plugin unloaded');
  }
  
  setClient(client) {
    this.client = client;
  }
  
  async loadHealthData() {
    const { configOps } = await import('../src/database/db.js');
    const savedData = configOps.get('device_health_data');
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.healthData = new Map(Object.entries(parsed));
      } catch (e) {
        console.error('   Failed to parse health data:', e);
      }
    }
  }
  
  async saveHealthData() {
    const { configOps } = await import('../src/database/db.js');
    const dataObj = Object.fromEntries(this.healthData);
    configOps.set('device_health_data', JSON.stringify(dataObj));
  }
  
  startHealthChecks() {
    // Check every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000);
  }
  
  async performHealthCheck() {
    const { deviceOps } = await import('../src/database/db.js');
    const devices = deviceOps.getAll();
    const now = Date.now();
    
    for (const device of devices) {
      const mac = device.mac;
      
      // Initialize health data if not exists
      if (!this.healthData.has(mac)) {
        this.healthData.set(mac, {
          mac,
          name: device.notes || device.hostname || device.ip,
          firstSeen: now,
          lastSeen: now,
          totalChecks: 0,
          onlineChecks: 0,
          offlineChecks: 0,
          responseTimes: [],
          offlinePeriods: [],
          currentOfflineStart: null,
          uptimePercentage: 100,
          averageResponseTime: 0,
          lastOnline: now,
          lastOffline: null
        });
      }
      
      const health = this.healthData.get(mac);
      health.totalChecks++;
      health.lastSeen = now;
      health.name = device.notes || device.hostname || device.ip; // Update name
      
      if (device.online) {
        health.onlineChecks++;
        health.lastOnline = now;
        
        // Track response time
        if (device.latency) {
          health.responseTimes.push({
            timestamp: now,
            latency: device.latency
          });
          
          // Keep only last 100 response times
          if (health.responseTimes.length > 100) {
            health.responseTimes.shift();
          }
          
          // Calculate average response time
          const sum = health.responseTimes.reduce((acc, rt) => acc + rt.latency, 0);
          health.averageResponseTime = Math.round(sum / health.responseTimes.length);
        }
        
        // If was offline, record offline period
        if (health.currentOfflineStart) {
          const offlineDuration = now - health.currentOfflineStart;
          health.offlinePeriods.push({
            start: health.currentOfflineStart,
            end: now,
            duration: offlineDuration
          });
          
          // Keep only last 50 offline periods
          if (health.offlinePeriods.length > 50) {
            health.offlinePeriods.shift();
          }
          
          health.currentOfflineStart = null;
        }
      } else {
        health.offlineChecks++;
        health.lastOffline = now;
        
        // Mark offline start if not already marked
        if (!health.currentOfflineStart) {
          health.currentOfflineStart = now;
        }
      }
      
      // Calculate uptime percentage
      health.uptimePercentage = Math.round((health.onlineChecks / health.totalChecks) * 100);
      
      this.healthData.set(mac, health);
    }
    
    // Save health data periodically
    await this.saveHealthData();
  }
  
  // Event handler: Network scan completed
  async onNetworkScan(devices) {
    // Update health data when network scan completes
    await this.performHealthCheck();
    return { processed: true };
  }
  
  // Get health report for a specific device
  getDeviceHealth(deviceMac) {
    const health = this.healthData.get(deviceMac);
    if (!health) {
      return null;
    }
    
    const now = Date.now();
    const ageInDays = Math.floor((now - health.firstSeen) / (1000 * 60 * 60 * 24));
    
    // Calculate current offline duration if offline
    let currentOfflineDuration = 0;
    if (health.currentOfflineStart) {
      currentOfflineDuration = now - health.currentOfflineStart;
    }
    
    // Calculate average offline duration
    let avgOfflineDuration = 0;
    if (health.offlinePeriods.length > 0) {
      const totalOffline = health.offlinePeriods.reduce((acc, p) => acc + p.duration, 0);
      avgOfflineDuration = totalOffline / health.offlinePeriods.length;
    }
    
    // Calculate longest offline period
    let longestOffline = 0;
    if (health.offlinePeriods.length > 0) {
      longestOffline = Math.max(...health.offlinePeriods.map(p => p.duration));
    }
    
    return {
      ...health,
      ageInDays,
      currentOfflineDuration,
      avgOfflineDuration,
      longestOffline,
      totalOfflineTime: health.offlinePeriods.reduce((acc, p) => acc + p.duration, 0),
      offlineIncidents: health.offlinePeriods.length
    };
  }
  
  // Get health report for all devices
  getAllDeviceHealth() {
    const reports = [];
    
    for (const [mac, health] of this.healthData.entries()) {
      reports.push(this.getDeviceHealth(mac));
    }
    
    // Sort by uptime percentage (worst first)
    return reports.sort((a, b) => a.uptimePercentage - b.uptimePercentage);
  }
  
  // Get devices with poor health (uptime < 90%)
  getUnhealthyDevices() {
    return this.getAllDeviceHealth().filter(h => h.uptimePercentage < 90);
  }
  
  // Get most reliable devices (uptime > 99%)
  getMostReliableDevices() {
    return this.getAllDeviceHealth()
      .filter(h => h.uptimePercentage > 99)
      .sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }
  
  // Compare two devices
  compareDevices(mac1, mac2) {
    const health1 = this.getDeviceHealth(mac1);
    const health2 = this.getDeviceHealth(mac2);
    
    if (!health1 || !health2) {
      return null;
    }
    
    return {
      device1: health1,
      device2: health2,
      comparison: {
        uptimeDiff: health1.uptimePercentage - health2.uptimePercentage,
        responseTimeDiff: health1.averageResponseTime - health2.averageResponseTime,
        offlineIncidentsDiff: health1.offlineIncidents - health2.offlineIncidents,
        moreReliable: health1.uptimePercentage > health2.uptimePercentage ? health1.name : health2.name
      }
    };
  }
  
  // Get health summary statistics
  getHealthSummary() {
    const allHealth = this.getAllDeviceHealth();
    
    if (allHealth.length === 0) {
      return {
        totalDevices: 0,
        averageUptime: 0,
        healthyDevices: 0,
        unhealthyDevices: 0,
        mostReliable: null,
        leastReliable: null
      };
    }
    
    const totalUptime = allHealth.reduce((acc, h) => acc + h.uptimePercentage, 0);
    const avgUptime = Math.round(totalUptime / allHealth.length);
    
    return {
      totalDevices: allHealth.length,
      averageUptime: avgUptime,
      healthyDevices: allHealth.filter(h => h.uptimePercentage >= 90).length,
      unhealthyDevices: allHealth.filter(h => h.uptimePercentage < 90).length,
      mostReliable: allHealth[allHealth.length - 1], // Sorted worst to best
      leastReliable: allHealth[0]
    };
  }
  
  // Predictive alert: Check if device should be online but isn't
  async checkPredictiveAlerts() {
    const { deviceOps } = await import('../src/database/db.js');
    const devices = deviceOps.getAll();
    const now = new Date();
    const currentHour = now.getHours();
    const alerts = [];
    
    for (const device of devices) {
      const health = this.healthData.get(device.mac);
      if (!health || device.online) continue;
      
      // Check if device is usually online at this hour
      // (This is a simple heuristic - could be improved with ML)
      if (health.uptimePercentage > 80 && health.currentOfflineStart) {
        const offlineDuration = Date.now() - health.currentOfflineStart;
        
        // Alert if offline for more than 30 minutes and usually reliable
        if (offlineDuration > 30 * 60 * 1000) {
          alerts.push({
            device: health.name,
            mac: device.mac,
            message: `${health.name} is offline but usually has ${health.uptimePercentage}% uptime`,
            offlineDuration: Math.round(offlineDuration / (1000 * 60)), // minutes
            uptimePercentage: health.uptimePercentage
          });
        }
      }
    }
    
    return alerts;
  }
  
  // Format duration for display
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
