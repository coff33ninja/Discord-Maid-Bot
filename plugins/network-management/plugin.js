import { Plugin } from '../../src/core/plugin-system.js';

/**
 * Network Management Plugin
 * 
 * Comprehensive network management with device discovery, monitoring, and control.
 * 
 * Features:
 * - Network scanning (local + Tailscale)
 * - Device discovery and tracking
 * - Wake-on-LAN support
 * - Device configuration and grouping
 * - Real-time device status
 * - Tailscale integration
 */
export default class NetworkManagementPlugin extends Plugin {
  constructor() {
    super('network-management', '1.0.0', 'Network scanning, device management, and WOL');
    this.networkDevices = [];
    this.lastScanTime = null;
  }
  
  async onLoad() {
    console.log('🌐 Network Management plugin loaded');
    console.log('   Features: Scan, Devices, WOL, Config, Groups');
  }
  
  async onUnload() {
    console.log('🌐 Network Management plugin unloaded');
  }
  
  // Provide network device cache to other plugins
  getNetworkDevices() {
    return this.networkDevices;
  }
  
  getLastScanTime() {
    return this.lastScanTime;
  }
  
  updateNetworkDevices(devices) {
    this.networkDevices = devices;
    this.lastScanTime = new Date();
  }
}
