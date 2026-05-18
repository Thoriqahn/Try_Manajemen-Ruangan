const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.get('/', authGuard, roleGuard('superadmin'), ctrl.listUsers);
router.get('/:id', authGuard, roleGuard('superadmin'), ctrl.getUser);
router.put('/:id/role', authGuard, roleGuard('superadmin'), ctrl.updateRole);
router.put('/:id/status', authGuard, roleGuard('superadmin'), ctrl.updateStatus);
router.put('/:id/room-assignment', authGuard, roleGuard('superadmin'), ctrl.updateRoomAssignment);

module.exports = router;
