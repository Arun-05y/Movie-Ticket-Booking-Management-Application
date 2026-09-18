// Automated Test Scenarios for CineWave Entertainment (Pega Platform™)
// Verifying business rules, case lifecycle transitions, validations, and notifications

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('================================================================');
  console.log('🎬 CINEWAVE ENTERTAINMENT - PEGA APPLICATION TEST SUITE');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.log(`  ❌ FAIL: ${testName} -> ${detail}`);
      failedCount++;
    }
  }

  try {
    // Reset database to seed state
    await makeRequest('POST', '/api/admin/reset');

    // -------------------------------------------------------------
    // TEST SCENARIO 1: Successful End-to-End Booking
    // -------------------------------------------------------------
    console.log('▶ TEST SCENARIO 1: Successful End-to-End Booking');
    
    // Stage 1: Booking Request
    const stage1Res = await makeRequest('POST', '/api/cases', {
      customerName: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      mobileNumber: '9845012345',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201',
      numberOfTickets: 2
    });

    assert(stage1Res.status === 200, 'Stage 1 HTTP status is 200');
    assert(stage1Res.body.success === true, 'Stage 1 returns success: true');
    assert(stage1Res.body.data.bookingID.startsWith('CW-'), 'Booking ID generated with CW- prefix');
    assert(stage1Res.body.data.caseStatus === 'Booking Requested', 'Initial case status is "Booking Requested"');
    assert(stage1Res.body.data.totalAmount === 400, 'Total amount calculated as NumberOfTickets × Price (2 × 200 = 400)');

    const case1ID = stage1Res.body.data.bookingID;

    // Stage 2: Check Availability & Select Seats (Seats A3, A4 are available)
    const stage2Res = await makeRequest('POST', `/api/cases/${case1ID}/select-seats`, {
      selectedSeats: ['A3', 'A4']
    });

    assert(stage2Res.status === 200, 'Stage 2 seat selection HTTP status 200');
    assert(stage2Res.body.data.caseStatus === 'Awaiting Customer Confirmation', 'Case advances to "Awaiting Customer Confirmation"');
    assert(stage2Res.body.data.selectedSeats.length === 2, 'Selected seats recorded');

    // Stage 3, 4, 5, 6: Customer Confirms Booking
    const stage3Res = await makeRequest('POST', `/api/cases/${case1ID}/confirm`, {
      decision: 'CONFIRM'
    });

    assert(stage3Res.status === 200, 'Customer confirmation HTTP status 200');
    assert(stage3Res.body.data.caseStatus === 'Completed', 'Final case status marked "Completed"');
    assert(stage3Res.body.notification != null, 'Stage 5 notification generated automatically');
    assert(stage3Res.body.notification.recipientEmail === 'rahul.verma@example.com', 'Notification sent to customer email');

    // Verify seats are now booked in the show seat layout
    const seatsRes = await makeRequest('GET', '/api/shows/SH-201/seats');
    const a3Seat = seatsRes.body.data.seats.find(s => s.seatNumber === 'A3');
    const a4Seat = seatsRes.body.data.seats.find(s => s.seatNumber === 'A4');
    assert(a3Seat.seatStatus === 'Booked' && a4Seat.seatStatus === 'Booked', 'Seats A3 and A4 status updated to "Booked"');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST SCENARIO 2: Seat Count Mismatch Validation
    // -------------------------------------------------------------
    console.log('▶ TEST SCENARIO 2: Seat Count Mismatch Validation');

    const stage1Case2 = await makeRequest('POST', '/api/cases', {
      customerName: 'Ananya Roy',
      email: 'ananya@example.com',
      mobileNumber: '9811122233',
      movieID: 'MOV-102',
      theatreID: 'TH-02',
      showID: 'SH-203',
      numberOfTickets: 3
    });

    const case2ID = stage1Case2.body.data.bookingID;

    // Attempt to select 2 seats when 3 tickets were requested
    const mismatchRes = await makeRequest('POST', `/api/cases/${case2ID}/select-seats`, {
      selectedSeats: ['B1', 'B2']
    });

    assert(mismatchRes.status === 400, 'Rejects seat selection when count does not match tickets (HTTP 400)');
    assert(mismatchRes.body.success === false, 'Returns validation failure response');
    assert(mismatchRes.body.message.includes('Validation Error'), 'Returns descriptive Pega validation message');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST SCENARIO 3: Duplicate / Already Booked Seat Selection Prevention
    // -------------------------------------------------------------
    console.log('▶ TEST SCENARIO 3: Already Booked Seat Selection Prevention');

    // Try to select seats A1 (which was pre-seeded as booked) and A3 (which was booked in Scenario 1)
    const stage1Case3 = await makeRequest('POST', '/api/cases', {
      customerName: 'Vikram Seth',
      email: 'vikram@example.com',
      mobileNumber: '9822233344',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201',
      numberOfTickets: 2
    });

    const case3ID = stage1Case3.body.data.bookingID;

    const bookedSeatRes = await makeRequest('POST', `/api/cases/${case3ID}/select-seats`, {
      selectedSeats: ['A1', 'A5'] // A1 is already booked!
    });

    assert(bookedSeatRes.status === 400, 'Rejects already-booked seat selection (HTTP 400)');
    assert(bookedSeatRes.body.success === false, 'Duplicate booking prevention blocked request');
    assert(bookedSeatRes.body.message.includes('already booked or unavailable'), 'Informs user about unavailable seat');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST SCENARIO 4: Customer Cancellation Flow Before Confirmation
    // -------------------------------------------------------------
    console.log('▶ TEST SCENARIO 4: Customer Cancellation Flow');

    const stage1Case4 = await makeRequest('POST', '/api/cases', {
      customerName: 'Sanjay Dutt',
      email: 'sanjay@example.com',
      mobileNumber: '9833344455',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201',
      numberOfTickets: 1
    });

    const case4ID = stage1Case4.body.data.bookingID;

    // Select seat B9
    await makeRequest('POST', `/api/cases/${case4ID}/select-seats`, {
      selectedSeats: ['B9']
    });

    // Customer decides to CANCEL at Stage 3
    const cancelRes = await makeRequest('POST', `/api/cases/${case4ID}/confirm`, {
      decision: 'CANCEL'
    });

    assert(cancelRes.status === 200, 'Cancellation request succeeds (HTTP 200)');
    assert(cancelRes.body.data.caseStatus === 'Cancelled', 'Case status updated to "Cancelled"');

    // Check that seat B9 remains Available
    const showSeatsAfterCancel = await makeRequest('GET', '/api/shows/SH-201/seats');
    const b9Seat = showSeatsAfterCancel.body.data.seats.find(s => s.seatNumber === 'B9');
    assert(b9Seat.seatStatus === 'Available', 'Cancelled seat B9 remains "Available"');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST SCENARIO 5: Mandatory Field Validation
    // -------------------------------------------------------------
    console.log('▶ TEST SCENARIO 5: Mandatory Field Validation');

    const emptyRes = await makeRequest('POST', '/api/cases', {
      customerName: '',
      email: '',
      mobileNumber: '',
      movieID: '',
      theatreID: '',
      showID: '',
      numberOfTickets: 0
    });

    assert(emptyRes.status === 400, 'Empty mandatory fields rejected with HTTP 400');
    assert(emptyRes.body.message.includes('Mandatory field validation failed'), 'Returns mandatory fields list');

    console.log('\n================================================================');
    console.log(`TEST EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount === 0) {
      console.log('🎉 All test scenarios verified successfully!');
      process.exit(0);
    } else {
      console.error('⚠️ Some tests failed.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

// Check if server is running, or start it
const app = require('./server.js');
setTimeout(() => {
  runAllTests();
}, 1000);
