require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const { errorHandler, notFoundHandler } = require('./middleware/error');
const { initSchema, seedData } = require('./config/migrate');

const app = express();

// ─── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
  ],
  credentials: true,
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' }
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 5 menit.' }
});

app.use('/api', limiter);

// ─── Static Uploads ──────────────────────────────────────────────────────────
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
app.use('/uploads', express.static(uploadDir));

// ─── Swagger / OpenAPI Docs ──────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Menara — Room Management API',
      version: '1.0.0',
      description: 'API Platform Manajemen Ruangan Internal OIKN',
      contact: { name: 'Tim OIKN', email: 'dev@oikn.go.id' }
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 5000}/api`, description: 'Development Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { background: #2A4E85; }',
  customSiteTitle: 'Menara API Docs'
}));
app.get('/api/openapi.json', (req, res) => res.json(swaggerSpec));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/users', require('./routes/users'));
app.use('/api/buildings', require('./routes/buildings'));
app.use('/api/policy', require('./routes/policy'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/stats', require('./routes/stats'));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Menara API is running', timestamp: new Date().toISOString() });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

async function start() {
  try {
    await initSchema();
    await seedData();
    app.listen(PORT, () => {
      console.log(`\n🚀 Menara API Server running on http://localhost:${PORT}`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
