import ping from 'ping';
import arp from 'node-arp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { deviceOps } from '../../src/database/db.js';
import { detectDeviceType, getDeviceEmoji, DeviceType } from './device-detector.js';

const execAsync = promisify(exec);

// Cross-platform ping function
async function pingDevice(ip) {
  try {
    // Try using the ping module first (cross-platform)
    const result = await ping.promise.probe(ip, { 
      timeout: 5,
      min_reply: 1
    });
    
    if (result.alive) {
      return { alive: true, time: parseFloat(result.time) };
    }
    
    // If ping module says offline, try native ping as fallback
    try {
      // Detect platform and use appropriate ping command
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows 
        ? `ping -n 1 -w 5000 ${ip}`  // Windows: -n count, -w timeout in ms
        : `ping -c 1 -W 5 ${ip}`;     // Linux/Mac: -c count, -W timeout in seconds
      
      const { stdout } = await execAsync(pingCmd);
      
      // Check if ping was successful (works for both Windows and Linux)
      if (stdout.includes('Reply from') || stdout.includes('bytes from') || stdout.includes('bytes=')) {
        // Extract time from output
        // Windows: "time=25ms" or "time<1ms"
        // Linux: "time=25.0 ms" or "time=0.123 ms"
        const timeMatch = stdout.match(/time[<=](\d+(?:\.\d+)?)\s*ms/i);
        const time = timeMatch ? parseFloat(timeMatch[1]) : 1;
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
async function getTailscaleStatus() {
  try {
    const { stdout } = await execAsync('tailscale status --json');
    return JSON.parse(stdout);
  } catch (error) {
    return null;
  }
}

// Check if Tailscale is available
export async function isTailscaleAvailable() {
  try {
    await execAsync('tailscale version');
    return true;
  } catch (error) {
    return false;
  }
}

// Scan local network
async function scanLocalNetwork(subnet) {
  console.log('🔍 Scanning local network...');
  const devices = [];
  const baseIP = subnet.split('/')[0].split('.').slice(0, 3).join('.');
  
  const promises = [];
  for (let i = 1; i <= 254; i++) {
    const ip = `${baseIP}.${i}`;
    promises.push(
      pingDevice(ip).then(async (result) => {
        if (result.alive) {
          return new Promise((resolve) => {
            arp.getMAC(ip, async (err, mac) => {
              // Check if mac is a valid MAC address
              const isValidMac = mac && /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
              
              // Try to get existing device info from database
              const existingDevice = isValidMac ? deviceOps.getByMac(mac) : null;
              
              const device = {
                ip,
                mac: isValidMac ? mac : 'unknown',
                hostname: existingDevice?.hostname || ip,
                name: existingDevice?.notes || null, // User-assigned name
                emoji: existingDevice?.emoji || null,
                device_group: existingDevice?.device_group || null,
                online: true,
                latency: Math.round(result.time),
                network: 'local',
                device_type: existingDevice?.device_type || null
              };
              
              // Auto-detect device type if not already set
              if (!device.device_type && isValidMac) {
                try {
                  // Quick MAC-based detection (no nmap for speed)
                  const detection = await detectDeviceType({ ip, mac, hostname: device.hostname }, false);
                  if (detection.type !== DeviceType.UNKNOWN) {
                    device.device_type = detection.type;
                    // Auto-assign emoji if not set
                    if (!device.emoji) {
                      device.emoji = getDeviceEmoji(detection.type);
                    }
                  }
                } catch (e) {
                  // Detection failed, continue without type
                }
              }
              
              // Only add devices with valid MAC addresses OR devices that were previously registered
              // This prevents filling the database with temporary/ghost devices
              if (isValidMac || existingDevice) {
                devices.push(device);
                
                // Update database only for valid devices
                deviceOps.upsert(device);
              }
              
              resolve();
            });
          });
        }
      }).catch(() => {})
    );
  }
  
  await Promise.all(promises);
  console.log(`✅ Local network scan complete: ${devices.length} devices found`);
  return devices;
}

// Scan Tailscale network
async function scanTailscaleNetwork() {
  console.log('🔍 Scanning Tailscale network...');
  
  try {
    const status = await getTailscaleStatus();
    if (!status) {
      console.log('⚠️  Tailscale not available');
      return [];
    }
    
    const devices = [];
    
    // Parse Tailscale peers
    for (const [id, peer] of Object.entries(status.Peer || {})) {
      const tailscaleIP = peer.TailscaleIPs?.[0] || 'unknown';
      
      // Try to find existing device by IP, hostname, or Tailscale ID
      const allDevices = deviceOps.getAll();
      const tailscaleMac = `ts:${id.substring(0, 16)}`;
      const existingDevice = allDevices.find(d => 
        d.ip === tailscaleIP || 
        d.hostname === peer.HostName ||
        d.mac === tailscaleMac
      );
      
      devices.push({
        id,
        hostname: peer.HostName || 'Unknown',
        ip: tailscaleIP,
        mac: existingDevice?.mac || tailscaleMac,
        name: existingDevice?.notes || null, // User-assigned name
        emoji: existingDevice?.emoji || null,
        device_group: existingDevice?.device_group || null,
        online: false, // Will be determined by ping
        os: peer.OS || 'unknown',
        lastSeen: peer.LastSeen,
        exitNode: peer.ExitNode || false,
        network: 'tailscale',
        latency: null,
        device_type: existingDevice?.device_type || null
      });
    }
    
    if (devices.length === 0) {
      console.log('⚠️  No Tailscale devices found');
      return [];
    }
    
    console.log(`📡 Pinging ${devices.length} Tailscale devices...`);
    
    // Ping each device to verify connectivity
    const promises = devices.map(async (device) => {
      try {
        const result = await pingDevice(device.ip);
        device.online = result.alive;
        device.latency = result.alive ? Math.round(result.time) : null;
        
        // Update database - use Tailscale ID as MAC for VPN devices
        const macAddress = device.mac === 'N/A (VPN)' 
          ? `ts:${device.id.substring(0, 16)}` // Use Tailscale ID as unique identifier
          : device.mac;
        
        deviceOps.upsert({
          ip: device.ip,
          mac: macAddress,
          hostname: device.hostname
        });
      } catch (error) {
        console.error(`  ${device.hostname}: ❌ Error - ${error.message}`);
        device.online = false;
        device.latency = null;
      }
      return device;
    });
    
    const results = await Promise.all(promises);
    const onlineCount = results.filter(d => d.online).length;
    console.log(`✅ Tailscale scan complete: ${onlineCount}/${results.length} devices online`);
    
    return results;
  } catch (error) {
    console.error('Failed to scan Tailscale network:', error);
    return [];
  }
}

// Quick ping check - only pings already registered devices
export async function quickPingCheck() {
  console.log('🔄 Quick ping check of registered devices...');
  
  const allDevices = deviceOps.getAll();
  
  if (allDevices.length === 0) {
    console.log('⚠️  No registered devices to ping');
    return {
      all: [],
      local: [],
      tailscale: [],
      stats: { total: 0, local: 0, tailscale: 0, online: 0 }
    };
  }
  
  // Ping all registered devices
  const promises = allDevices.map(async (device) => {
    try {
      const result = await pingDevice(device.ip);
      
      return {
        ...device,
        online: result.alive,
        latency: result.alive ? Math.round(result.time) : null,
        name: device.notes || null // User-assigned name
      };
    } catch (error) {
      return {
        ...device,
        online: false,
        latency: null,
        name: device.notes || null
      };
    }
  });
  
  const devices = await Promise.all(promises);
  
  // Separate by network type
  const localDevices = devices.filter(d => d.network !== 'tailscale');
  const tailscaleDevices = devices.filter(d => d.network === 'tailscale' || d.network === 'both');
  
  const onlineCount = devices.filter(d => d.online).length;
  console.log(`✅ Quick ping complete: ${onlineCount}/${devices.length} devices online`);
  
  return {
    all: devices,
    local: localDevices,
    tailscale: tailscaleDevices,
    stats: {
      total: devices.length,
      local: localDevices.length,
      tailscale: tailscaleDevices.length,
      online: onlineCount
    }
  };
}

// Unified network scan - scans both local and Tailscale networks (full discovery)
export async function scanUnifiedNetwork(subnet = '192.168.0.0/24') {
  console.log('🌐 Starting unified network scan (full discovery)...');
  
  const [localDevices, tailscaleDevices] = await Promise.all([
    scanLocalNetwork(subnet),
    scanTailscaleNetwork()
  ]);
  
  // Merge devices, avoiding duplicates based on IP or MAC
  const mergedDevices = [...localDevices];
  const existingIPs = new Set(localDevices.map(d => d.ip));
  const existingMACs = new Set(localDevices.map(d => d.mac).filter(m => m !== 'unknown'));
  
  for (const tsDevice of tailscaleDevices) {
    // Only add if not already in local network
    if (!existingIPs.has(tsDevice.ip) && !existingMACs.has(tsDevice.mac)) {
      mergedDevices.push(tsDevice);
    } else {
      // Update existing device with Tailscale info
      const existing = mergedDevices.find(d => 
        d.ip === tsDevice.ip || (d.mac !== 'unknown' && d.mac === tsDevice.mac)
      );
      if (existing) {
        existing.network = 'both'; // Device is on both networks
        existing.tailscale_hostname = tsDevice.hostname;
        existing.os = tsDevice.os;
      }
    }
  }
  
  console.log(`✅ Unified scan complete: ${localDevices.length} local, ${tailscaleDevices.length} Tailscale, ${mergedDevices.length} total`);
  
  return {
    all: mergedDevices,
    local: localDevices,
    tailscale: tailscaleDevices,
    stats: {
      total: mergedDevices.length,
      local: localDevices.length,
      tailscale: tailscaleDevices.length,
      online: mergedDevices.filter(d => d.online).length
    }
  };
}

// Assign a friendly name to a device
export function assignDeviceName(macOrId, name) {
  try {
    // Try to find by MAC first
    let device = deviceOps.getByMac(macOrId);
    
    // If not found, try by ID
    if (!device) {
      device = deviceOps.getById(parseInt(macOrId));
    }
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Update the notes field with the friendly name
    deviceOps.updateNotes(device.id, name);
    
    return {
      success: true,
      device: {
        ...device,
        notes: name
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Get device by name, MAC, or IP
export function findDevice(identifier) {
  const devices = deviceOps.getAll();
  
  const lowerIdentifier = identifier.toLowerCase();
  
  return devices.find(d => 
    d.mac?.toLowerCase() === lowerIdentifier ||
    d.ip === identifier ||
    d.hostname?.toLowerCase().includes(lowerIdentifier) ||
    d.notes?.toLowerCase().includes(lowerIdentifier)
  );
}

export { getTailscaleStatus };
