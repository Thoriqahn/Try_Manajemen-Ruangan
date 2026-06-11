const { getClient } = require('../config/database');

const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getClient();
    try {
      const result = await client.query(
        'SELECT id, title, message, is_read, created_at, payload FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      res.json({ success: true, data: result.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const client = await getClient();
    try {
      await client.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
      res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserNotifications, markAsRead };
