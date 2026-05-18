const router = require('express').Router();
const ctrl = require('../controllers/auditController');
const { authGuard, roleGuard } = require('../middleware/auth');

router.get('/', authGuard, roleGuard('superadmin'), ctrl.listAuditLogs);

module.exports = router;
