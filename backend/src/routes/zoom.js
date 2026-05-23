const router = require('express').Router();
const ctrl = require('../controllers/zoomController');
const { authGuard, roleGuard } = require('../middleware/auth');

// All zoom routes require superadmin
router.use(authGuard, roleGuard('superadmin'));

/**
 * @openapi
 * /api/zoom/config:
 *   get:
 *     summary: GET /config
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/config', ctrl.getConfig);
/**
 * @openapi
 * /api/zoom/config:
 *   put:
 *     summary: PUT /config
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/config', ctrl.saveConfig);
/**
 * @openapi
 * /api/zoom/test-connection:
 *   post:
 *     summary: POST /test-connection
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/test-connection', ctrl.testConnection);
/**
 * @openapi
 * /api/zoom/accounts:
 *   get:
 *     summary: GET /accounts
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/accounts', ctrl.listAccounts);
/**
 * @openapi
 * /api/zoom/accounts:
 *   post:
 *     summary: POST /accounts
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/accounts', ctrl.addAccount);
/**
 * @openapi
 * /api/zoom/accounts/{id}:
 *   delete:
 *     summary: DELETE /accounts/:id
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/accounts/:id', ctrl.removeAccount);
/**
 * @openapi
 * /api/zoom/accounts/{id}/verify:
 *   post:
 *     summary: POST /accounts/:id/verify
 *     tags: [Zoom]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/accounts/:id/verify', ctrl.verifyAccount);

module.exports = router;
