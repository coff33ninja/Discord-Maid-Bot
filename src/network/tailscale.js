import { exec } from 'child_process';
import { promisify } from 'util';
import ping from 'ping';
import arp from 'node-arp';

const execAsync = promisify(exec);

// Alternative ping function using native Windows ping
async function pingDevice(ip) {
  try {
    // Try using the ping module first
    const result = await ping.promise.probe(ip, { 
      timeout: 5,
      min_reply: 1
    });
    
    if (result.alive) {
      return { alive: true, time: parseFloat(result.time) };
    }
    
    // If ping module says offline, try native Windows ping as fallback
    try {
      const { stdout } = await execAsync(`ping -n 1 -w 5000 ${ip}`);
      
      // Check if ping was successful
      if (stdout.includes('Reply from') || stdout.includes('bytes=')) {
        // Extract time from output (e.g., "time=25ms" or "time<1ms")
        const timeMatch = stdout.match(/time[<=](\d+)ms/i);
        const time = timeMatch ? parseInt(timeMatch[1]) : 1;
        return { alive: true, time };
      }
    } catch (cmdError) {
      // Native ping also failed
    }
    
    return { alive: false, time: null };
  } catch (error) {
    console.error(`Ping error for ${ip}:`, error.message);
    return { alive: false, time: null };
  }
}

// Get Tailscale status
export async function getTailscaleStatus() {
  try {
    const { stdout } = await execAsync('tailscale status --json');
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Tailscale not available:', error.message);
    return null;
  }
}

// Get Tailscale devices
export async function getTailscaleDevices() {
  try {
    const status = await getTailscaleStatus();
    if (!status) return [];
    
    const devices = [];
    
    // Parse Tailscale peers
    for (const [id, peer] of Object.entries(status.Peer || {})) {
      devices.push({
        id,
        hostname: peer.HostName || 'Unknown',
        ip: peer.TailscaleIPs?.[0] || 'unknown',
        online: false, // Will be determined by ping
        os: peer.OS || 'unknown',
        lastSeen: peer.LastSeen,
        exitNode: peer.ExitNode || false,
        network: 'tailscale',
        latency: null
      });
    }
    
    return devices;
  } catch (error) {
    console.error('Failed to get Tailscale devices:', error);
    return [];
  }
}

// Scan Tailscale network
export async function scanTailscaleNetwork() {
  console.log('🔍 Scanning Tailscale network...');
  
  const devices = await getTailscaleDevices();
  
  if (devices.length === 0) {
    console.log('⚠️  No Tailscale devices found');
    return [];
  }
  
  console.log(`📡 Pinging ${devices.length} Tailscale devices...`);
  
  // Ping each device to verify connectivity
  const promises = devices.map(async (device) => {
    console.log(`  Pinging ${device.hostname} (${device.ip})...`);
    
    try {
      // Use our custom ping function with fallback
      const result = await pingDevice(device.ip);
      
      console.log(`  ${device.hostname}: ${result.alive ? '✅ Online' : '❌ Offline'} ${result.alive ? `(${result.time}ms)` : ''}`);
      
      device.online = result.alive;
      device.latency = result.alive ? Math.round(result.time) : null;
      
      // Try to get MAC address (may not work for Tailscale VPN)
      if (result.alive) {
        return new Promise((resolve) => {
          arp.getMAC(device.ip, (err, mac) => {
            device.mac = mac || 'N/A (Tailscale)';
            resolve(device);
          });
        });
      } else {
        device.mac = 'N/A (Offline)';
      }
    } catch (error) {
      console.error(`  ${device.hostname}: ❌ Error - ${error.message}`);
      device.online = false;
      device.latency = null;
      device.mac = 'N/A (Error)';
    }
    return device;
  });
  
  const results = await Promise.all(promises);
  
  const onlineCount = results.filter(d => d.online).length;
  console.log(`✅ Tailscale scan complete: ${onlineCount}/${results.length} devices online`);
  
  return results;
}

// Get Tailscale subnet routes
export async function getTailscaleRoutes() {
  try {
    const { stdout } = await execAsync('tailscale status');
    // Parse routes from status output
    const routes = [];
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('subnet')) {
        routes.push(line.trim());
      }
    }
    
    return routes;
  } catch (error) {
    console.error('Failed to get Tailscale routes:', error);
    return [];
  }
}

// Check if Tailscale is installed and running
export async function isTailscaleAvailable() {
  try {
    await execAsync('tailscale version');
    return true;
  } catch (error) {
    return false;
  }
}

// Get Tailscale IP of current machine
export async function getTailscaleIP() {
  try {
    const status = await getTailscaleStatus();
    return status?.Self?.TailscaleIPs?.[0] || null;
  } catch (error) {
    return null;
  }
}
