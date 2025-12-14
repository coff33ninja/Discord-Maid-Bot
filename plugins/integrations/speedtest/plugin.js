import { Plugin } from '../../src/core/plugin-system.js';
import speedtest from 'speedtest-net';
import { speedTestOps } from '../../src/database/db.js';
import { broadcastUpdate } from '../../src/dashboard/server.js';

/**
 * Speed Test Integration Plugin
 * 
 * Provides internet speed testing functionality with history tracking.
 * 
 * Features:
 * - Run speed tests (download, upload, ping)
 * - Speed test history
 * - Dashboard integration
 * - Plugin event emission
 * - Database persistence
 */
export default class SpeedTestPlugin extends Plugin {
  constructor() {
    super('integrations/speedtest', '1.0.0', 'Internet speed testing with history');
  }
  
  async onLoad() {
    console.log('🚀 Speed Test plugin loaded');
    console.log('   Features: Speed test, History tracking');
  }
  
  async onUnload() {
    console.log('🚀 Speed Test plugin unloaded');
  }
  
  // Run speed test
  async runSpeedtest(userId = null) {
    console.log('🚀 Running speedtest...');
    const result = await speedtest({ acceptLicense: true, acceptGdpr: true });
    
    const testResult = {
      download: (result.download.bandwidth * 8 / 1000000).toFixed(2),
      upload: (result.upload.bandwidth * 8 / 1000000).toFixed(2),
      ping: result.ping.latency.toFixed(2),
      server: result.server.name,
      isp: result.isp,
      userId
    };
    
    // Save to database
    speedTestOps.add(testResult);
    
    // Broadcast to dashboard
    broadcastUpdate('speedtest-complete', testResult);
    
    // Emit to other plugins
    try {
      const { emitToPlugins } = await import('../src/core/plugin-system.js');
      await emitToPlugins('speedTest', testResult);
    } catch (error) {
      // Plugin system not available
    }
    
    return testResult;
  }
  
  // Get speed test history
  getHistory(limit = 10) {
    return speedTestOps.getRecent(limit);
  }
}
