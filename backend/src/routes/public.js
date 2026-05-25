const express = require('express');
const router = express.Router();
const { getPublicBookingInfo, submitPublicAttendance, getActiveBookingByQr } = require('../controllers/publicController');

router.get('/bookings/:id', getPublicBookingInfo);
router.post('/attendances/:bookingId', submitPublicAttendance);
router.get('/qr/:token', getActiveBookingByQr);

module.exports = router;
