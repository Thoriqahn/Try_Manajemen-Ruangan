const { execSync } = require('child_process');
try {
  execSync('npx vitest run tests/bookings.test.js', { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
