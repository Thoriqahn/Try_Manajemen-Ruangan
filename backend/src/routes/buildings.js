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

/**
 * @openapi
 * /api/buildings:
 *   get:
 *     summary: GET /
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', ctrl.listBuildings);
/**
 * @openapi
 * /api/buildings:
 *   post:
 *     summary: POST /
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/', authGuard, roleGuard('superadmin'), upload.single('image'), ctrl.createBuilding);
/**
 * @openapi
 * /api/buildings/{id}:
 *   put:
 *     summary: PUT /:id
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/:id', authGuard, roleGuard('superadmin'), upload.single('image'), ctrl.updateBuilding);
/**
 * @openapi
 * /api/buildings/{id}:
 *   delete:
 *     summary: DELETE /:id
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/:id', authGuard, roleGuard('superadmin'), ctrl.deleteBuilding);
/**
 * @openapi
 * /api/buildings/{id}/floors:
 *   get:
 *     summary: GET /:id/floors
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id/floors', ctrl.listFloors);
/**
 * @openapi
 * /api/buildings/{id}/floors:
 *   post:
 *     summary: POST /:id/floors
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/floors', authGuard, roleGuard('superadmin'), ctrl.createFloor);

module.exports = router;
