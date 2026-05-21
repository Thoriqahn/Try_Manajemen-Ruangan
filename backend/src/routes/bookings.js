const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { authGuard, roleGuard } = require('../middleware/auth');
const { validateCheckIn } = require('../middleware/validation');

router.get('/', authGuard, ctrl.listBookings);
router.post('/', authGuard, ctrl.createBooking);
router.post('/check-in', authGuard, validateCheckIn, ctrl.checkInBooking);
router.get('/:id', authGuard, ctrl.getBooking);
router.put('/:id', authGuard, ctrl.updateBooking);
router.delete('/:id', authGuard, ctrl.cancelBooking);
router.post('/:id/approve', authGuard, roleGuard('admin', 'superadmin'), ctrl.approveBooking);
router.post('/:id/reject', authGuard, roleGuard('admin', 'superadmin'), ctrl.rejectBooking);
router.post('/:id/force-cancel', authGuard, roleGuard('admin', 'superadmin'), ctrl.forceCancel);

module.exports = router;
