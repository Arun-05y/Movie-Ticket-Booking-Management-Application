// Automated Test Scenarios for CineWave Entertainment (Pega Major Version Architecture)
// Verifying Ruleset Major Versioning, Alternate Stages, SLAs, Decision Tables, Work Queues & Routing

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
  console.log('🎬 CINEWAVE ENTERTAINMENT – PEGA MAJOR ARCHITECTURE TEST SUITE');
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
    // TEST 1: Pega Major Version Metadata
    // -------------------------------------------------------------
    console.log('▶ TEST 1: Pega Major Version Metadata');
    const verRes = await makeRequest('GET', '/api/pega/version');
    assert(verRes.status === 200, 'Version endpoint responds with HTTP 200');
    assert(verRes.body.data.majorVersion === '01', 'Pega Major Version initialized as 01');
    assert(verRes.body.data.rulesetVersion === 'CineWave:01-01-01', 'Ruleset version is CineWave:01-01-01');
    assert(verRes.body.data.platformVersion.includes('24.1'), 'Platform version is 24.1 Infinity');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST 2: Successful End-to-End Booking with Pega Decision Table
    // -------------------------------------------------------------
    console.log('▶ TEST 2: End-to-End Primary Lifecycle + Decision Table');
    
    // Stage 1: Booking Request with VIP Tier (15% discount)
    const stage1Res = await makeRequest('POST', '/api/cases', {
      customerName: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      mobileNumber: '9845012345',
      customerTier: 'VIP',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201', // Date: 2026-09-20 (Sunday -> Weekend surge +30, Base 200 => 230 - 15% discount = 195)
      numberOfTickets: 2
    });

    assert(stage1Res.status === 200, 'Stage 1 HTTP status is 200');
    assert(stage1Res.body.data.caseStatus === 'Booking Requested', 'Status is "Booking Requested"');
    assert(stage1Res.body.data.rulesetVersion === 'CineWave:01-01-01', 'Case tagged with ruleset CineWave:01-01-01');
    assert(stage1Res.body.data.ticketPrice === 195, 'Pega Decision Table correctly calculated unit price: ₹195');
    assert(stage1Res.body.data.totalAmount === 390, 'Total amount calculated as 2 × 195 = 390');

    const case1ID = stage1Res.body.data.bookingID;

    // Stage 2: Select Standard seats A3, A4
    const stage2Res = await makeRequest('POST', `/api/cases/${case1ID}/select-seats`, {
      selectedSeats: ['A3', 'A4']
    });

    assert(stage2Res.status === 200, 'Stage 2 seats selected HTTP 200');
    assert(stage2Res.body.data.caseStatus === 'Awaiting Customer Confirmation', 'Status advanced to "Awaiting Customer Confirmation"');

    // Stage 3, 4, 5, 6: Confirm Booking
    const stage3Res = await makeRequest('POST', `/api/cases/${case1ID}/confirm`, {
      decision: 'CONFIRM'
    });

    assert(stage3Res.status === 200, 'Confirmation HTTP 200');
    assert(stage3Res.body.data.caseStatus === 'Completed', 'Final status is "Completed"');
    assert(stage3Res.body.notification != null, 'Email correspondence dispatched automatically');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST 3: Pega Work Queue Routing & Manager Approval (Bulk Tickets > 4)
    // -------------------------------------------------------------
    console.log('▶ TEST 3: Pega Work Queue Routing for Bulk Booking (> 4 tickets)');

    const bulkRes = await makeRequest('POST', '/api/cases', {
      customerName: 'Ananya Sharma',
      email: 'ananya@example.com',
      mobileNumber: '9811122233',
      customerTier: 'Regular',
      movieID: 'MOV-102',
      theatreID: 'TH-02',
      showID: 'SH-203',
      numberOfTickets: 5 // > 4 triggers manager approval!
    });

    assert(bulkRes.status === 200, 'Bulk booking creation HTTP 200');
    assert(bulkRes.body.data.caseStatus === 'Pending-ManagerApproval', 'Case routed to "Pending-ManagerApproval"');
    assert(bulkRes.body.data.routedTo === 'StaffReviewQueue@CineWave', 'Case assigned to "StaffReviewQueue@CineWave"');

    const bulkID = bulkRes.body.data.bookingID;

    // Cinema Manager Approves Case from Work Queue
    const approvalRes = await makeRequest('POST', `/api/cases/${bulkID}/manager-review`, {
      action: 'APPROVE',
      managerNotes: 'Approved bulk corporate order'
    });

    assert(approvalRes.status === 200, 'Manager review endpoint HTTP 200');
    assert(approvalRes.body.data.caseStatus === 'Booking Requested', 'Case returned to "Booking Requested" after approval');
    assert(approvalRes.body.data.routedTo === 'pyWorkList', 'Routed to customer pyWorkList for seat selection');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST 4: Pega Service Level Agreement (SLA) Expiry & Alternate Stage
    // -------------------------------------------------------------
    console.log('▶ TEST 4: Pega SLA Expiry & Alternate Stage: Seat Hold Timeout');

    const slaCaseRes = await makeRequest('POST', '/api/cases', {
      customerName: 'Karan Mehra',
      email: 'karan@example.com',
      mobileNumber: '9877788899',
      customerTier: 'Regular',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201',
      numberOfTickets: 1
    });

    const slaCaseID = slaCaseRes.body.data.bookingID;

    // Select seat B3
    await makeRequest('POST', `/api/cases/${slaCaseID}/select-seats`, {
      selectedSeats: ['B3']
    });

    // Fast-forward SLA expiration (simulate 10-minute deadline elapsed)
    const expireRes = await makeRequest('POST', `/api/cases/${slaCaseID}/expire-sla`);

    assert(expireRes.status === 200, 'SLA expiry endpoint HTTP 200');
    assert(expireRes.body.data.isAlternateStage === true, 'Case routed to an Alternate Stage');
    assert(expireRes.body.data.caseStatus === 'Resolved-Timeout', 'Status updated to "Resolved-Timeout"');
    assert(expireRes.body.data.urgency === 60, 'Case urgency incremented to 60 (Deadline passed)');

    // Verify seat B3 was released back to Available
    const seatsCheck = await makeRequest('GET', '/api/shows/SH-201/seats');
    const b3Seat = seatsCheck.body.data.seats.find(s => s.seatNumber === 'B3');
    assert(b3Seat.seatStatus === 'Available', 'Timed-out seat B3 released back to "Available"');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST 5: Alternate Stage: Customer Cancellation
    // -------------------------------------------------------------
    console.log('▶ TEST 5: Alternate Stage: Cancellation Flow');

    const cancelCaseRes = await makeRequest('POST', '/api/cases', {
      customerName: 'Divya Nair',
      email: 'divya@example.com',
      mobileNumber: '9855566677',
      customerTier: 'Gold',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201',
      numberOfTickets: 1
    });

    const cancelID = cancelCaseRes.body.data.bookingID;

    await makeRequest('POST', `/api/cases/${cancelID}/select-seats`, {
      selectedSeats: ['B4']
    });

    const cancelDecisionRes = await makeRequest('POST', `/api/cases/${cancelID}/confirm`, {
      decision: 'CANCEL'
    });

    assert(cancelDecisionRes.status === 200, 'Customer cancel HTTP 200');
    assert(cancelDecisionRes.body.data.isAlternateStage === true, 'Cancellation marked as Alternate Stage');
    assert(cancelDecisionRes.body.data.caseStatus === 'Cancelled', 'Status updated to "Cancelled"');

    console.log('\n----------------------------------------------------------------');

    // -------------------------------------------------------------
    // TEST 6: Pega Major Ruleset Skim (01-01-01 -> 02-01-01)
    // -------------------------------------------------------------
    console.log('▶ TEST 6: Pega Major Ruleset Skim Simulator');

    const skimRes = await makeRequest('POST', '/api/admin/major-skim');
    assert(skimRes.status === 200, 'Major skim endpoint HTTP 200');
    assert(skimRes.body.data.majorVersion === '02', 'Major version bumped to 02');
    assert(skimRes.body.data.rulesetVersion === 'CineWave:02-01-01', 'Ruleset version updated to CineWave:02-01-01');
    assert(skimRes.body.data.applicationVersion === '02.01.01', 'Application version elevated to 02.01.01');

    // Verify next booking receives the new Major ruleset version!
    const postSkimCase = await makeRequest('POST', '/api/cases', {
      customerName: 'Sneha Patel',
      email: 'sneha@example.com',
      mobileNumber: '9812345678',
      customerTier: 'Regular',
      movieID: 'MOV-101',
      theatreID: 'TH-01',
      showID: 'SH-201',
      numberOfTickets: 1
    });

    assert(postSkimCase.body.data.rulesetVersion === 'CineWave:02-01-01', 'New case inherits new Major Ruleset version CineWave:02-01-01');

    console.log('\n================================================================');
    console.log(`TEST EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    if (failedCount === 0) {
      console.log('🎉 All Pega Major architecture scenarios verified successfully!');
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

// Start test runner
const app = require('./server.js');
setTimeout(() => {
  runAllTests();
}, 1000);
