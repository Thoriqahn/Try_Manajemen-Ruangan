const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authGuard, roleGuard, rawRoleGuard } = require('../middleware/auth');

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: GET /
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', authGuard, rawRoleGuard('SUPERADMIN', 'ADMIN_KERJA', 'ADMIN'), ctrl.listUsers);
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: GET /:id
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id', authGuard, roleGuard('superadmin'), ctrl.getUser);
/**
 * @openapi
 * /api/users/{id}/role:
 *   put:
 *     summary: PUT /:id/role
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/:id/role', authGuard, roleGuard('superadmin'), ctrl.updateRole);
/**
 * @openapi
 * /api/users/{id}/status:
 *   put:
 *     summary: PUT /:id/status
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/:id/status', authGuard, roleGuard('superadmin'), ctrl.updateStatus);
/**
 * @openapi
 * /api/users/{id}/room-assignment:
 *   put:
 *     summary: PUT /:id/room-assignment
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/:id/room-assignment', authGuard, roleGuard('superadmin'), ctrl.updateRoomAssignment);

module.exports = router;
