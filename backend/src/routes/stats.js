const router = require('express').Router();
const ctrl = require('../controllers/statsController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.get('/admin', authGuard, roleGuard('admin', 'superadmin'), ctrl.adminStats);
router.get('/global', authGuard, roleGuard('superadmin'), ctrl.globalStats);

module.exports = router;
