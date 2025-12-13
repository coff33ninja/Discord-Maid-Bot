import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { configOps } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const SALT_ROUNDS = 10;

// User roles
export const ROLES = {
  ADMIN: 'admin',      // Full access
  OPERATOR: 'operator', // Can execute commands, view data
  VIEWER: 'viewer'      // Read-only access
};

// Permission definitions
export const PERMISSIONS = {
  // Network operations
  SCAN_NETWORK: 'scan_network',
  WAKE_DEVICE: 'wake_device',
  
  // Speed tests
  RUN_SPEEDTEST: 'run_speedtest',
  VIEW_SPEEDTEST: 'view_speedtest',
  
  // Research
  RUN_RESEARCH: 'run_research',
  VIEW_RESEARCH: 'view_research',
  
  // Tasks
  CREATE_TASK: 'create_task',
  MODIFY_TASK: 'modify_task',
  DELETE_TASK: 'delete_task',
  VIEW_TASK: 'view_task',
  
  // Configuration
  MODIFY_CONFIG: 'modify_config',
  VIEW_CONFIG: 'view_config',
  
  // Users
  MANAGE_USERS: 'manage_users',
  
  // Dashboard
  ACCESS_DASHBOARD: 'access_dashboard',
  
  // Home Assistant
  CONTROL_LIGHTS: 'control_lights',
  CONTROL_SWITCHES: 'control_switches',
  CONTROL_CLIMATE: 'control_climate',
  TRIGGER_AUTOMATION: 'trigger_automation',
  ACTIVATE_SCENE: 'activate_scene',
  RUN_SCRIPT: 'run_script'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.OPERATOR]: [
    PERMISSIONS.SCAN_NETWORK,
    PERMISSIONS.WAKE_DEVICE,
    PERMISSIONS.RUN_SPEEDTEST,
    PERMISSIONS.VIEW_SPEEDTEST,
    PERMISSIONS.RUN_RESEARCH,
    PERMISSIONS.VIEW_RESEARCH,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.VIEW_CONFIG,
    PERMISSIONS.ACCESS_DASHBOARD,
    PERMISSIONS.CONTROL_LIGHTS,
    PERMISSIONS.CONTROL_SWITCHES,
    PERMISSIONS.CONTROL_CLIMATE
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_SPEEDTEST,
    PERMISSIONS.VIEW_RESEARCH,
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.VIEW_CONFIG,
    PERMISSIONS.ACCESS_DASHBOARD
  ]
};

// Initialize default admin user
export async function initializeAuth() {
  const adminExists = configOps.get('admin_initialized');
  
  if (!adminExists) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    
    configOps.set('user_admin', JSON.stringify({
      username: 'admin',
      password: hashedPassword,
      role: ROLES.ADMIN,
      created: new Date().toISOString()
    }));
    
    configOps.set('admin_initialized', 'true');
    console.log('⚠️  Default admin user created: admin / admin123');
    console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
  }
}

// Create user
export async function createUser(username, password, role = ROLES.VIEWER) {
  const existingUser = configOps.get(`user_${username}`);
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  
  configOps.set(`user_${username}`, JSON.stringify({
    username,
    password: hashedPassword,
    role,
    created: new Date().toISOString()
  }));
  
  return { username, role };
}

// Authenticate user
export async function authenticateUser(username, password) {
  const userJson = configOps.get(`user_${username}`);
  if (!userJson) {
    return null;
  }
  
  const user = JSON.parse(userJson);
  
  // Check if user is deleted
  if (user.deleted) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return null;
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return {
    username: user.username,
    role: user.role,
    token
  };
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Check if user has permission
export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

// Middleware for Express routes
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
}

// Middleware for specific permissions
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Get all users (admin only)
export function getAllUsers() {
  const allConfig = configOps.getAll();
  const users = [];
  
  for (const config of allConfig) {
    if (config.key.startsWith('user_')) {
      const user = JSON.parse(config.value);
      // Skip deleted users
      if (!user.deleted) {
        users.push({
          username: user.username,
          role: user.role,
          created: user.created
        });
      }
    }
  }
  
  return users;
}

// Update user role
export function updateUserRole(username, newRole) {
  const userJson = configOps.get(`user_${username}`);
  if (!userJson) {
    throw new Error('User not found');
  }
  
  const user = JSON.parse(userJson);
  user.role = newRole;
  
  configOps.set(`user_${username}`, JSON.stringify(user));
  return { username, role: newRole };
}

// Delete user
export function deleteUser(username) {
  if (username === 'admin') {
    throw new Error('Cannot delete admin user');
  }
  
  const userJson = configOps.get(`user_${username}`);
  if (!userJson) {
    throw new Error('User not found');
  }
  
  const user = JSON.parse(userJson);
  if (user.deleted) {
    throw new Error('User already deleted');
  }
  
  // Mark as deleted (we keep the record for audit purposes)
  configOps.set(`user_${username}`, JSON.stringify({ 
    ...user,
    deleted: true, 
    deletedAt: new Date().toISOString() 
  }));
  return true;
}

// Change password
export async function changePassword(username, oldPassword, newPassword) {
  const userJson = configOps.get(`user_${username}`);
  if (!userJson) {
    throw new Error('User not found');
  }
  
  const user = JSON.parse(userJson);
  const isValid = await bcrypt.compare(oldPassword, user.password);
  
  if (!isValid) {
    throw new Error('Invalid current password');
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.password = hashedPassword;
  
  configOps.set(`user_${username}`, JSON.stringify(user));
  return true;
}
