const router = require('express').Router();
const ctrl = require('../controllers/statsController');
const { authGuard, roleGuard } = require('../middleware/auth');

/**
 * @openapi
 * /api/stats/admin:
 *   get:
 *     summary: GET /admin
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/admin', authGuard, roleGuard('admin', 'superadmin'), ctrl.adminStats);
/**
 * @openapi
 * /api/stats/global:
 *   get:
 *     summary: GET /global
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/global', authGuard, roleGuard('superadmin'), ctrl.globalStats);

module.exports = router;
