import { Plugin } from '../../src/core/plugin-system.js';

/**
 * AI-Powered Network Insights Plugin
 * Analyzes network patterns and provides intelligent insights
 * 
 * Features:
 * - Weekly network health reports
 * - Unusual activity detection
 * - Speed trend analysis
 * - Device behavior patterns
 * - Predictive maintenance alerts
 */
export default class NetworkInsightsPlugin extends Plugin {
  constructor() {
    super('network-insights', '1.0.0', 'AI-powered network analysis and insights');
    this.insights = [];
    this.lastAnalysis = null;
    this.client = null;
  }
  
  async onLoad() {
    console.log('🧠 Network Insights plugin loaded');
    
    // Load insights history from database
    const { configOps } = await import('../../src/database/db.js');
    const savedInsights = configOps.get('network_insights_history');
    
    if (savedInsights) {
      try {
        this.insights = JSON.parse(savedInsights);
        console.log(`   Loaded ${this.insights.length} historical insight(s)`);
      } catch (e) {
        console.error('   Failed to parse insights history:', e);
      }
    }
  }
  
  setClient(client) {
    this.client = client;
  }
  
  async saveInsights() {
    const { configOps } = await import('../../src/database/db.js');
    // Keep only last 50 insights
    const recentInsights = this.insights.slice(-50);
    configOps.set('network_insights_history', JSON.stringify(recentInsights));
  }
  
  async generateInsights() {
    const { deviceOps, speedTestOps } = await import('../../src/database/db.js');
    const { generateWithRotation } = await import('../../src/config/gemini-keys.js');
    
    // Gather data
    const devices = deviceOps.getAll();
    const speedTests = speedTestOps.getRecent(30); // Last 30 tests
    
    // Calculate statistics
    const stats = this.calculateNetworkStats(devices, speedTests);
    
    // Generate AI insights
    const prompt = `You are a network analyst AI. Analyze this network data and provide 3-5 actionable insights.

Network Statistics:
- Total Devices: ${stats.totalDevices}
- Online Devices: ${stats.onlineDevices}
- Offline Devices: ${stats.offlineDevices}
- Average Uptime: ${stats.avgUptime}%
- New Devices (last 7 days): ${stats.newDevices}
- Unknown Devices: ${stats.unknownDevices}

Speed Test Data (last 30 tests):
- Average Download: ${stats.avgDownload} Mbps
- Average Upload: ${stats.avgUpload} Mbps
- Average Ping: ${stats.avgPing} ms
- Speed Trend: ${stats.speedTrend}
- Slowest Test: ${stats.slowestTest} Mbps
- Fastest Test: ${stats.fastestTest} Mbps

Device Patterns:
${stats.devicePatterns}

Provide insights in this format:
1. [Insight Title] - [Brief explanation and recommendation]
2. [Insight Title] - [Brief explanation and recommendation]
...

Focus on:
- Unusual patterns or anomalies
- Performance issues
- Security concerns (unknown devices)
- Optimization opportunities
- Predictive maintenance

Be concise, actionable, and friendly. Use emojis where appropriate.`;

    try {
      const { result } = await generateWithRotation(prompt);
      const response = result.response;
      
      if (response && typeof response.text === 'function') {
        const insightsText = response.text();
        
        // Save insight
        const insight = {
          timestamp: new Date().toISOString(),
          stats,
          insights: insightsText,
          deviceCount: stats.totalDevices,
          speedTestCount: speedTests.length
        };
        
        this.insights.push(insight);
        this.lastAnalysis = insight;
        await this.saveInsights();
        
        return insight;
      } else {
        throw new Error('Failed to generate insights');
      }
    } catch (error) {
      console.error('Failed to generate network insights:', error);
      throw error;
    }
  }
  
  calculateNetworkStats(devices, speedTests) {
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Device statistics
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.online).length;
    const offlineDevices = totalDevices - onlineDevices;
    const newDevices = devices.filter(d => new Date(d.first_seen).getTime() > sevenDaysAgo).length;
    const unknownDevices = devices.filter(d => !d.notes && !d.hostname).length;
    
    // Calculate average uptime (simplified)
    const avgUptime = totalDevices > 0 
      ? Math.round((onlineDevices / totalDevices) * 100) 
      : 0;
    
    // Speed test statistics
    let avgDownload = 0;
    let avgUpload = 0;
    let avgPing = 0;
    let slowestTest = Infinity;
    let fastestTest = 0;
    let speedTrend = 'stable';
    
    if (speedTests.length > 0) {
      const downloads = speedTests.map(t => parseFloat(t.download));
      const uploads = speedTests.map(t => parseFloat(t.upload));
      const pings = speedTests.map(t => parseFloat(t.ping));
      
      avgDownload = (downloads.reduce((a, b) => a + b, 0) / downloads.length).toFixed(2);
      avgUpload = (uploads.reduce((a, b) => a + b, 0) / uploads.length).toFixed(2);
      avgPing = (pings.reduce((a, b) => a + b, 0) / pings.length).toFixed(2);
      
      slowestTest = Math.min(...downloads).toFixed(2);
      fastestTest = Math.max(...downloads).toFixed(2);
      
      // Calculate trend (compare first half vs second half)
      if (speedTests.length >= 4) {
        const midpoint = Math.floor(speedTests.length / 2);
        const firstHalf = downloads.slice(0, midpoint);
        const secondHalf = downloads.slice(midpoint);
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const change = ((secondAvg - firstAvg) / firstAvg) * 100;
        
        if (change > 10) speedTrend = 'improving';
        else if (change < -10) speedTrend = 'declining';
        else speedTrend = 'stable';
      }
    }
    
    // Device patterns
    const devicePatterns = this.analyzeDevicePatterns(devices);
    
    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      avgUptime,
      newDevices,
      unknownDevices,
      avgDownload,
      avgUpload,
      avgPing,
      speedTrend,
      slowestTest,
      fastestTest,
      devicePatterns
    };
  }
  
  analyzeDevicePatterns(devices) {
    const patterns = [];
    
    // Group by device type (based on hostname patterns)
    const mobileDevices = devices.filter(d => 
      (d.hostname || '').toLowerCase().includes('phone') || 
      (d.hostname || '').toLowerCase().includes('iphone') ||
      (d.hostname || '').toLowerCase().includes('android')
    );
    
    const computers = devices.filter(d => 
      (d.hostname || '').toLowerCase().includes('pc') || 
      (d.hostname || '').toLowerCase().includes('laptop') ||
      (d.hostname || '').toLowerCase().includes('desktop')
    );
    
    const iotDevices = devices.filter(d => 
      (d.hostname || '').toLowerCase().includes('esp') || 
      (d.hostname || '').toLowerCase().includes('arduino') ||
      (d.hostname || '').toLowerCase().includes('smart')
    );
    
    if (mobileDevices.length > 0) {
      patterns.push(`- ${mobileDevices.length} mobile device(s) detected`);
    }
    
    if (computers.length > 0) {
      patterns.push(`- ${computers.length} computer(s) detected`);
    }
    
    if (iotDevices.length > 0) {
      patterns.push(`- ${iotDevices.length} IoT device(s) detected`);
    }
    
    // Check for devices that are frequently offline
    const frequentlyOffline = devices.filter(d => !d.online && d.last_seen).length;
    if (frequentlyOffline > 0) {
      patterns.push(`- ${frequentlyOffline} device(s) currently offline`);
    }
    
    return patterns.length > 0 ? patterns.join('\n') : '- No specific patterns detected';
  }
  
  async getLatestInsight() {
    return this.lastAnalysis;
  }
  
  async getInsightHistory(limit = 10) {
    return this.insights.slice(-limit).reverse();
  }
  
  // Event handler: Network scan completed
  async onNetworkScan(devices) {
    // Could trigger automatic analysis on certain conditions
    // For now, just log
    console.log(`🧠 Network Insights: Scan detected ${devices.length} devices`);
    return { processed: true };
  }
  
  // Event handler: Speed test completed
  async onSpeedTest(results) {
    // Could trigger automatic analysis if speed drops significantly
    console.log(`🧠 Network Insights: Speed test ${results.download} Mbps`);
    return { processed: true };
  }
}
