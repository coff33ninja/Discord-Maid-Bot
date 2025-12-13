const fs = require('fs');
const data = JSON.parse(fs.readFileSync('ha-entities-full-dump.json'));

const controllers = data.filter(e => 
  e.entity_id.includes('controller') || 
  e.entity_id.includes('kusanagi') || 
  e.entity_id.includes('madara') ||
  e.entity_id.includes('pc_')
);

console.log(`Found ${controllers.length} controller/PC entities:\n`);

controllers.forEach(e => {
  console.log(`\n${e.entity_id}`);
  console.log(`  Name: ${e.attributes?.friendly_name || 'No name'}`);
  console.log(`  State: ${e.state}`);
  console.log(`  Platform: ${e.attributes?.platform || 'N/A'}`);
  console.log(`  Integration: ${e.attributes?.integration || 'N/A'}`);
  console.log(`  Device ID: ${e.attributes?.device_id || 'N/A'}`);
  console.log(`  All attributes:`, Object.keys(e.attributes || {}));
});
