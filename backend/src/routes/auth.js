const router = require('express').Router();
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/verify-otp', ctrl.verifyOtp);
router.post('/resend-otp', ctrl.resendOtp);
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/refresh', ctrl.refresh);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

const { authGuard } = require('../middleware/auth');
router.get('/me', authGuard, ctrl.me);

module.exports = router;
