/**
 * Zoom API Utility — Server-to-Server OAuth
 * Handles token acquisition, meeting CRUD, and rate limit retries.
 */
const axios = require('axios');
const { dbGet } = require('../config/database');

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Get Zoom OAuth access token using Server-to-Server credentials stored in DB.
 */
const getAccessToken = async () => {
  if (process.env.NODE_ENV === 'test') return 'test_token_123';

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const config = await dbGet('SELECT * FROM zoom_config WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 1');
  if (!config) throw new Error('Zoom belum dikonfigurasi. Silakan atur kredensial di panel Super Admin.');

  const { client_id, client_secret_encrypted, account_id } = config;

  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${account_id}`;
  const auth = Buffer.from(`${client_id}:${client_secret_encrypted}`).toString('base64');

  try {
    const response = await axios.post(tokenUrl, null, {
      headers: { 
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000,
    });

    cachedToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
    return cachedToken;
  } catch (err) {
    if (err.response && err.response.data) {
      const zoomMsg = err.response.data.reason || err.response.data.errorMessage || err.response.data.error || 'Unknown error';
      throw new Error(`Zoom API: ${zoomMsg}`);
    }
    throw err;
  }
};

/**
 * Make an authenticated request to the Zoom API with retry on 429.
 */
const zoomRequest = async (method, path, data = null, retries = 3) => {
  const token = await getAccessToken();
  const url = `https://api.zoom.us/v2${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return response.data;
    } catch (err) {
      if (err.response && err.response.status === 429 && attempt < retries) {
        // Rate limited — wait and retry
        const retryAfter = parseInt(err.response.headers['retry-after'] || '2') * 1000;
        console.warn(`Zoom API rate limited. Retrying in ${retryAfter}ms (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        continue;
      }
      // Re-throw with useful message
      const msg = err.response?.data?.message || err.message;
      const status = err.response?.status || 500;
      const error = new Error(`Zoom API Error (${status}): ${msg}`);
      error.status = status;
      error.zoomResponse = err.response?.data;
      throw error;
    }
  }
};

/**
 * Create a scheduled Zoom meeting.
 * @param {string} hostEmail - The Zoom account email to use as host
 * @param {string} topic - Meeting topic (from booking agenda)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {object} { id, join_url, password, start_url }
 */
const createZoomMeeting = async (hostEmail, topic, date, startTime, endTime) => {
  // Calculate duration in minutes
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);

  // Build ISO 8601 start_time
  const startDateTime = `${date}T${startTime}:00`;

  if (process.env.NODE_ENV === 'test') {
    return {
      id: Math.floor(Math.random() * 1000000000),
      join_url: 'https://zoom.us/j/dummy',
      password: 'dummy-password'
    };
  }

  const payload = {
    topic,
    type: 2, // Scheduled meeting
    start_time: startDateTime,
    duration: durationMinutes,
    timezone: 'Asia/Makassar', // WITA (IKN timezone)
    settings: {
      join_before_host: true,
      waiting_room: false,
      mute_upon_entry: true,
      auto_recording: 'none',
    },
  };

  return await zoomRequest('POST', `/users/${hostEmail}/meetings`, payload);
};

/**
 * Delete a Zoom meeting.
 */
const deleteZoomMeeting = async (meetingId) => {
  if (process.env.NODE_ENV === 'test') return true;
  return await zoomRequest('DELETE', `/meetings/${meetingId}`);
};

/**
 * Update a Zoom meeting's schedule.
 */
const updateZoomMeeting = async (meetingId, date, startTime, endTime) => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
  const startDateTime = `${date}T${startTime}:00`;

  if (process.env.NODE_ENV === 'test') return true;

  return await zoomRequest('PATCH', `/meetings/${meetingId}`, {
    start_time: startDateTime,
    duration: durationMinutes,
    timezone: 'Asia/Makassar',
  });
};

/**
 * Verify a Zoom user's license status.
 */
const getZoomUser = async (email) => {
  if (process.env.NODE_ENV === 'test') {
    return { type: 2, display_name: 'Test Zoom User' };
  }
  return await zoomRequest('GET', `/users/${email}`);
};

module.exports = { getAccessToken, createZoomMeeting, deleteZoomMeeting, updateZoomMeeting, getZoomUser };
