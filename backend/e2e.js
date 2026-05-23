const axios = require('axios');

async function runE2E() {
  console.log("Starting E2E API Test for QR Check-In Flow...");
  const baseURL = 'http://localhost:5000/api';
  
  try {
    // 1. Login as user
    console.log("1. Logging in as user@oikn.go.id...");
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'user@oikn.go.id',
      password: 'password123!'
    });
    const token = loginRes.data.accessToken;
    console.log("✅ Login successful");

    // 2. Fetch my bookings
    console.log("2. Fetching bookings...");
    const bookingsRes = await axios.get(`${baseURL}/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const bookings = bookingsRes.data.data;
    console.log(`✅ Fetched ${bookings.length} bookings`);

    // Find an ongoing or upcoming meeting to check in
    const targetBooking = bookings.find(b => b.status === 'ongoing' || b.status === 'confirmed');
    
    if (!targetBooking) {
      console.log("No ongoing/confirmed booking found to test check-in.");
      return;
    }
    
    console.log(`3. Attempting check-in for booking ID: ${targetBooking.id} in room: ${targetBooking.room_id}`);

    // Since we don't have the actual QR token of the room without querying the room API, let's query the room first to get the token
    const roomRes = await axios.get(`${baseURL}/rooms/${targetBooking.room_id}`);
    const actualQrToken = roomRes.data.data.qr_token || roomRes.data.data.id;
    
    console.log(`✅ Room QR Token obtained: ${actualQrToken}`);

    // Perform check in
    console.log(`4. Simulating QR scan check-in...`);
    const checkInRes = await axios.post(`${baseURL}/bookings/check-in`, {
      room_id: targetBooking.room_id,
      scanned_qr_token: actualQrToken
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("✅ Check-In successful!");
    console.log("Response:", checkInRes.data.message);
    console.log("\n🎉 E2E Test Passed!");

  } catch (error) {
    console.error("❌ E2E Test Failed!");
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runE2E();
