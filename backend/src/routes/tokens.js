const router = require('express').Router();
const ctrl = require('../controllers/tokenController');
const { authGuard, roleGuard } = require('../middleware/auth');

/**
 * @openapi
 * /api/tokens:
 *   get:
 *     summary: GET /
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', authGuard, roleGuard('superadmin'), ctrl.listTokens);
/**
 * @openapi
 * /api/tokens:
 *   post:
 *     summary: POST /
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/', authGuard, roleGuard('superadmin'), ctrl.generateToken);
/**
 * @openapi
 * /api/tokens/logs:
 *   get:
 *     summary: GET /logs
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/logs', authGuard, roleGuard('superadmin'), ctrl.getApiLogs);
/**
 * @openapi
 * /api/tokens/{id}:
 *   delete:
 *     summary: DELETE /:id
 *     tags: [Tokens]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/:id', authGuard, roleGuard('superadmin'), ctrl.revokeToken);

module.exports = router;
