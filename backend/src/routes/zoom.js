const router = require('express').Router();
const ctrl = require('../controllers/zoomController');
const { authGuard, roleGuard } = require('../middleware/auth');

// All zoom routes require superadmin
router.use(authGuard, roleGuard('superadmin'));

router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.saveConfig);
router.post('/test-connection', ctrl.testConnection);
router.get('/accounts', ctrl.listAccounts);
router.post('/accounts', ctrl.addAccount);
router.delete('/accounts/:id', ctrl.removeAccount);
router.post('/accounts/:id/verify', ctrl.verifyAccount);

module.exports = router;
