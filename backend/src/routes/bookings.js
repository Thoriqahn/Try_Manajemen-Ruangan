const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { authGuard, roleGuard } = require('../middleware/auth');
const { validateCheckIn, validateBooking } = require('../middleware/validation');

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     summary: GET /
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/', authGuard, ctrl.listBookings);
router.get('/attendances/mine', authGuard, ctrl.getMyAttendances);

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     summary: POST /
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/', authGuard, validateBooking, ctrl.createBooking);
/**
 * @openapi
 * /api/bookings/check-in:
 *   post:
 *     summary: POST /check-in
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/check-in', authGuard, validateCheckIn, ctrl.checkInBooking);
/**
 * @openapi
 * /api/bookings/{id}:
 *   get:
 *     summary: GET /:id
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id', authGuard, ctrl.getBooking);
/**
 * @openapi
 * /api/bookings/{id}:
 *   put:
 *     summary: PUT /:id
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.put('/:id', authGuard, validateBooking, ctrl.updateBooking);
/**
 * @openapi
 * /api/bookings/{id}:
 *   delete:
 *     summary: DELETE /:id
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.delete('/:id', authGuard, ctrl.cancelBooking);
/**
 * @openapi
 * /api/bookings/{id}/approve:
 *   post:
 *     summary: POST /:id/approve
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/approve', authGuard, roleGuard('admin', 'superadmin'), ctrl.approveBooking);
/**
 * @openapi
 * /api/bookings/{id}/reject:
 *   post:
 *     summary: POST /:id/reject
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/reject', authGuard, roleGuard('admin', 'superadmin'), ctrl.rejectBooking);
/**
 * @openapi
 * /api/bookings/{id}/force-cancel:
 *   post:
 *     summary: POST /:id/force-cancel
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/force-cancel', authGuard, roleGuard('admin', 'superadmin'), ctrl.forceCancel);
/**
 * @openapi
 * /api/bookings/{id}/attendees:
 *   get:
 *     summary: GET /:id/attendees
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id/attendees', authGuard, ctrl.getBookingAttendees);

/**
 * @openapi
 * /api/bookings/{id}/attendees/csv:
 *   get:
 *     summary: GET /:id/attendees/csv
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/:id/attendees/csv', authGuard, ctrl.exportAttendeesCSV);

/**
 * @openapi
 * /api/bookings/{id}/zoom-join:
 *   post:
 *     summary: POST /:id/zoom-join
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/zoom-join', authGuard, ctrl.logZoomJoin);

/**
 * @openapi
 * /api/bookings/{id}/zoom-leave:
 *   post:
 *     summary: POST /:id/zoom-leave
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Success response
 */
router.post('/:id/zoom-leave', authGuard, ctrl.logZoomLeave);

module.exports = router;
