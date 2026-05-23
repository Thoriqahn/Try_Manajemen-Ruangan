const router = require('express').Router();
const ctrl = require('../controllers/workspaceController');
const { authGuard } = require('../middleware/auth');
const { validateSeatingRequest, validateRelocation } = require('../middleware/validation');

// Custom authorization guard for specific raw database roles
const checkRawRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
  }
  const role = req.user.rawRole || req.user.role;
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak: izin tidak mencukupi untuk peran ini' });
  }
  next();
};

/**
 * Endpoint 1: Fetch Spatial Floor Plan
 * GET /api/v1/workspaces/:room_id/layout
 * Accessible by: USER, ADMIN_KERJA, SUPERADMIN
 */
/**
 * @openapi
 * /api/v1/workspaces/{room_id}/layout:
 *   get:
 *     summary: GET /:room_id/layout
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:room_id/layout', authGuard, checkRawRole('USER', 'ADMIN_KERJA', 'SUPERADMIN'), ctrl.getWorkspaceLayout);

/**
 * Endpoint 2: Submit Seating Request
 * POST /api/v1/workspaces/assignments/request
 * Accessible by: USER role only
 */
/**
 * @openapi
 * /api/v1/workspaces/assignments/request:
 *   post:
 *     summary: POST /assignments/request
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/assignments/request', authGuard, checkRawRole('USER'), validateSeatingRequest, ctrl.submitSeatingRequest);

/**
 * Endpoint 3: Administrative Override Relocation
 * POST /api/v1/workspaces/assignments/relocate
 * Accessible by: ADMIN_KERJA, SUPERADMIN
 */
/**
 * @openapi
 * /api/v1/workspaces/assignments/relocate:
 *   post:
 *     summary: POST /assignments/relocate
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/assignments/relocate', authGuard, checkRawRole('ADMIN_KERJA', 'SUPERADMIN'), validateRelocation, ctrl.relocateWorkspaceDesk);

/**
 * Endpoint 4: List Seating Requests for Admin / Superadmin
 * GET /api/v1/workspaces/assignments/requests
 * Accessible by: ADMIN_KERJA, SUPERADMIN
 */
/**
 * @openapi
 * /api/v1/workspaces/assignments/requests:
 *   get:
 *     summary: GET /assignments/requests
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/assignments/requests', authGuard, checkRawRole('ADMIN_KERJA', 'SUPERADMIN'), ctrl.listSeatingRequests);

/**
 * Endpoint 5: Approve Seating Request
 * POST /api/v1/workspaces/assignments/requests/:id/approve
 * Accessible by: ADMIN_KERJA, SUPERADMIN
 */
/**
 * @openapi
 * /api/v1/workspaces/assignments/requests/{id}/approve:
 *   post:
 *     summary: POST /assignments/requests/:id/approve
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/assignments/requests/:id/approve', authGuard, checkRawRole('ADMIN_KERJA', 'SUPERADMIN'), ctrl.approveSeatingRequest);

/**
 * Endpoint 6: Reject Seating Request
 * POST /api/v1/workspaces/assignments/requests/:id/reject
 * Accessible by: ADMIN_KERJA, SUPERADMIN
 */
/**
 * @openapi
 * /api/v1/workspaces/assignments/requests/{id}/reject:
 *   post:
 *     summary: POST /assignments/requests/:id/reject
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/assignments/requests/:id/reject', authGuard, checkRawRole('ADMIN_KERJA', 'SUPERADMIN'), ctrl.rejectSeatingRequest);

/**
 * Endpoint 7: Get My Desk Assignment and Pending Requests
 * GET /api/v1/workspaces/assignments/my-desk
 * Accessible by: USER, ADMIN_KERJA, SUPERADMIN
 */
/**
 * @openapi
 * /api/v1/workspaces/assignments/my-desk:
 *   get:
 *     summary: GET /assignments/my-desk
 *     tags: [Workspaces]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/assignments/my-desk', authGuard, checkRawRole('USER', 'ADMIN_KERJA', 'SUPERADMIN'), ctrl.getMyDeskAssignment);

module.exports = router;


