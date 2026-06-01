const { body, validationResult } = require('express-validator');

// Helper to handle validation results
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validasi input gagal',
      errors: errors.array().map(err => ({
        field: err.param || err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Seating request validation
const validateSeatingRequest = [
  body('room_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('room_id wajib diisi dan harus berupa string'),
  body('desk_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('desk_id wajib diisi dan harus berupa string'),
  validateResults
];

// Relocation request validation
const validateRelocation = [
  body('current_desk_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('current_desk_id wajib diisi dan harus berupa string'),
  body('target_desk_id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('target_desk_id wajib diisi dan harus berupa string'),
  body('rationale')
    .isString()
    .trim()
    .isLength({ min: 10 })
    .withMessage('rationale wajib diisi dan minimal 10 karakter'),
  validateResults
];

// Check-in validation
const validateCheckIn = [
  body('room_id')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .withMessage('room_id harus berupa string jika diisi'),
  body('scanned_qr_token')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('scanned_qr_token wajib diisi dan harus berupa string'),
  body('signature').optional().isString().withMessage('Signature harus berupa string base64'),
  body('email').optional().isEmail().withMessage('Format email tidak valid'),
  body('institution').optional().isString().trim(),
  body('position').optional().isString().trim(),
  validateResults
];

// Auth validation
const validateRegister = [
  body('name').isString().trim().escape().notEmpty().withMessage('Nama wajib diisi'),
  body('email').isString().trim().isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
  validateResults
];

const validateLogin = [
  body('email').isString().trim().isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password').isString().notEmpty().withMessage('Password wajib diisi'),
  validateResults
];

const validateResetPassword = [
  body('userId').isString().trim().notEmpty(),
  body('otp').isString().trim().notEmpty(),
  body('newPassword').isString().isLength({ min: 8 }).withMessage('Password minimal 8 karakter'),
  validateResults
];

// Room validation
const validateRoom = [
  body('name').optional().isString().trim().escape(),
  body('description').optional({ checkFalsy: true }).isString().trim().escape(),
  body('building_id').optional({ checkFalsy: true }).isString().trim(),
  body('floor_id').optional({ checkFalsy: true }).isString().trim(),
  body('status').optional().isIn(['active', 'inactive']),
  body('approval_type').optional().isIn(['instant', 'manual']),
  body('room_type').optional().isIn(['physical', 'digital', 'hybrid']),
  validateResults
];

// Booking validation
const validateBooking = [
  body('room_id').optional({ checkFalsy: true }).isString().trim(),
  body('date').optional().isString().trim().isISO8601(),
  body('start_time').optional().isString().trim().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').optional().isString().trim().matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  body('agenda').optional().isString().trim().escape(),
  body('participants').optional().isInt({ min: 1 }),
  body('meeting_type').optional().isIn(['offline', 'online', 'hybrid']),
  body('surat_terkait').optional({ checkFalsy: true }).isString().trim(),
  validateResults
];

module.exports = {
  validateSeatingRequest,
  validateRelocation,
  validateCheckIn,
  validateRegister,
  validateLogin,
  validateResetPassword,
  validateRoom,
  validateBooking
};
