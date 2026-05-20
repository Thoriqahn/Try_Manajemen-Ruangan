const router = require('express').Router();
const ctrl = require('../controllers/buildingController');
const { authGuard, roleGuard } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File upload setup (1MB Limit for Buildings)
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `building-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB strictly
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpg|jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Hanya file .jpg, .jpeg, .png, .webp yang diizinkan'));
  }
});

router.get('/', ctrl.listBuildings);
router.post('/', authGuard, roleGuard('superadmin'), upload.single('image'), ctrl.createBuilding);
router.put('/:id', authGuard, roleGuard('superadmin'), upload.single('image'), ctrl.updateBuilding);
router.delete('/:id', authGuard, roleGuard('superadmin'), ctrl.deleteBuilding);
router.get('/:id/floors', ctrl.listFloors);
router.post('/:id/floors', authGuard, roleGuard('superadmin'), ctrl.createFloor);

module.exports = router;
