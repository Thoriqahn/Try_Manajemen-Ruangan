const router = require('express').Router();
const ctrl = require('../controllers/policyController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.get('/', authGuard, ctrl.getPolicy);
router.put('/', authGuard, roleGuard('superadmin'), ctrl.updatePolicy);
router.post('/blackout', authGuard, roleGuard('superadmin'), ctrl.addBlackout);
router.delete('/blackout/:date', authGuard, roleGuard('superadmin'), ctrl.removeBlackout);

module.exports = router;
