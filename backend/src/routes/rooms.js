const router = require('express').Router();
const ctrl = require('../controllers/roomController');
const { authGuard, roleGuard, optionalAuth } = require('../middleware/auth');
const { validateRoom } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// File upload setup
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpg|jpeg|png)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Hanya file .jpg, .jpeg, .png yang diizinkan'));
  }
});

/**
 * @openapi
 * /api/rooms:
 *   get:
 *     summary: GET /
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', optionalAuth, ctrl.listRooms);
/**
 * @openapi
 * /api/rooms/{id}:
 *   get:
 *     summary: GET /:id
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id', optionalAuth, ctrl.getRoom);
/**
 * @openapi
 * /api/rooms/{id}/availability:
 *   get:
 *     summary: GET /:id/availability
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id/availability', optionalAuth, ctrl.getAvailability);
/**
 * @openapi
 * /api/rooms:
 *   post:
 *     summary: POST /
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/', authGuard, roleGuard('admin', 'superadmin'), validateRoom, ctrl.createRoom);
/**
 * @openapi
 * /api/rooms/{id}:
 *   put:
 *     summary: PUT /:id
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/:id', authGuard, roleGuard('admin', 'superadmin'), validateRoom, ctrl.updateRoom);
/**
 * @openapi
 * /api/rooms/{id}:
 *   delete:
 *     summary: DELETE /:id
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/:id', authGuard, roleGuard('admin', 'superadmin'), ctrl.deleteRoom);
/**
 * @openapi
 * /api/rooms/{id}/upload:
 *   post:
 *     summary: POST /:id/upload
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/upload', authGuard, roleGuard('admin', 'superadmin'), upload.single('photo'), ctrl.uploadPhoto);

/**
 * @openapi
 * /api/rooms/{id}/photos/{photoId}:
 *   delete:
 *     summary: DELETE /:id/photos/:photoId
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/:id/photos/:photoId', authGuard, roleGuard('admin', 'superadmin'), ctrl.deletePhoto);

module.exports = router;
