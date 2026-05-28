require('dotenv').config();
process.env.NODE_ENV = 'test'; // Force test environment so it uses the test DB

const app = require('./src/app');
const { initSchema, seedData } = require('./src/config/migrate');
const { startNoShowWorker } = require('./src/jobs/noShowWorker');

const PORT = 5000;

async function start() {
  try {
    console.log("Preparing Test Database for E2E...");
    await initSchema();
    await seedData();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 E2E Test Server running on http://0.0.0.0:${PORT} (TEST DB)`);
      startNoShowWorker();
    });
  } catch (err) {
    console.error('❌ Failed to start E2E server:', err);
    process.exit(1);
  }
}

start();
