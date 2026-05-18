const router = require('express').Router();
const ctrl = require('../controllers/tokenController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.get('/', authGuard, roleGuard('superadmin'), ctrl.listTokens);
router.post('/', authGuard, roleGuard('superadmin'), ctrl.generateToken);
router.get('/logs', authGuard, roleGuard('superadmin'), ctrl.getApiLogs);
router.delete('/:id', authGuard, roleGuard('superadmin'), ctrl.revokeToken);

module.exports = router;
