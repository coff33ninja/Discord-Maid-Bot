// Connect to Socket.io
const socket = io('http://localhost:3000');

let deviceChart, speedChart;

// Store auth token
let authToken = null;

// Initialize dashboard
async function init() {
  // Check if logged in
  authToken = localStorage.getItem('authToken');
  if (!authToken) {
    showLogin();
    return;
  }
  
  // Load data (devices will load from cache/database, not trigger new scan)
  await loadStats();
  await loadDevices(); // Uses existing data from startup scan
  await loadTasks();
  await loadResearch();
  await loadSpeedHistory();
  await loadHomeAssistant();
  await loadPlugins();
  await loadSettings();
  initCharts();
  
  // Real-time updates
  socket.on('device-update', handleDeviceUpdate);
  socket.on('speedtest-complete', handleSpeedTestUpdate);
  socket.on('task-update', loadTasks);
}

// Login functionality
function showLogin() {
  const loginHtml = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; width: 100%;">
        <h2 style="text-align: center; color: #667eea; margin-bottom: 30px;">🌸 Maid Bot Dashboard</h2>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: #666;">Username</label>
          <input type="text" id="loginUsername" placeholder="admin" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        </div>
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 5px; color: #666;">Password</label>
          <input type="password" id="loginPassword" placeholder="admin123" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        </div>
        <button onclick="login()" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">Login</button>
        <div id="loginError" style="color: red; margin-top: 10px; text-align: center;"></div>
      </div>
    </div>
  `;
  document.body.innerHTML = loginHtml;
}

async function login() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      location.reload();
    } else {
      document.getElementById('loginError').textContent = 'Invalid credentials';
    }
  } catch (error) {
    document.getElementById('loginError').textContent = 'Login failed';
  }
}

function logout() {
  localStorage.removeItem('authToken');
  location.reload();
}

// Helper function for authenticated requests
async function authFetch(url, options = {}) {
  if (!options.headers) {
    options.headers = {};
  }
  options.headers['Authorization'] = `Bearer ${authToken}`;
  return fetch(url, options);
}

// Load overall stats
async function loadStats() {
  try {
    const response = await authFetch('/api/stats');
    const stats = await response.json();
    
    document.getElementById('totalDevices').textContent = stats.devices.total;
    document.getElementById('onlineDevices').textContent = stats.devices.online;
    document.getElementById('activeTasks').textContent = stats.tasks.enabled;
    document.getElementById('totalTasks').textContent = stats.tasks.total;
    
    if (stats.speedTest.lastTest) {
      document.getElementById('downloadSpeed').textContent = parseFloat(stats.speedTest.lastTest.download).toFixed(1);
      document.getElementById('uploadSpeed').textContent = parseFloat(stats.speedTest.lastTest.upload).toFixed(1);
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}



// Load Home Assistant
async function loadHomeAssistant() {
  try {
    const statusResponse = await authFetch('/api/config/homeassistant/status');
    const statusData = await statusResponse.json();
    
    const statusDiv = document.getElementById('haStatus');
    if (statusData.connected) {
      statusDiv.innerHTML = `<p style="color: #10b981;">✅ Home Assistant Connected</p>`;
    } else {
      statusDiv.innerHTML = `<p style="color: #ef4444;">⚠️ Home Assistant not configured</p>`;
      return;
    }
    
    // Load lights
    const lightsResponse = await authFetch('/api/homeassistant/lights');
    const lights = await lightsResponse.json();
    const lightsList = document.getElementById('lightsList');
    lightsList.innerHTML = '';
    lights.slice(0, 10).forEach(light => {
      const item = document.createElement('div');
      item.className = 'device-item';
      const state = light.state === 'on' ? '🟢 On' : '⚪ Off';
      item.innerHTML = `
        <div class="device-info">
          <div class="device-name">${light.attributes?.friendly_name || light.entity_id}</div>
          <div class="device-details">${light.entity_id} | ${state}</div>
        </div>
      `;
      lightsList.appendChild(item);
    });
    
    // Load switches
    const switchesResponse = await authFetch('/api/homeassistant/switches');
    const switches = await switchesResponse.json();
    const switchesList = document.getElementById('switchesList');
    switchesList.innerHTML = '';
    switches.slice(0, 10).forEach(sw => {
      const item = document.createElement('div');
      item.className = 'device-item';
      const state = sw.state === 'on' ? '🟢 On' : '⚪ Off';
      item.innerHTML = `
        <div class="device-info">
          <div class="device-name">${sw.attributes?.friendly_name || sw.entity_id}</div>
          <div class="device-details">${sw.entity_id} | ${state}</div>
        </div>
      `;
      switchesList.appendChild(item);
    });
    
    // Load sensors
    const sensorsResponse = await authFetch('/api/homeassistant/sensors');
    const sensors = await sensorsResponse.json();
    const sensorsList = document.getElementById('sensorsList');
    sensorsList.innerHTML = '';
    sensors.slice(0, 10).forEach(sensor => {
      const item = document.createElement('div');
      item.className = 'device-item';
      const unit = sensor.attributes?.unit_of_measurement || '';
      item.innerHTML = `
        <div class="device-info">
          <div class="device-name">${sensor.attributes?.friendly_name || sensor.entity_id}</div>
          <div class="device-details">${sensor.state} ${unit}</div>
        </div>
      `;
      sensorsList.appendChild(item);
    });
    
    // Load ESP devices
    const espResponse = await authFetch('/api/homeassistant/esp-devices');
    const espDevices = await espResponse.json();
    const espList = document.getElementById('espList');
    espList.innerHTML = '';
    espDevices.forEach(device => {
      const item = document.createElement('div');
      item.className = 'device-item';
      item.innerHTML = `
        <div class="device-info">
          <div class="device-name">${device.name}</div>
          <div class="device-details">${device.entities.length} entities</div>
        </div>
      `;
      espList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load Home Assistant:', error);
  }
}

// Load plugins
async function loadPlugins() {
  try {
    const statsResponse = await authFetch('/api/plugins/stats');
    const stats = await statsResponse.json();
    
    document.getElementById('pluginStats').innerHTML = `
      <p>Total: ${stats.total} | Enabled: ${stats.enabled} | Disabled: ${stats.disabled}</p>
    `;
    
    const response = await authFetch('/api/plugins');
    const plugins = await response.json();
    
    const list = document.getElementById('pluginsList');
    list.innerHTML = '';
    
    plugins.forEach(plugin => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = `
        <div class="task-info">
          <div class="task-name">${plugin.name} v${plugin.version}</div>
          <div class="task-schedule">${plugin.description}</div>
        </div>
        <span class="${plugin.enabled ? 'task-enabled' : 'task-disabled'}">
          ${plugin.enabled ? '✓ Enabled' : '✗ Disabled'}
        </span>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load plugins:', error);
  }
}

// Load settings
async function loadSettings() {
  try {
    // Load SMB status
    const smbResponse = await authFetch('/api/config/smb');
    const smbConfig = await smbResponse.json();
    
    const smbStatusDiv = document.getElementById('smbStatus');
    if (smbConfig.configured) {
      smbStatusDiv.innerHTML = `
        <p style="color: #10b981;">✅ SMB Configured</p>
        <p style="font-size: 0.9em; color: #666;">Host: ${smbConfig.host}</p>
        <p style="font-size: 0.9em; color: #666;">Share: ${smbConfig.share}</p>
        <p style="font-size: 0.9em; color: #666;">Status: ${smbConfig.enabled ? 'Enabled' : 'Disabled'}</p>
        <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
          ℹ️ To change SMB settings, edit your .env file and restart the bot.
        </p>
      `;
    } else {
      smbStatusDiv.innerHTML = `
        <p style="color: #ef4444;">⚠️ SMB Not Configured</p>
        <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
          ℹ️ Configure SMB in your .env file: SMB_HOST, SMB_USERNAME, SMB_PASSWORD, SMB_SHARE
        </p>
      `;
    }
    
    // Load Home Assistant status
    const haResponse = await authFetch('/api/config/homeassistant/status');
    const haStatus = await haResponse.json();
    
    const haStatusDiv = document.getElementById('haConfigStatus');
    if (haStatus.connected) {
      haStatusDiv.innerHTML = `
        <p style="color: #10b981;">✅ Home Assistant Connected</p>
        <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
          ℹ️ To change Home Assistant settings, edit your .env file (HA_URL, HA_TOKEN) and restart the bot.
        </p>
      `;
    } else {
      haStatusDiv.innerHTML = `
        <p style="color: #ef4444;">⚠️ Home Assistant Not Connected</p>
        <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
          ℹ️ Configure Home Assistant in your .env file: HA_URL and HA_TOKEN
        </p>
      `;
    }
    
    // Load users
    await loadUsers();
    await loadDiscordUsers();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Load users list
async function loadUsers() {
  try {
    const usersResponse = await authFetch('/api/users');
    const users = await usersResponse.json();
    
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    if (users.length === 0) {
      usersList.innerHTML = '<p style="color: #999;">No users found</p>';
      return;
    }
    
    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'task-item';
      
      // Role badge color
      let roleColor = '#9ca3af';
      if (user.role === 'admin') roleColor = '#ef4444';
      else if (user.role === 'operator') roleColor = '#f59e0b';
      else if (user.role === 'viewer') roleColor = '#10b981';
      
      item.innerHTML = `
        <div class="task-info">
          <div class="task-name">${user.username}</div>
          <div class="task-schedule">
            <span style="background: ${roleColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">
              ${user.role.toUpperCase()}
            </span>
            <span style="margin-left: 10px; color: #999;">Created: ${new Date(user.created).toLocaleDateString()}</span>
          </div>
        </div>
        <div style="display: flex; gap: 5px;">
          ${user.username !== 'admin' ? `
            <select onchange="changeUserRole('${user.username}', this.value)" style="padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="">Change Role...</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onclick="deleteUser('${user.username}')" style="background: #ef4444; padding: 5px 10px; font-size: 0.85em;">
              🗑️ Delete
            </button>
          ` : '<span style="color: #999; font-size: 0.85em;">Protected</span>'}
        </div>
      `;
      usersList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load users:', error);
    document.getElementById('usersList').innerHTML = '<p style="color: #ef4444;">Failed to load users</p>';
  }
}

// Show add user form
function showAddUserForm() {
  const modal = document.getElementById('addUserModal');
  modal.style.display = 'flex';
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('newUserRole').value = 'viewer';
}

// Hide add user form
function hideAddUserForm() {
  document.getElementById('addUserModal').style.display = 'none';
}

// Add new user
async function addUser() {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newUserRole').value;
  
  if (!username || !password) {
    alert('Please enter both username and password');
    return;
  }
  
  if (username.length < 3) {
    alert('Username must be at least 3 characters');
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    
    if (response.ok) {
      alert(`✅ User "${username}" created successfully!`);
      hideAddUserForm();
      await loadUsers();
    } else {
      const error = await response.json();
      alert(`❌ Failed to create user: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Change user role
async function changeUserRole(username, newRole) {
  if (!newRole) return;
  
  if (!confirm(`Change ${username}'s role to ${newRole}?`)) {
    await loadUsers(); // Reset the dropdown
    return;
  }
  
  try {
    const response = await authFetch(`/api/users/${username}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    
    if (response.ok) {
      alert(`✅ ${username}'s role changed to ${newRole}`);
      await loadUsers();
    } else {
      const error = await response.json();
      alert(`❌ Failed to change role: ${error.error}`);
      await loadUsers();
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
    await loadUsers();
  }
}

// Delete user
async function deleteUser(username) {
  if (!confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await authFetch(`/api/users/${username}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert(`✅ User "${username}" deleted successfully`);
      await loadUsers();
    } else {
      const error = await response.json();
      alert(`❌ Failed to delete user: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Show change password form
function showChangePasswordForm() {
  const modal = document.getElementById('changePasswordModal');
  modal.style.display = 'flex';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPasswordChange').value = '';
  document.getElementById('confirmPassword').value = '';
}

// Hide change password form
function hideChangePasswordForm() {
  document.getElementById('changePasswordModal').style.display = 'none';
}

// Change password
async function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPasswordChange').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Please fill in all fields');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('New password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await authFetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: currentPassword, newPassword })
    });
    
    if (response.ok) {
      alert('✅ Password changed successfully!');
      hideChangePasswordForm();
    } else {
      const error = await response.json();
      alert(`❌ Failed to change password: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// ===== Discord User Management =====

// Load Discord users list
async function loadDiscordUsers() {
  try {
    const response = await authFetch('/api/discord-users');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Server returned non-JSON response');
    }
    
    const users = await response.json();
    
    const usersList = document.getElementById('discordUsersList');
    usersList.innerHTML = '';
    
    if (users.length === 0) {
      usersList.innerHTML = '<p style="color: #999;">No Discord users configured yet. Add users to grant them bot permissions.</p>';
      return;
    }
    
    users.forEach(user => {
      const item = document.createElement('div');
      item.className = 'task-item';
      
      // Role badge color
      let roleColor = '#9ca3af';
      if (user.role === 'admin') roleColor = '#ef4444';
      else if (user.role === 'operator') roleColor = '#f59e0b';
      else if (user.role === 'viewer') roleColor = '#10b981';
      
      item.innerHTML = `
        <div class="task-info">
          <div class="task-name">🎮 ${user.username}</div>
          <div class="task-schedule">
            <span style="background: ${roleColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">
              ${user.role.toUpperCase()}
            </span>
            <span style="margin-left: 10px; color: #999; font-size: 0.85em;">ID: ${user.userId}</span>
            <span style="margin-left: 10px; color: #999; font-size: 0.85em;">Updated: ${new Date(user.updated).toLocaleDateString()}</span>
          </div>
        </div>
        <div style="display: flex; gap: 5px;">
          <select onchange="changeDiscordUserRole('${user.userId}', this.value)" style="padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">Change Role...</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onclick="deleteDiscordUser('${user.userId}', '${user.username}')" style="background: #ef4444; padding: 5px 10px; font-size: 0.85em;">
            🗑️ Delete
          </button>
        </div>
      `;
      usersList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load Discord users:', error);
    document.getElementById('discordUsersList').innerHTML = '<p style="color: #ef4444;">Failed to load Discord users</p>';
  }
}

// Show add Discord user form
function showAddDiscordUserForm() {
  const modal = document.getElementById('addDiscordUserModal');
  modal.style.display = 'flex';
  document.getElementById('newDiscordUserId').value = '';
  document.getElementById('newDiscordUsername').value = '';
  document.getElementById('newDiscordUserRole').value = 'viewer';
}

// Hide add Discord user form
function hideAddDiscordUserForm() {
  document.getElementById('addDiscordUserModal').style.display = 'none';
}

// Add new Discord user
async function addDiscordUser() {
  const userId = document.getElementById('newDiscordUserId').value.trim();
  const username = document.getElementById('newDiscordUsername').value.trim();
  const role = document.getElementById('newDiscordUserRole').value;
  
  if (!userId || !username) {
    alert('Please enter both User ID and a name for reference');
    return;
  }
  
  // Validate Discord User ID (should be numeric and 17-19 digits)
  if (!/^\d{17,19}$/.test(userId)) {
    alert('Invalid Discord User ID. It should be 17-19 digits.\n\nTo get a User ID:\n1. Enable Developer Mode in Discord Settings → Advanced\n2. Right-click the user\n3. Click "Copy User ID"');
    return;
  }
  
  // Username field accepts any format - it's just a label
  // Examples: dragohn, _dragohn_, @username, Display Name, username#1234
  
  try {
    const response = await authFetch('/api/discord-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username, role })
    });
    
    if (response.ok) {
      alert(`✅ Discord user "${username}" added successfully!\n\nThey now have ${role} permissions for bot commands.`);
      hideAddDiscordUserForm();
      await loadDiscordUsers();
    } else {
      const error = await response.json();
      alert(`❌ Failed to add Discord user: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Change Discord user role
async function changeDiscordUserRole(userId, newRole) {
  if (!newRole) return;
  
  if (!confirm(`Change this Discord user's role to ${newRole}?`)) {
    await loadDiscordUsers(); // Reset the dropdown
    return;
  }
  
  try {
    const response = await authFetch(`/api/discord-users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    
    if (response.ok) {
      alert(`✅ Discord user's role changed to ${newRole}`);
      await loadDiscordUsers();
    } else {
      const error = await response.json();
      alert(`❌ Failed to change role: ${error.error}`);
      await loadDiscordUsers();
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
    await loadDiscordUsers();
  }
}

// Delete Discord user
async function deleteDiscordUser(userId, username) {
  if (!confirm(`Remove Discord user "${username}" from the permission system?\n\nThey will lose all bot command permissions.`)) {
    return;
  }
  
  try {
    const response = await authFetch(`/api/discord-users/${userId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert(`✅ Discord user "${username}" removed successfully`);
      await loadDiscordUsers();
    } else {
      const error = await response.json();
      alert(`❌ Failed to remove Discord user: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Store unified network data
let unifiedNetworkData = null;
let currentNetworkFilter = 'all';

// Load devices using unified network scan
async function loadDevices() {
  try {
    const response = await authFetch('/api/network/unified');
    unifiedNetworkData = await response.json();
    
    // Update stats
    document.getElementById('networkTotal').textContent = unifiedNetworkData.stats.total;
    document.getElementById('networkLocal').textContent = unifiedNetworkData.stats.local;
    document.getElementById('networkTailscale').textContent = unifiedNetworkData.stats.tailscale;
    
    // Display devices based on current filter
    displayDevices(currentNetworkFilter);
    
    // Update chart
    updateDeviceChart(unifiedNetworkData.all);
  } catch (error) {
    console.error('Failed to load devices:', error);
    document.getElementById('deviceList').innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">Failed to load devices</p>';
  }
}

// Display devices based on filter
function displayDevices(filter) {
  if (!unifiedNetworkData) return;
  
  let devices = [];
  if (filter === 'all') {
    devices = unifiedNetworkData.all;
  } else if (filter === 'local') {
    devices = unifiedNetworkData.local;
  } else if (filter === 'tailscale') {
    devices = unifiedNetworkData.tailscale;
  }
  
  const deviceList = document.getElementById('deviceList');
  deviceList.innerHTML = '';
  
  if (devices.length === 0) {
    deviceList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No devices found</p>';
    return;
  }
  
  devices.forEach(device => {
    const item = document.createElement('div');
    item.className = 'device-item';
    
    // Determine display name
    const displayName = device.name || device.hostname || device.ip;
    
    // Network badge
    let networkBadge = '';
    if (device.network === 'both') {
      networkBadge = '<span style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">🌐 VPN</span>';
    } else if (device.network === 'tailscale') {
      networkBadge = '<span style="background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">🌐 Tailscale</span>';
    }
    
    // Build details
    let details = `IP: ${device.ip}`;
    if (device.mac && device.mac !== 'N/A (VPN)') {
      details += ` | MAC: ${device.mac}`;
    }
    if (device.latency) {
      details += ` | ${device.latency}ms`;
    }
    if (device.os) {
      details += ` | ${device.os}`;
    }
    
    item.innerHTML = `
      <div class="device-info">
        <div class="device-name">
          <span class="status-dot ${device.online ? 'status-online' : 'status-offline'}"></span>
          ${device.name ? `<strong>${device.name}</strong>` : displayName}
          ${networkBadge}
        </div>
        <div class="device-details">${details}</div>
        ${device.name && device.hostname ? `<div class="device-details" style="color: #999;">Hostname: ${device.hostname}</div>` : ''}
      </div>
      <div style="display: flex; gap: 5px;">
        <button onclick="editDeviceName('${device.mac}', '${(device.name || '').replace(/'/g, "\\'")}')" 
                style="background: #f59e0b; padding: 8px 12px; font-size: 0.85em;">
          🏷️
        </button>
        ${device.mac !== 'N/A (VPN)' ? `
          <button onclick="wakeDevice('${device.mac}', '${displayName.replace(/'/g, "\\'")}')" 
                  style="background: #10b981; padding: 8px 12px; font-size: 0.85em;"
                  ${device.online ? 'disabled title="Device is already online"' : ''}>
            ⚡
          </button>
        ` : ''}
      </div>
    `;
    deviceList.appendChild(item);
  });
}

// Switch network tab
function switchNetworkTab(filter) {
  currentNetworkFilter = filter;
  
  // Update tab styling
  document.querySelectorAll('.network-tab').forEach(tab => {
    tab.style.borderBottomColor = 'transparent';
    tab.style.color = '#666';
    tab.style.fontWeight = 'normal';
  });
  event.target.style.borderBottomColor = '#667eea';
  event.target.style.color = '#667eea';
  event.target.style.fontWeight = 'bold';
  
  // Display filtered devices
  displayDevices(filter);
}

// Wake device via WOL
async function wakeDevice(mac, deviceName) {
  if (!confirm(`Send Wake-on-LAN packet to ${deviceName}?`)) {
    return;
  }
  
  try {
    // Find device by MAC
    const response = await authFetch('/api/devices');
    const devices = await response.json();
    const device = devices.find(d => d.mac === mac);
    
    if (!device) {
      alert('❌ Device not found');
      return;
    }
    
    const wakeResponse = await authFetch(`/api/devices/${device.id}/wake`, {
      method: 'POST'
    });
    
    const result = await wakeResponse.json();
    
    if (wakeResponse.ok) {
      alert(`✅ ${result.message}\n\nThe device should wake up shortly.`);
      await loadDevices();
    } else {
      alert(`❌ Failed to wake device: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Show device naming modal
function showNameDeviceModal() {
  const modal = document.getElementById('nameDeviceModal');
  modal.style.display = 'flex';
  
  // Populate device dropdown
  if (unifiedNetworkData) {
    const select = document.getElementById('deviceToName');
    select.innerHTML = '<option value="">Select a device...</option>';
    
    unifiedNetworkData.all.forEach(device => {
      const displayName = device.name || device.hostname || device.ip;
      const status = device.online ? '🟢' : '🔴';
      const option = document.createElement('option');
      option.value = device.mac;
      option.textContent = `${status} ${displayName} (${device.ip})`;
      select.appendChild(option);
    });
  }
  
  document.getElementById('deviceFriendlyName').value = '';
}

// Hide device naming modal
function hideNameDeviceModal() {
  document.getElementById('nameDeviceModal').style.display = 'none';
}

// Edit device name (quick edit)
function editDeviceName(mac, currentName) {
  const newName = prompt('Enter friendly name for this device:', currentName);
  if (newName === null) return; // Cancelled
  
  assignDeviceNameByMac(mac, newName.trim());
}

// Assign device name from modal
async function assignDeviceName() {
  const mac = document.getElementById('deviceToName').value;
  const name = document.getElementById('deviceFriendlyName').value.trim();
  
  if (!mac) {
    alert('Please select a device');
    return;
  }
  
  if (!name) {
    alert('Please enter a friendly name');
    return;
  }
  
  await assignDeviceNameByMac(mac, name);
  hideNameDeviceModal();
}

// Assign device name by MAC address
async function assignDeviceNameByMac(mac, name) {
  try {
    // Find device by MAC
    const response = await authFetch('/api/devices');
    const devices = await response.json();
    const device = devices.find(d => d.mac === mac);
    
    if (!device) {
      alert('❌ Device not found');
      return;
    }
    
    // Update device notes (name)
    const updateResponse = await authFetch(`/api/devices/${device.id}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: name })
    });
    
    if (updateResponse.ok) {
      alert(`✅ Device named "${name}" successfully!`);
      await loadDevices();
    } else {
      const error = await updateResponse.json();
      alert(`❌ Failed to name device: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Load scheduled tasks
async function loadTasks() {
  try {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
      taskList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No scheduled tasks</p>';
      return;
    }
    
    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.innerHTML = `
        <div class="task-info">
          <div class="task-name">${task.name}</div>
          <div class="task-schedule">
            📅 ${task.cron_expression} | Command: ${task.command}
          </div>
          ${task.last_run ? `<div class="task-schedule">Last run: ${new Date(task.last_run).toLocaleString()}</div>` : ''}
        </div>
        <span class="${task.enabled ? 'task-enabled' : 'task-disabled'}">
          ${task.enabled ? '✓ Enabled' : '✗ Disabled'}
        </span>
      `;
      taskList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load tasks:', error);
  }
}

// Load research history
async function loadResearch() {
  try {
    const response = await fetch('/api/research?limit=10');
    const research = await response.json();
    
    const researchList = document.getElementById('researchList');
    researchList.innerHTML = '';
    
    if (research.length === 0) {
      researchList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No research history</p>';
      return;
    }
    
    research.forEach(item => {
      const div = document.createElement('div');
      div.className = 'task-item';
      div.innerHTML = `
        <div class="task-info">
          <div class="task-name">${item.query}</div>
          <div class="task-schedule">
            ${new Date(item.timestamp).toLocaleString()}
            ${item.saved_to_smb ? ' | 💾 Saved to SMB' : ''}
          </div>
        </div>
      `;
      researchList.appendChild(div);
    });
  } catch (error) {
    console.error('Failed to load research:', error);
  }
}

// Load speed test history
async function loadSpeedHistory() {
  try {
    const response = await fetch('/api/speedtests/history?days=7');
    const history = await response.json();
    
    if (history.length > 0) {
      updateSpeedChart(history);
    }
  } catch (error) {
    console.error('Failed to load speed history:', error);
  }
}

// Initialize charts
function initCharts() {
  // Device chart
  const deviceCtx = document.getElementById('deviceChart');
  if (deviceCtx) {
    deviceChart = new Chart(deviceCtx, {
      type: 'doughnut',
      data: {
        labels: ['Online', 'Offline'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['#10b981', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
  
  // Speed chart
  const speedCtx = document.getElementById('speedChart');
  if (speedCtx) {
    speedChart = new Chart(speedCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Download (Mbps)',
            data: [],
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4
          },
          {
            label: 'Upload (Mbps)',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
}

// Update device chart
function updateDeviceChart(devices) {
  if (!deviceChart) return;
  
  const online = devices.filter(d => d.online).length;
  const offline = devices.length - online;
  
  deviceChart.data.datasets[0].data = [online, offline];
  deviceChart.update();
}

// Update speed chart
function updateSpeedChart(history) {
  if (!speedChart) return;
  
  const labels = history.map(h => new Date(h.timestamp).toLocaleDateString());
  const downloads = history.map(h => parseFloat(h.download));
  const uploads = history.map(h => parseFloat(h.upload));
  
  speedChart.data.labels = labels;
  speedChart.data.datasets[0].data = downloads;
  speedChart.data.datasets[1].data = uploads;
  speedChart.update();
}

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Refresh devices
async function refreshDevices() {
  await loadDevices();
  await loadStats();
}

// Real-time event handlers
function handleDeviceUpdate(data) {
  loadDevices();
  loadStats();
}

function handleSpeedTestUpdate(data) {
  loadStats();
  loadSpeedHistory();
}

// ===== Personality Management =====

let allPersonalities = [];

// Load all available personalities
async function loadPersonalities() {
  try {
    const response = await authFetch('/api/personalities');
    allPersonalities = await response.json();
  } catch (error) {
    console.error('Failed to load personalities:', error);
  }
}

// Load a specific user's personality
async function loadUserPersonality() {
  const userId = document.getElementById('personalityUserId').value.trim();
  
  if (!userId || !/^\d{17,19}$/.test(userId)) {
    alert('Please enter a valid Discord User ID (17-19 digits)');
    return;
  }
  
  try {
    // Load personalities if not loaded
    if (allPersonalities.length === 0) {
      await loadPersonalities();
    }
    
    // Get current personality for user
    const response = await authFetch(`/api/personality/${userId}`);
    const current = await response.json();
    
    // Show current personality
    document.getElementById('personalityDisplay').style.display = 'block';
    document.getElementById('currentPersonalityName').textContent = `${current.emoji} ${current.name}`;
    
    // Render personality options
    const optionsDiv = document.getElementById('personalityOptions');
    optionsDiv.innerHTML = '';
    
    allPersonalities.forEach(p => {
      const isSelected = p.key === current.key;
      const card = document.createElement('div');
      card.style.cssText = `
        padding: 15px;
        border: 2px solid ${isSelected ? '#667eea' : '#e5e7eb'};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;
        background: ${isSelected ? '#f0f0ff' : 'white'};
      `;
      card.innerHTML = `
        <div style="font-size: 1.5em; margin-bottom: 5px;">${p.emoji}</div>
        <div style="font-weight: bold; color: #333;">${p.name}</div>
        <div style="font-size: 0.85em; color: #666; margin-top: 5px;">${p.description}</div>
        ${isSelected ? '<div style="color: #667eea; font-size: 0.85em; margin-top: 8px;">✓ Selected</div>' : ''}
      `;
      card.onclick = () => setUserPersonality(userId, p.key);
      card.onmouseover = () => { if (!isSelected) card.style.borderColor = '#667eea'; };
      card.onmouseout = () => { if (!isSelected) card.style.borderColor = '#e5e7eb'; };
      optionsDiv.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load user personality:', error);
    alert('Failed to load personality settings');
  }
}

// Set a user's personality
async function setUserPersonality(userId, personalityKey) {
  try {
    const response = await authFetch(`/api/personality/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personality: personalityKey })
    });
    
    if (response.ok) {
      const result = await response.json();
      alert(`✅ Personality changed to ${result.emoji} ${result.name}!`);
      await loadUserPersonality(); // Refresh display
    } else {
      const error = await response.json();
      alert(`❌ Failed to change personality: ${error.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error.message}`);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Auto-refresh every 30 seconds
setInterval(() => {
  loadStats();
}, 30000);
