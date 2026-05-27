const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { validateRegister, validateLogin, validateResetPassword } = require('../middleware/validation');

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: POST /register
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/register', validateRegister, ctrl.register);
/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: POST /verify-otp
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/verify-otp', ctrl.verifyOtp);
/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     summary: POST /resend-otp
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/resend-otp', ctrl.resendOtp);
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: POST /login
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/login', validateLogin, ctrl.login);
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: POST /logout
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/logout', ctrl.logout);
/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: POST /refresh
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/refresh', ctrl.refresh);
/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: POST /forgot-password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/forgot-password', ctrl.forgotPassword);
/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: POST /reset-password
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/reset-password', validateResetPassword, ctrl.resetPassword);

const { authGuard } = require('../middleware/auth');
/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: GET /me
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/me', authGuard, ctrl.me);

module.exports = router;
