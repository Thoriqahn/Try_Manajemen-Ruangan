const express = require('express');
const router = express.Router();
const { authGuard } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', authGuard, ctrl.getUserNotifications);
router.put('/read-all', authGuard, ctrl.markAsRead);

module.exports = router;
