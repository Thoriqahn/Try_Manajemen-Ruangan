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
  validateResults
];

module.exports = {
  validateSeatingRequest,
  validateRelocation,
  validateCheckIn
};
