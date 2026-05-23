const router = require('express').Router();
const ctrl = require('../controllers/policyController');
const { authGuard, roleGuard } = require('../middleware/auth');

/**
 * @openapi
 * /api/policy:
 *   get:
 *     summary: GET /
 *     tags: [Policy]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', authGuard, ctrl.getPolicy);
/**
 * @openapi
 * /api/policy:
 *   put:
 *     summary: PUT /
 *     tags: [Policy]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/', authGuard, roleGuard('superadmin'), ctrl.updatePolicy);
/**
 * @openapi
 * /api/policy/blackout:
 *   post:
 *     summary: POST /blackout
 *     tags: [Policy]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/blackout', authGuard, roleGuard('superadmin'), ctrl.addBlackout);
/**
 * @openapi
 * /api/policy/blackout/{date}:
 *   delete:
 *     summary: DELETE /blackout/:date
 *     tags: [Policy]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/blackout/:date', authGuard, roleGuard('superadmin'), ctrl.removeBlackout);

module.exports = router;
