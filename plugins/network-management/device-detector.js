/**
 * Device Type Detector
 * 
 * Detects device types using:
 * 1. MAC vendor prefixes (fast, offline)
 * 2. nmap OS detection (fallback, more accurate)
 * 
 * @module plugins/network-management/device-detector
 */

import { createLogger } from '../../src/logging/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('device-detector');

/**
 * Device types
 */
export const DeviceType = {
  PC: 'pc',
  LAPTOP: 'laptop',
  PHONE: 'phone',
  TABLET: 'tablet',
  ROUTER: 'router',
  PRINTER: 'printer',
  SERVER: 'server',
  IOT: 'iot',
  TV: 'tv',
  GAMING: 'gaming',
  UNKNOWN: 'unknown'
};

/**
 * Common MAC vendor prefixes (first 3 bytes) mapped to device types
 */
const MAC_VENDORS = {
  // Apple - phones/tablets/laptops
  '00:03:93': { type: DeviceType.PHONE, vendor: 'Apple' },
  '3C:15:C2': { type: DeviceType.PHONE, vendor: 'Apple' },
  'A4:5E:60': { type: DeviceType.PHONE, vendor: 'Apple' },
  'F0:18:98': { type: DeviceType.PHONE, vendor: 'Apple' },
  
  // Samsung - phones
  'A8:F2:74': { type: DeviceType.PHONE, vendor: 'Samsung' },
  'BC:44:86': { type: DeviceType.PHONE, vendor: 'Samsung' },
  'F4:42:8F': { type: DeviceType.PHONE, vendor: 'Samsung' },

  // Intel/Realtek - PCs
  '00:E0:4C': { type: DeviceType.PC, vendor: 'Realtek' },
  '3C:97:0E': { type: DeviceType.PC, vendor: 'Intel' },
  '80:86:F2': { type: DeviceType.PC, vendor: 'Intel' },
  
  // Cisco/TP-Link - routers
  '00:00:0C': { type: DeviceType.ROUTER, vendor: 'Cisco' },
  '14:CC:20': { type: DeviceType.ROUTER, vendor: 'TP-Link' },
  '50:3E:AA': { type: DeviceType.ROUTER, vendor: 'TP-Link' },
  
  // HP - printers
  '00:1E:0B': { type: DeviceType.PRINTER, vendor: 'HP' },
  '3C:4A:92': { type: DeviceType.PRINTER, vendor: 'HP' },
  
  // Raspberry Pi - IoT
  'B8:27:EB': { type: DeviceType.IOT, vendor: 'Raspberry Pi' },
  'DC:A6:32': { type: DeviceType.IOT, vendor: 'Raspberry Pi' },
  'E4:5F:01': { type: DeviceType.IOT, vendor: 'Raspberry Pi' },
  
  // Amazon - IoT (Echo, Fire)
  '00:FC:8B': { type: DeviceType.IOT, vendor: 'Amazon' },
  '44:65:0D': { type: DeviceType.IOT, vendor: 'Amazon' },
  
  // Google - IoT (Chromecast, Nest)
  '54:60:09': { type: DeviceType.IOT, vendor: 'Google' },
  'F4:F5:D8': { type: DeviceType.IOT, vendor: 'Google' },
  
  // Microsoft - Gaming (Xbox)
  '7C:ED:8D': { type: DeviceType.GAMING, vendor: 'Microsoft' },
  '28:18:78': { type: DeviceType.GAMING, vendor: 'Microsoft' },
  
  // Sony - Gaming (PlayStation)
  '00:D9:D1': { type: DeviceType.GAMING, vendor: 'Sony' },
  'F8:46:1C': { type: DeviceType.GAMING, vendor: 'Sony' },
  
  // Nintendo - Gaming
  '00:17:AB': { type: DeviceType.GAMING, vendor: 'Nintendo' },
  '7C:BB:8A': { type: DeviceType.GAMING, vendor: 'Nintendo' },
  
  // LG - TV
  '00:1E:75': { type: DeviceType.TV, vendor: 'LG' },
  'C4:36:6C': { type: DeviceType.TV, vendor: 'LG' },
  
  // Samsung TV
  '8C:79:F5': { type: DeviceType.TV, vendor: 'Samsung' }
};

/**
 * Port signatures for device type detection
 */
const PORT_SIGNATURES = {
  22: DeviceType.SERVER,     // SSH
  80: null,                  // HTTP (too common)
  443: null,                 // HTTPS (too common)
  445: DeviceType.PC,        // SMB
  631: DeviceType.PRINTER,   // IPP
  3389: DeviceType.PC,       // RDP
  5000: DeviceType.SERVER,   // Various services
  5900: DeviceType.PC,       // VNC
  8080: DeviceType.SERVER,   // HTTP Alt
  9100: DeviceType.PRINTER,  // RAW printing
  62078: DeviceType.PHONE    // iPhone sync
};


/**
 * Normalize MAC address to uppercase with colons
 * @param {string} mac - MAC address in any format
 * @returns {string} Normalized MAC (XX:XX:XX:XX:XX:XX)
 */
function normalizeMac(mac) {
  if (!mac) return null;
  const clean = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (clean.length !== 12) return null;
  return clean.match(/.{2}/g).join(':');
}

/**
 * Get MAC prefix (first 3 bytes)
 * @param {string} mac - MAC address
 * @returns {string} MAC prefix (XX:XX:XX)
 */
function getMacPrefix(mac) {
  const normalized = normalizeMac(mac);
  if (!normalized) return null;
  return normalized.substring(0, 8);
}

/**
 * Detect device type from MAC vendor prefix
 * @param {string} mac - MAC address
 * @returns {Object|null} Detection result or null
 */
export function detectFromMac(mac) {
  const prefix = getMacPrefix(mac);
  if (!prefix) return null;
  
  const vendor = MAC_VENDORS[prefix];
  if (vendor) {
    return {
      type: vendor.type,
      vendor: vendor.vendor,
      confidence: 0.7,
      method: 'mac'
    };
  }
  
  return null;
}

/**
 * Detect device type from open ports
 * @param {number[]} ports - Array of open port numbers
 * @returns {Object|null} Detection result or null
 */
export function detectFromPorts(ports) {
  if (!ports || !Array.isArray(ports) || ports.length === 0) return null;
  
  const typeCounts = {};
  
  for (const port of ports) {
    const type = PORT_SIGNATURES[port];
    if (type) {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
  }
  
  // Find most common type
  let bestType = null;
  let bestCount = 0;
  
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > bestCount) {
      bestType = type;
      bestCount = count;
    }
  }
  
  if (bestType) {
    return {
      type: bestType,
      confidence: Math.min(0.6 + (bestCount * 0.1), 0.9),
      method: 'port'
    };
  }
  
  return null;
}


/**
 * Use nmap for OS detection (requires nmap installed)
 * @param {string} ip - IP address to scan
 * @returns {Promise<Object|null>} Detection result or null
 */
export async function detectWithNmap(ip) {
  if (!ip) return null;
  
  try {
    // Quick OS detection scan (-O requires root, use -sV for service detection)
    // Using -sn for ping scan and -O for OS detection
    const { stdout } = await execAsync(`nmap -sV -O --osscan-guess -T4 ${ip}`, {
      timeout: 30000
    });
    
    const result = parseNmapOutput(stdout);
    if (result) {
      return {
        ...result,
        method: 'nmap',
        confidence: result.confidence || 0.8
      };
    }
  } catch (error) {
    // nmap might not be installed or require sudo
    logger.debug(`nmap detection failed for ${ip}: ${error.message}`);
    
    // Try simpler port scan as fallback
    try {
      const { stdout } = await execAsync(`nmap -sT -T4 -p 22,80,443,445,631,3389,5900,9100 ${ip}`, {
        timeout: 15000
      });
      
      const ports = parseNmapPorts(stdout);
      if (ports.length > 0) {
        return detectFromPorts(ports);
      }
    } catch (e) {
      logger.debug(`nmap port scan failed for ${ip}: ${e.message}`);
    }
  }
  
  return null;
}

/**
 * Parse nmap output for OS detection
 * @param {string} output - nmap stdout
 * @returns {Object|null} Parsed result
 */
function parseNmapOutput(output) {
  if (!output) return null;
  
  const lines = output.toLowerCase();
  
  // OS detection patterns
  const osPatterns = [
    { pattern: /windows\s*(10|11|server)/i, type: DeviceType.PC, os: 'Windows' },
    { pattern: /windows\s*xp/i, type: DeviceType.PC, os: 'Windows XP' },
    { pattern: /linux.*raspberry/i, type: DeviceType.IOT, os: 'Raspberry Pi' },
    { pattern: /linux.*ubuntu|debian|centos|fedora/i, type: DeviceType.SERVER, os: 'Linux' },
    { pattern: /linux/i, type: DeviceType.SERVER, os: 'Linux' },
    { pattern: /android/i, type: DeviceType.PHONE, os: 'Android' },
    { pattern: /ios|iphone|ipad/i, type: DeviceType.PHONE, os: 'iOS' },
    { pattern: /mac\s*os|darwin/i, type: DeviceType.LAPTOP, os: 'macOS' },
    { pattern: /freebsd|openbsd/i, type: DeviceType.SERVER, os: 'BSD' },
    { pattern: /printer|jetdirect/i, type: DeviceType.PRINTER, os: 'Printer' },
    { pattern: /router|cisco|mikrotik/i, type: DeviceType.ROUTER, os: 'Router' },
    { pattern: /playstation/i, type: DeviceType.GAMING, os: 'PlayStation' },
    { pattern: /xbox/i, type: DeviceType.GAMING, os: 'Xbox' },
    { pattern: /nintendo/i, type: DeviceType.GAMING, os: 'Nintendo' },
    { pattern: /smart\s*tv|webos|tizen/i, type: DeviceType.TV, os: 'Smart TV' }
  ];
  
  for (const { pattern, type, os } of osPatterns) {
    if (pattern.test(lines)) {
      // Extract confidence from nmap output if available
      const confMatch = output.match(/(\d+)%/);
      const confidence = confMatch ? parseInt(confMatch[1]) / 100 : 0.8;
      
      return { type, os, confidence };
    }
  }
  
  return null;
}

/**
 * Parse nmap output for open ports
 * @param {string} output - nmap stdout
 * @returns {number[]} Array of open port numbers
 */
function parseNmapPorts(output) {
  if (!output) return [];
  
  const ports = [];
  const portRegex = /(\d+)\/tcp\s+open/g;
  let match;
  
  while ((match = portRegex.exec(output)) !== null) {
    ports.push(parseInt(match[1]));
  }
  
  return ports;
}


/**
 * Detect device type using all available methods
 * 
 * Order of detection:
 * 1. MAC vendor lookup (fast)
 * 2. nmap OS detection (fallback, more accurate)
 * 
 * @param {Object} device - Device object with ip and mac
 * @param {boolean} useNmap - Whether to use nmap as fallback (default: true)
 * @returns {Promise<Object>} Detection result
 */
export async function detectDeviceType(device, useNmap = true) {
  const { ip, mac, hostname } = device;
  
  let result = {
    type: DeviceType.UNKNOWN,
    confidence: 0,
    method: 'none',
    vendor: null,
    os: null
  };
  
  // Try MAC vendor detection first (fast)
  if (mac) {
    const macResult = detectFromMac(mac);
    if (macResult && macResult.confidence > result.confidence) {
      result = { ...result, ...macResult };
    }
  }
  
  // If MAC detection gave good result, return it
  if (result.confidence >= 0.7) {
    logger.debug(`Device ${ip} detected as ${result.type} via MAC (${result.vendor})`);
    return result;
  }
  
  // Try hostname-based detection
  if (hostname) {
    const hostLower = hostname.toLowerCase();
    
    if (hostLower.includes('iphone') || hostLower.includes('ipad')) {
      result = { type: DeviceType.PHONE, confidence: 0.8, method: 'hostname', vendor: 'Apple' };
    } else if (hostLower.includes('android') || hostLower.includes('galaxy')) {
      result = { type: DeviceType.PHONE, confidence: 0.8, method: 'hostname', vendor: 'Android' };
    } else if (hostLower.includes('macbook') || hostLower.includes('imac')) {
      result = { type: DeviceType.LAPTOP, confidence: 0.8, method: 'hostname', vendor: 'Apple' };
    } else if (hostLower.includes('desktop') || hostLower.includes('-pc')) {
      result = { type: DeviceType.PC, confidence: 0.7, method: 'hostname' };
    } else if (hostLower.includes('laptop')) {
      result = { type: DeviceType.LAPTOP, confidence: 0.7, method: 'hostname' };
    } else if (hostLower.includes('printer') || hostLower.includes('hp') || hostLower.includes('epson')) {
      result = { type: DeviceType.PRINTER, confidence: 0.7, method: 'hostname' };
    } else if (hostLower.includes('router') || hostLower.includes('gateway')) {
      result = { type: DeviceType.ROUTER, confidence: 0.7, method: 'hostname' };
    } else if (hostLower.includes('playstation') || hostLower.includes('ps4') || hostLower.includes('ps5')) {
      result = { type: DeviceType.GAMING, confidence: 0.8, method: 'hostname', vendor: 'Sony' };
    } else if (hostLower.includes('xbox')) {
      result = { type: DeviceType.GAMING, confidence: 0.8, method: 'hostname', vendor: 'Microsoft' };
    } else if (hostLower.includes('switch') && hostLower.includes('nintendo')) {
      result = { type: DeviceType.GAMING, confidence: 0.8, method: 'hostname', vendor: 'Nintendo' };
    } else if (hostLower.includes('tv') || hostLower.includes('roku') || hostLower.includes('firetv')) {
      result = { type: DeviceType.TV, confidence: 0.7, method: 'hostname' };
    } else if (hostLower.includes('echo') || hostLower.includes('alexa') || hostLower.includes('nest')) {
      result = { type: DeviceType.IOT, confidence: 0.7, method: 'hostname' };
    }
    
    if (result.confidence >= 0.7) {
      logger.debug(`Device ${ip} detected as ${result.type} via hostname`);
      return result;
    }
  }
  
  // Use nmap as fallback if enabled and we don't have a good result
  if (useNmap && ip && result.confidence < 0.6) {
    const nmapResult = await detectWithNmap(ip);
    if (nmapResult && nmapResult.confidence > result.confidence) {
      result = { ...result, ...nmapResult };
      logger.debug(`Device ${ip} detected as ${result.type} via nmap`);
    }
  }
  
  // Default to unknown if nothing worked
  if (result.type === DeviceType.UNKNOWN) {
    logger.debug(`Device ${ip} type unknown`);
  }
  
  return result;
}

/**
 * Get emoji for device type
 * @param {string} type - Device type
 * @returns {string} Emoji
 */
export function getDeviceEmoji(type) {
  const emojis = {
    [DeviceType.PC]: '🖥️',
    [DeviceType.LAPTOP]: '💻',
    [DeviceType.PHONE]: '📱',
    [DeviceType.TABLET]: '📱',
    [DeviceType.ROUTER]: '📡',
    [DeviceType.PRINTER]: '🖨️',
    [DeviceType.SERVER]: '🖧',
    [DeviceType.IOT]: '🔌',
    [DeviceType.TV]: '📺',
    [DeviceType.GAMING]: '🎮',
    [DeviceType.UNKNOWN]: '❓'
  };
  
  return emojis[type] || '📱';
}

export default {
  DeviceType,
  detectDeviceType,
  detectFromMac,
  detectFromPorts,
  detectWithNmap,
  getDeviceEmoji
};
