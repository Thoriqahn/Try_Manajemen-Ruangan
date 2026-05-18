const router = require('express').Router();
const ctrl = require('../controllers/roomController');
const { authGuard, roleGuard, optionalAuth } = require('../middleware/auth');
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

router.get('/', optionalAuth, ctrl.listRooms);
router.get('/:id', optionalAuth, ctrl.getRoom);
router.get('/:id/availability', optionalAuth, ctrl.getAvailability);
router.post('/', authGuard, roleGuard('admin', 'superadmin'), ctrl.createRoom);
router.put('/:id', authGuard, roleGuard('admin', 'superadmin'), ctrl.updateRoom);
router.delete('/:id', authGuard, roleGuard('admin', 'superadmin'), ctrl.deleteRoom);
router.post('/:id/upload', authGuard, roleGuard('admin', 'superadmin'), upload.single('photo'), ctrl.uploadPhoto);

module.exports = router;
