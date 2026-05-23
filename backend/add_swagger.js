const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src/routes');

const tagMapping = {
  'auth.js': 'Auth',
  'rooms.js': 'Rooms',
  'bookings.js': 'Bookings',
  'buildings.js': 'Buildings',
  'policy.js': 'Policy',
  'tokens.js': 'Tokens',
  'users.js': 'Users',
  'workspaces.js': 'Workspaces',
  'zoom.js': 'Zoom',
  'stats.js': 'Stats',
  'audit.js': 'Audit'
};

const files = fs.readdirSync(routesDir);

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const tag = tagMapping[file] || 'Default';
  const prefix = `/api/${file.replace('.js', '') === 'auth' ? 'auth' : file.replace('.js', '')}`;
  // NOTE: app.js has special routes like /api/v1/workspaces, /api/v1/bookings. We'll just use the file name as a generic prefix for documentation, but wait:
  let prefixPath = `/api/${file.replace('.js', '')}`;
  if (file === 'workspaces.js') prefixPath = '/api/v1/workspaces';

  // Match router.<method>('<path>', ...)
  const regex = /router\.(get|post|put|delete|patch)\(\s*['"`](.*?)['"`]/g;
  
  let newContent = content;
  let offset = 0;
  
  const matches = [...content.matchAll(regex)];
  
  // We need to inject comments, so we replace from back to front to preserve indices, or just do a string replace on the full match if it's unique enough (it usually is, but let's be safe).
  // Actually, replacing string by string is safer if we just match the line.
  
  const lines = content.split('\n');
  let newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/router\.(get|post|put|delete|patch)\(\s*['"`](.*?)['"`]/);
    
    if (match && !lines[i-1]?.includes('@openapi') && !lines[i-2]?.includes('@openapi')) {
      const method = match[1];
      const endpoint = match[2];
      
      let fullPath = prefixPath + (endpoint === '/' ? '' : endpoint);
      // Replace :id with {id} for swagger
      fullPath = fullPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
      
      const summary = `${method.toUpperCase()} ${endpoint}`;
      
      const swaggerComment = `
/**
 * @openapi
 * ${fullPath}:
 *   ${method}:
 *     summary: ${summary}
 *     tags: [${tag}]
 *     responses:
 *       200:
 *         description: Success response
 */`;
      newLines.push(swaggerComment.trim());
    }
    newLines.push(line);
  }
  
  fs.writeFileSync(filePath, newLines.join('\n'));
});

console.log("Swagger comments added!");
