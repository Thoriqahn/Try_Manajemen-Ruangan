const router = require('express').Router();
const ctrl = require('../controllers/auditController');
const { authGuard, roleGuard } = require('../middleware/auth');

/**
 * @openapi
 * /api/audit:
 *   get:
 *     summary: GET /
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', authGuard, roleGuard('superadmin'), ctrl.listAuditLogs);

module.exports = router;
