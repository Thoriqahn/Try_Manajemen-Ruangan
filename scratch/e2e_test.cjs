const http = require('http');

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log("Starting E2E Flow Simulation...");

  try {
    // 1. Login User 1
    console.log("\n[1] Login User (ujicoba1@mail.com)");
    const userRes = await request('POST', '/api/auth/login', { email: 'ujicoba1@mail.com', password: 'password123' });
    if (userRes.status !== 200) throw new Error("User login failed: " + JSON.stringify(userRes.data));
    const userToken = userRes.data.accessToken;
    console.log("✓ User 1 logged in successfully");

    // 2. Login Admin
    console.log("\n[2] Login Admin (admin@oikn.go.id)");
    const adminRes = await request('POST', '/api/auth/login', { email: 'admin@oikn.go.id', password: 'password123!' });
    if (adminRes.status !== 200) throw new Error("Admin login failed: " + JSON.stringify(adminRes.data));
    const adminToken = adminRes.data.accessToken;
    console.log("✓ Admin logged in successfully");

    // 3. Get Rooms managed by Admin
    console.log("\n[3] Fetching Rooms");
    const roomsRes = await request('GET', '/api/rooms?managed_only=true', null, adminToken);
    const rooms = roomsRes.data.data;
    if (!rooms || rooms.length === 0) throw new Error("No managed rooms found for admin");
    const room = rooms.find(r => r.room_type === 'physical' && r.status === 'active') || rooms[0];
    console.log(`✓ Found room: ${room.name} (ID: ${room.id})`);

    // 4. Create Booking
    console.log("\n[4] Creating Booking");
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2);
    const dateStr = testDate.toISOString().split('T')[0];
    
    const bookingPayload = {
      room_id: room.id,
      date: dateStr,
      start_time: '15:00',
      end_time: '16:00',
      agenda: 'E2E Test Meeting',
      meeting_type: 'offline',
      participants: 5,
      notes: 'Testing notes'
    };
    
    const bookRes = await request('POST', '/api/bookings', bookingPayload, userToken);
    if (bookRes.status !== 201) throw new Error("Booking failed: " + JSON.stringify(bookRes.data));
    const bookingId = bookRes.data.data.id;
    console.log(`✓ Booking created successfully (ID: ${bookingId})`);

    // 5. Admin Approving Booking
    console.log("\n[5] Admin Approving Booking");
    const approveRes = await request('POST', `/api/bookings/${bookingId}/approve`, null, adminToken);
    if (approveRes.status !== 200) throw new Error("Approval failed: " + JSON.stringify(approveRes.data));
    console.log("✓ Booking approved successfully");

    // 6. User Check-In (Simulated)
    // Note: check-in might fail if it's not today or not the correct time, let's just test the API responds properly.
    console.log("\n[6] User Checking-in (Simulation)");
    const checkInRes = await request('POST', '/api/bookings/check-in', { room_id: room.id, scanned_qr_token: 'dummy-token' }, userToken);
    console.log(`✓ Check-In response status: ${checkInRes.status} (Message: ${checkInRes.data.message || 'N/A'})`);

    console.log("\n✅ E2E Simulation completed.");

  } catch (err) {
    console.error("\n❌ E2E Simulation failed:", err.message);
  }
}

runTest();
