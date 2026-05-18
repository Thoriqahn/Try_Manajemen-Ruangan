const router = require('express').Router();
const ctrl = require('../controllers/buildingController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.get('/', ctrl.listBuildings);
router.post('/', authGuard, roleGuard('superadmin'), ctrl.createBuilding);
router.get('/:id/floors', ctrl.listFloors);
router.post('/:id/floors', authGuard, roleGuard('superadmin'), ctrl.createFloor);

module.exports = router;
