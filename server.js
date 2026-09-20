const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store with disk persistence for realism
const DATA_FILE = path.join(__dirname, 'data_store.json');

// Pega Major Architecture Configuration
const PEGA_CONFIG = {
  platformVersion: '24.1 Infinity',
  builtOnApplication: 'Theme-Cosmos:05.01',
  applicationName: 'CineWave Entertainment',
  applicationVersion: '01.01.01',
  majorVersion: '01',
  minorVersion: '01',
  patchVersion: '01',
  rulesetName: 'CineWave',
  rulesetVersion: 'CineWave:01-01-01',
  classHierarchy: {
    org: 'CW',
    app: 'CW-CineWave',
    workPool: 'CW-CineWave-Work',
    caseType: 'CW-CineWave-Work-MovieBooking',
    data: 'CW-CineWave-Data'
  },
  accessGroups: [
    { name: 'CineWave:CustomerUser', portal: 'CustomerPortal', role: 'Customer', defaultUrgency: 10 },
    { name: 'CineWave:StaffOperator', portal: 'StaffPortal', role: 'Operator', defaultUrgency: 20 },
    { name: 'CineWave:CinemaManager', portal: 'StaffPortal', role: 'Manager', defaultUrgency: 30 }
  ]
};

// Default Seed Data
const DEFAULT_MOVIES = [
  {
    movieID: 'MOV-101',
    movieName: 'Inception',
    language: 'English',
    genre: 'Sci-Fi / Thriller',
    duration: '148 mins',
    rating: '8.8/10',
    posterURL: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology.'
  },
  {
    movieID: 'MOV-102',
    movieName: 'Interstellar',
    language: 'English',
    genre: 'Sci-Fi / Adventure',
    duration: '169 mins',
    rating: '8.7/10',
    posterURL: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
    description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft.'
  },
  {
    movieID: 'MOV-103',
    movieName: 'Avatar: The Way of Water',
    language: 'English / Hindi',
    genre: 'Action / Sci-Fi',
    duration: '192 mins',
    rating: '7.6/10',
    posterURL: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
    description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.'
  },
  {
    movieID: 'MOV-104',
    movieName: 'Leo',
    language: 'Tamil / Telugu',
    genre: 'Action / Crime',
    duration: '164 mins',
    rating: '7.9/10',
    posterURL: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&q=80',
    description: 'A cafe owner becomes a local hero, but events unravel bringing figures from his past.'
  }
];

const DEFAULT_THEATRES = [
  {
    theatreID: 'TH-01',
    theatreName: 'CineWave Central',
    location: 'Chennai',
    totalSeats: 50
  },
  {
    theatreID: 'TH-02',
    theatreName: 'CineWave IMAX',
    location: 'Bangalore',
    totalSeats: 50
  },
  {
    theatreID: 'TH-03',
    theatreName: 'CineWave Luxe',
    location: 'Mumbai',
    totalSeats: 50
  }
];

const DEFAULT_SHOWS = [
  {
    showID: 'SH-201',
    movieID: 'MOV-101',
    movieName: 'Inception',
    theatreID: 'TH-01',
    theatreName: 'CineWave Central',
    location: 'Chennai',
    showDate: '2026-09-20',
    showTime: '07:30 PM',
    ticketPrice: 200,
    totalSeats: 50
  },
  {
    showID: 'SH-202',
    movieID: 'MOV-101',
    movieName: 'Inception',
    theatreID: 'TH-01',
    theatreName: 'CineWave Central',
    location: 'Chennai',
    showDate: '2026-09-20',
    showTime: '10:15 PM',
    ticketPrice: 200,
    totalSeats: 50
  },
  {
    showID: 'SH-203',
    movieID: 'MOV-102',
    movieName: 'Interstellar',
    theatreID: 'TH-02',
    theatreName: 'CineWave IMAX',
    location: 'Bangalore',
    showDate: '2026-09-20',
    showTime: '06:00 PM',
    ticketPrice: 250,
    totalSeats: 50
  },
  {
    showID: 'SH-204',
    movieID: 'MOV-103',
    movieName: 'Avatar: The Way of Water',
    theatreID: 'TH-03',
    theatreName: 'CineWave Luxe',
    location: 'Mumbai',
    showDate: '2026-09-21',
    showTime: '08:00 PM',
    ticketPrice: 300,
    totalSeats: 50
  },
  {
    showID: 'SH-205',
    movieID: 'MOV-104',
    movieName: 'Leo',
    theatreID: 'TH-01',
    theatreName: 'CineWave Central',
    location: 'Chennai',
    showDate: '2026-09-21',
    showTime: '06:30 PM',
    ticketPrice: 220,
    totalSeats: 50
  }
];

// Generate standard seat layout: Rows A-E, 1-10
function generateStandardSeats(showID) {
  const seats = [];
  const rows = [
    { letter: 'A', type: 'Standard' },
    { letter: 'B', type: 'Standard' },
    { letter: 'C', type: 'Premium' },
    { letter: 'D', type: 'Premium' },
    { letter: 'E', type: 'Recliner' }
  ];

  rows.forEach(row => {
    for (let i = 1; i <= 10; i++) {
      const seatNumber = `${row.letter}${i}`;
      seats.push({
        seatNumber,
        seatType: row.type,
        seatStatus: 'Available', // Available, Booked, Reserved
        showID
      });
    }
  });

  return seats;
}

// Pre-seeded booked seats for SH-201
function seedInitialBookedSeats(seats, showID) {
  if (showID === 'SH-201') {
    const preBooked = ['A1', 'A2', 'B5', 'C7', 'C8'];
    seats.forEach(s => {
      if (preBooked.includes(s.seatNumber)) {
        s.seatStatus = 'Booked';
      }
    });
  }
  return seats;
}

// Pega Decision Table Engine: LookupTicketPriceAndDiscount
function evaluatePegaDecisionTable(seatType, showDate, customerTier = 'Regular', basePrice = 200) {
  const dateObj = new Date(showDate);
  const day = dateObj.getDay();
  const isWeekend = (day === 0 || day === 6); // Sun = 0, Sat = 6

  let tierSurcharge = 0;
  if (seatType === 'Premium') tierSurcharge = 50;
  else if (seatType === 'Recliner') tierSurcharge = 150;

  let weekendSurge = isWeekend ? 30 : 0;
  let discountPct = 0;

  if (customerTier === 'VIP') discountPct = 15;
  else if (customerTier === 'Gold') discountPct = 25;

  const rawUnit = basePrice + tierSurcharge + weekendSurge;
  const discountAmount = Math.round(rawUnit * (discountPct / 100));
  const finalUnitPrice = rawUnit - discountAmount;

  return {
    seatType,
    isWeekend,
    customerTier,
    basePrice,
    tierSurcharge,
    weekendSurge,
    discountPct,
    discountAmount,
    finalUnitPrice,
    decisionRuleApplied: `Rule-Declare-DecisionTable: LookupPricing [${seatType} | Weekend:${isWeekend} | ${customerTier}]`
  };
}

let db = {
  pegaConfig: { ...PEGA_CONFIG },
  caseCounter: 10001,
  movies: DEFAULT_MOVIES,
  theatres: DEFAULT_THEATRES,
  shows: DEFAULT_SHOWS,
  seatsByShow: {},
  cases: [],
  notifications: []
};

// Initialize seat layouts for shows
DEFAULT_SHOWS.forEach(show => {
  let seats = generateStandardSeats(show.showID);
  seats = seedInitialBookedSeats(seats, show.showID);
  db.seatsByShow[show.showID] = seats;
});

// Seed sample historical booking
const sampleHistoricalBooking = {
  bookingID: 'CW-10000',
  caseID: 'CW-10000',
  caseStatus: 'Completed',
  currentStage: 'Stage 6 – Case Completion',
  stageNumber: 6,
  isAlternateStage: false,
  alternateStageName: null,
  urgency: 10,
  rulesetVersion: 'CineWave:01-01-01',
  customer: {
    customerID: 'CUST-901',
    customerName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    mobileNumber: '9876543210',
    customerTier: 'VIP'
  },
  movie: {
    movieID: 'MOV-101',
    movieName: 'Inception'
  },
  theatre: {
    theatreID: 'TH-01',
    theatreName: 'CineWave Central',
    location: 'Chennai'
  },
  show: {
    showID: 'SH-201',
    showDate: '2026-09-20',
    showTime: '07:30 PM'
  },
  numberOfTickets: 2,
  selectedSeats: ['A1', 'A2'],
  ticketPrice: 200,
  totalAmount: 400,
  routedTo: 'pyWorkList',
  sla: {
    goalSeconds: 300,
    deadlineSeconds: 600,
    elapsedSeconds: 120,
    status: 'Satisfied'
  },
  bookingDate: '2026-09-18T14:30:00.000Z',
  confirmationDate: '2026-09-18T14:32:00.000Z',
  history: [
    { timestamp: '2026-09-18T14:30:00.000Z', action: 'Case Created (01-01-01)', status: 'Booking Requested', user: 'Priya Sharma', urgency: 10 },
    { timestamp: '2026-09-18T14:31:00.000Z', action: 'Seats Selected [A1, A2]', status: 'Availability Checked', user: 'Priya Sharma', urgency: 10 },
    { timestamp: '2026-09-18T14:32:00.000Z', action: 'Customer Confirmation Received', status: 'Awaiting Customer Confirmation', user: 'Priya Sharma', urgency: 10 },
    { timestamp: '2026-09-18T14:32:10.000Z', action: 'Booking Processed & Seats Reserved', status: 'Confirmed', user: 'System', urgency: 10 },
    { timestamp: '2026-09-18T14:32:15.000Z', action: 'Email Notification Sent', status: 'Notification Sent', user: 'System', urgency: 10 },
    { timestamp: '2026-09-18T14:32:20.000Z', action: 'Case Resolved-Completed', status: 'Completed', user: 'System', urgency: 10 }
  ]
};
db.cases.push(sampleHistoricalBooking);
db.notifications.push({
  notificationID: 'NOTIF-10000',
  bookingID: 'CW-10000',
  recipientEmail: 'priya.sharma@example.com',
  recipientName: 'Priya Sharma',
  subject: 'Booking Confirmed: CineWave Entertainment [CW-10000]',
  bodyText: `Dear Priya Sharma,\n\nYour movie ticket booking is confirmed!\n\nBooking ID: CW-10000\nMovie: Inception\nTheatre: CineWave Central (Chennai)\nDate & Time: 20-Sep-2026 at 07:30 PM\nSeats: A1, A2 (2 Tickets)\nTotal Amount: ₹400\nStatus: Confirmed\n\nThank you for choosing CineWave Entertainment!`,
  sentAt: '2026-09-18T14:32:15.000Z'
});

// Load persisted data if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    db = loaded;
    if (!db.pegaConfig) db.pegaConfig = { ...PEGA_CONFIG };
    console.log('Loaded database from', DATA_FILE);
  } catch (err) {
    console.error('Error loading db file, using in-memory defaults:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save data file:', err);
  }
}

function getShowAvailableSeatsCount(showID) {
  const seats = db.seatsByShow[showID] || [];
  return seats.filter(s => s.seatStatus === 'Available').length;
}

// -------------------------------------------------------------
// PEGA MAJOR ARCHITECTURE ENDPOINTS
// -------------------------------------------------------------

// Pega Major Version Metadata & Architecture
app.get('/api/pega/version', (req, res) => {
  res.json({
    success: true,
    data: db.pegaConfig,
    activeCasesCount: db.cases.filter(c => !['Completed', 'Cancelled', 'Resolved-Timeout'].includes(c.caseStatus)).length,
    totalCasesCount: db.cases.length
  });
});

// Pega Decision Table Evaluation Endpoint
app.post('/api/pega/evaluate-decision-table', (req, res) => {
  const { seatType, showDate, customerTier, basePrice } = req.body;
  const result = evaluatePegaDecisionTable(seatType || 'Standard', showDate || '2026-09-20', customerTier || 'Regular', basePrice || 200);
  res.json({ success: true, data: result });
});

// Pega Major Ruleset Skim (Skim from 01-01-XX to 02-01-01)
app.post('/api/admin/major-skim', (req, res) => {
  const oldMajor = db.pegaConfig.majorVersion;
  const newMajorNum = parseInt(oldMajor, 10) + 1;
  const newMajor = String(newMajorNum).padStart(2, '0');

  db.pegaConfig.majorVersion = newMajor;
  db.pegaConfig.minorVersion = '01';
  db.pegaConfig.patchVersion = '01';
  db.pegaConfig.applicationVersion = `${newMajor}.01.01`;
  db.pegaConfig.rulesetVersion = `${db.pegaConfig.rulesetName}:${newMajor}-01-01`;

  // Audit history log entry in system
  const now = new Date().toISOString();
  saveData();

  res.json({
    success: true,
    message: `Pega Major Ruleset Skim completed successfully! Ruleset upgraded from ${oldMajor}-01-01 to ${newMajor}-01-01.`,
    data: db.pegaConfig
  });
});

// -------------------------------------------------------------
// MASTER DATA ENDPOINTS (Pega Data Pages / Data Types)
// -------------------------------------------------------------

app.get('/api/movies', (req, res) => {
  res.json({ success: true, data: db.movies });
});

app.post('/api/movies', (req, res) => {
  const { movieName, language, genre, duration, rating, posterURL, description } = req.body;
  if (!movieName || !language || !genre) {
    return res.status(400).json({ success: false, message: 'Missing required movie fields' });
  }
  const movieID = `MOV-${100 + db.movies.length + 1}`;
  const newMovie = {
    movieID,
    movieName,
    language,
    genre,
    duration: duration || '120 mins',
    rating: rating || '8.0/10',
    posterURL: posterURL || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80',
    description: description || ''
  };
  db.movies.push(newMovie);
  saveData();
  res.json({ success: true, data: newMovie });
});

app.get('/api/theatres', (req, res) => {
  const { location } = req.query;
  let list = db.theatres;
  if (location) {
    list = list.filter(t => t.location.toLowerCase() === location.toLowerCase());
  }
  res.json({ success: true, data: list });
});

app.post('/api/theatres', (req, res) => {
  const { theatreName, location, totalSeats } = req.body;
  if (!theatreName || !location) {
    return res.status(400).json({ success: false, message: 'Missing required theatre fields' });
  }
  const theatreID = `TH-${String(db.theatres.length + 1).padStart(2, '0')}`;
  const newTheatre = {
    theatreID,
    theatreName,
    location,
    totalSeats: parseInt(totalSeats) || 50
  };
  db.theatres.push(newTheatre);
  saveData();
  res.json({ success: true, data: newTheatre });
});

app.get('/api/shows', (req, res) => {
  const { movieID, theatreID, date } = req.query;
  let list = db.shows.map(show => {
    return {
      ...show,
      availableSeats: getShowAvailableSeatsCount(show.showID)
    };
  });

  if (movieID) list = list.filter(s => s.movieID === movieID);
  if (theatreID) list = list.filter(s => s.theatreID === theatreID);
  if (date) list = list.filter(s => s.showDate === date);

  res.json({ success: true, data: list });
});

app.post('/api/shows', (req, res) => {
  const { movieID, theatreID, showDate, showTime, ticketPrice } = req.body;
  const movie = db.movies.find(m => m.movieID === movieID);
  const theatre = db.theatres.find(t => t.theatreID === theatreID);

  if (!movie || !theatre || !showDate || !showTime || !ticketPrice) {
    return res.status(400).json({ success: false, message: 'Invalid or missing show parameters' });
  }

  const showID = `SH-${200 + db.shows.length + 1}`;
  const newShow = {
    showID,
    movieID: movie.movieID,
    movieName: movie.movieName,
    theatreID: theatre.theatreID,
    theatreName: theatre.theatreName,
    location: theatre.location,
    showDate,
    showTime,
    ticketPrice: parseFloat(ticketPrice),
    totalSeats: theatre.totalSeats || 50
  };

  db.shows.push(newShow);
  db.seatsByShow[showID] = generateStandardSeats(showID);
  saveData();

  res.json({ success: true, data: { ...newShow, availableSeats: theatre.totalSeats } });
});

app.get('/api/shows/:showID/seats', (req, res) => {
  const { showID } = req.params;
  const show = db.shows.find(s => s.showID === showID);
  if (!show) {
    return res.status(404).json({ success: false, message: 'Show not found' });
  }

  if (!db.seatsByShow[showID]) {
    db.seatsByShow[showID] = generateStandardSeats(showID);
    saveData();
  }

  const seats = db.seatsByShow[showID];
  const availableCount = seats.filter(s => s.seatStatus === 'Available').length;

  res.json({
    success: true,
    data: {
      show,
      totalSeats: seats.length,
      availableSeats: availableCount,
      seats
    }
  });
});

// -------------------------------------------------------------
// PEGA CASE LIFECYCLE (PRIMARY & ALTERNATE STAGES)
// -------------------------------------------------------------

// STAGE 1: Booking Request
app.post('/api/cases', (req, res) => {
  const {
    customerName,
    email,
    mobileNumber,
    customerTier,
    movieID,
    theatreID,
    showID,
    numberOfTickets
  } = req.body;

  // Validation
  const missingFields = [];
  if (!customerName || customerName.trim() === '') missingFields.push('Customer Name');
  if (!email || email.trim() === '') missingFields.push('Email');
  if (!mobileNumber || mobileNumber.trim() === '') missingFields.push('Mobile Number');
  if (!movieID) missingFields.push('Movie');
  if (!theatreID) missingFields.push('Theatre');
  if (!showID) missingFields.push('Show Date & Time');
  if (!numberOfTickets || parseInt(numberOfTickets) < 1) missingFields.push('Number of Tickets (must be >= 1)');

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Mandatory field validation failed: ${missingFields.join(', ')}`
    });
  }

  const movie = db.movies.find(m => m.movieID === movieID);
  const theatre = db.theatres.find(t => t.theatreID === theatreID);
  const show = db.shows.find(s => s.showID === showID);

  if (!movie || !theatre || !show) {
    return res.status(400).json({ success: false, message: 'Referenced Movie, Theatre, or Show does not exist' });
  }

  const ticketsCount = parseInt(numberOfTickets);
  const availableSeats = getShowAvailableSeatsCount(showID);

  if (ticketsCount > availableSeats) {
    return res.status(400).json({
      success: false,
      message: `Requested tickets (${ticketsCount}) exceed available seats (${availableSeats}) for this show.`
    });
  }

  // Pega Routing Rule: If tickets > 4, route to Manager Work Queue
  const requiresManagerApproval = ticketsCount > 4;
  const initialStatus = requiresManagerApproval ? 'Pending-ManagerApproval' : 'Booking Requested';
  const initialRoute = requiresManagerApproval ? 'StaffReviewQueue@CineWave' : 'pyWorkList';

  const bookingID = `CW-${db.caseCounter++}`;
  const now = new Date().toISOString();

  // Evaluate Decision Table for Initial Unit Price
  const dtEval = evaluatePegaDecisionTable('Standard', show.showDate, customerTier || 'Regular', show.ticketPrice);
  const unitPrice = dtEval.finalUnitPrice;
  const totalAmount = ticketsCount * unitPrice;

  const newCase = {
    bookingID,
    caseID: bookingID,
    caseType: 'Movie Ticket Booking',
    caseStatus: initialStatus,
    currentStage: 'Stage 1 – Booking Request',
    stageNumber: 1,
    isAlternateStage: false,
    alternateStageName: null,
    urgency: 10,
    rulesetVersion: db.pegaConfig.rulesetVersion,
    requiresManagerApproval,
    managerApprovalStatus: requiresManagerApproval ? 'Pending' : 'N/A',
    routedTo: initialRoute,
    customer: {
      customerID: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      email,
      mobileNumber,
      customerTier: customerTier || 'Regular'
    },
    movie: {
      movieID: movie.movieID,
      movieName: movie.movieName,
      genre: movie.genre,
      language: movie.language,
      duration: movie.duration
    },
    theatre: {
      theatreID: theatre.theatreID,
      theatreName: theatre.theatreName,
      location: theatre.location
    },
    show: {
      showID: show.showID,
      showDate: show.showDate,
      showTime: show.showTime
    },
    numberOfTickets: ticketsCount,
    selectedSeats: [],
    basePrice: show.ticketPrice,
    ticketPrice: unitPrice,
    totalAmount,
    decisionTableAudit: dtEval,
    sla: {
      goalSeconds: 300,       // Goal: 5 mins -> Urgency +20
      deadlineSeconds: 600,   // Deadline: 10 mins -> Urgency +30, Route to Alternate Stage
      startTime: now,
      status: 'Active'
    },
    bookingDate: now,
    confirmationDate: null,
    history: [
      {
        timestamp: now,
        action: `Case Created (${db.pegaConfig.rulesetVersion})`,
        status: initialStatus,
        user: customerName,
        urgency: 10,
        details: requiresManagerApproval
          ? `Bulk Booking (${ticketsCount} tickets) routed to StaffReviewQueue@CineWave for Manager Approval.`
          : `Booking Request created for ${movie.movieName} at ${theatre.theatreName}. Tickets: ${ticketsCount}`
      }
    ]
  };

  db.cases.unshift(newCase);
  saveData();

  res.json({
    success: true,
    message: `Case ${bookingID} initiated in Ruleset ${db.pegaConfig.rulesetVersion} with status '${initialStatus}'`,
    data: newCase
  });
});

// Pega Work Queue Action: Manager Review for Bulk Bookings
app.post('/api/cases/:id/manager-review', (req, res) => {
  const { id } = req.params;
  const { action, managerNotes } = req.body; // 'APPROVE' or 'REJECT'

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (caseObj.caseStatus !== 'Pending-ManagerApproval') {
    return res.status(400).json({ success: false, message: `Case does not require manager approval (Status: ${caseObj.caseStatus})` });
  }

  const now = new Date().toISOString();

  if (action === 'REJECT') {
    caseObj.isAlternateStage = true;
    caseObj.alternateStageName = 'Alternate Stage: Cancellation (Manager Rejected)';
    caseObj.caseStatus = 'Cancelled';
    caseObj.managerApprovalStatus = 'Rejected';
    caseObj.history.push({
      timestamp: now,
      action: 'Bulk Booking Rejected by Cinema Manager',
      status: 'Cancelled',
      user: 'CinemaManager',
      urgency: caseObj.urgency,
      details: `Manager rejected bulk order: ${managerNotes || 'Exceeds cinema allocation limits'}`
    });
    saveData();
    return res.json({ success: true, message: `Case ${caseObj.bookingID} rejected and routed to Alternate Stage: Cancellation`, data: caseObj });
  }

  // Approved
  caseObj.managerApprovalStatus = 'Approved';
  caseObj.caseStatus = 'Booking Requested';
  caseObj.routedTo = 'pyWorkList';
  caseObj.history.push({
    timestamp: now,
    action: 'Bulk Booking Approved by Cinema Manager',
    status: 'Booking Requested',
    user: 'CinemaManager',
    urgency: caseObj.urgency,
    details: `Manager approved bulk booking (${caseObj.numberOfTickets} tickets). Routed to customer pyWorkList for seat selection.`
  });

  saveData();
  res.json({ success: true, message: `Case ${caseObj.bookingID} approved! Routed to customer worklist.`, data: caseObj });
});

// STAGE 2: Check Show & Seat Availability -> Select Seats & Apply Decision Table
app.post('/api/cases/:id/select-seats', (req, res) => {
  const { id } = req.params;
  const { selectedSeats } = req.body;

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (['Cancelled', 'Completed', 'Resolved-Timeout'].includes(caseObj.caseStatus)) {
    return res.status(400).json({ success: false, message: `Cannot modify a case that is already ${caseObj.caseStatus}` });
  }

  if (caseObj.caseStatus === 'Pending-ManagerApproval') {
    return res.status(400).json({ success: false, message: 'This case is awaiting Cinema Manager approval in StaffReviewQueue.' });
  }

  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return res.status(400).json({ success: false, message: 'No seats selected' });
  }

  if (selectedSeats.length !== caseObj.numberOfTickets) {
    return res.status(400).json({
      success: false,
      message: `Validation Error: Selected seats count (${selectedSeats.length}) must equal requested tickets (${caseObj.numberOfTickets}).`
    });
  }

  const showSeats = db.seatsByShow[caseObj.show.showID] || [];
  const unavailable = [];
  selectedSeats.forEach(seatNum => {
    const found = showSeats.find(s => s.seatNumber === seatNum);
    if (!found || found.seatStatus !== 'Available') {
      unavailable.push(seatNum);
    }
  });

  if (unavailable.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Validation Error: The following seats are already booked or unavailable: ${unavailable.join(', ')}. Please choose other seats.`
    });
  }

  // Detect dominant seat type and re-evaluate Pega Decision Table
  const firstSeat = showSeats.find(s => s.seatNumber === selectedSeats[0]);
  const seatType = firstSeat ? firstSeat.seatType : 'Standard';

  const dtResult = evaluatePegaDecisionTable(
    seatType,
    caseObj.show.showDate,
    caseObj.customer.customerTier,
    caseObj.basePrice || caseObj.ticketPrice
  );

  caseObj.selectedSeats = selectedSeats;
  caseObj.ticketPrice = dtResult.finalUnitPrice;
  caseObj.totalAmount = caseObj.numberOfTickets * dtResult.finalUnitPrice;
  caseObj.decisionTableAudit = dtResult;

  caseObj.caseStatus = 'Availability Checked';
  caseObj.currentStage = 'Stage 2 – Check Show & Seat Availability';
  caseObj.stageNumber = 2;

  const now = new Date().toISOString();
  caseObj.history.push({
    timestamp: now,
    action: `Seats Selected & Decision Table Evaluated (${seatType})`,
    status: 'Availability Checked',
    user: caseObj.customer.customerName,
    urgency: caseObj.urgency,
    details: `Selected seats: ${selectedSeats.join(', ')}. Unit price set to ₹${caseObj.ticketPrice} via Pega Decision Table.`
  });

  // Advance to Stage 3: Awaiting Customer Confirmation
  caseObj.caseStatus = 'Awaiting Customer Confirmation';
  caseObj.currentStage = 'Stage 3 – Customer Confirmation';
  caseObj.stageNumber = 3;
  caseObj.history.push({
    timestamp: now,
    action: 'Ready for Customer Confirmation',
    status: 'Awaiting Customer Confirmation',
    user: 'System',
    urgency: caseObj.urgency,
    details: `Booking summary prepared. Total Amount: ₹${caseObj.totalAmount} (SLA active)`
  });

  saveData();

  res.json({
    success: true,
    message: `Seats confirmed and validated. Case advanced to 'Awaiting Customer Confirmation'`,
    data: caseObj
  });
});

// Pega SLA Engine: Fast-forward / Expire SLA to Alternate Stage: Seat Hold Timeout
app.post('/api/cases/:id/expire-sla', (req, res) => {
  const { id } = req.params;
  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);

  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (['Completed', 'Cancelled', 'Resolved-Timeout'].includes(caseObj.caseStatus)) {
    return res.status(400).json({ success: false, message: `Case is already finalized (${caseObj.caseStatus})` });
  }

  // Release any temporarily held seats
  const showSeats = db.seatsByShow[caseObj.show.showID] || [];
  caseObj.selectedSeats.forEach(seatNum => {
    const seat = showSeats.find(s => s.seatNumber === seatNum);
    if (seat && seat.seatStatus !== 'Booked') {
      seat.seatStatus = 'Available';
    }
  });

  const now = new Date().toISOString();
  caseObj.isAlternateStage = true;
  caseObj.alternateStageName = 'Alternate Stage: Seat Hold Timeout (SLA Expiry)';
  caseObj.caseStatus = 'Resolved-Timeout';
  caseObj.currentStage = 'Alternate Stage: Seat Hold Timeout';
  caseObj.urgency = 60; // Deadline passed urgency
  caseObj.sla.status = 'DeadlinePassed-Expired';

  caseObj.history.push({
    timestamp: now,
    action: 'Pega SLA Deadline Expired (Urgency -> 60)',
    status: 'Resolved-Timeout',
    user: 'Pega SLA Agent (QueueProcessor)',
    urgency: 60,
    details: 'Customer failed to confirm within 10-minute SLA deadline. Case routed to Alternate Stage: Seat Hold Timeout. Held seats released.'
  });

  saveData();

  res.json({
    success: true,
    message: `Pega SLA Deadline elapsed! Case routed to Alternate Stage: Seat Hold Timeout. Status: Resolved-Timeout`,
    data: caseObj
  });
});

// STAGE 3 -> 4 -> 5 -> 6: Customer Decision (Confirm or Cancel)
app.post('/api/cases/:id/confirm', (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (['Cancelled', 'Completed', 'Resolved-Timeout'].includes(caseObj.caseStatus)) {
    return res.status(400).json({
      success: false,
      message: `Case is already finalized with status '${caseObj.caseStatus}'`
    });
  }

  const now = new Date().toISOString();

  // Customer CANCEL -> Route to Alternate Stage: Cancellation
  if (decision === 'CANCEL') {
    caseObj.isAlternateStage = true;
    caseObj.alternateStageName = 'Alternate Stage: Customer Cancellation';
    caseObj.caseStatus = 'Cancelled';
    caseObj.currentStage = 'Alternate Stage: Cancellation';
    caseObj.stageNumber = 4;
    caseObj.sla.status = 'Terminated';
    caseObj.history.push({
      timestamp: now,
      action: 'Customer Cancelled -> Alternate Stage: Cancellation',
      status: 'Cancelled',
      user: caseObj.customer.customerName,
      urgency: caseObj.urgency,
      details: 'Customer elected to cancel the booking at Confirmation stage. Case routed to Alternate Stage: Cancellation.'
    });

    saveData();

    return res.json({
      success: true,
      message: `Booking ${caseObj.bookingID} has been routed to Alternate Stage: Cancellation.`,
      data: caseObj
    });
  }

  // Customer CONFIRMED -> Advance Primary Stages 4, 5, 6
  if (decision === 'CONFIRM') {
    caseObj.currentStage = 'Stage 4 – Booking Processing';
    caseObj.stageNumber = 4;

    const showSeats = db.seatsByShow[caseObj.show.showID] || [];
    const unavailable = [];
    caseObj.selectedSeats.forEach(seatNum => {
      const found = showSeats.find(s => s.seatNumber === seatNum);
      if (!found || found.seatStatus !== 'Available') {
        unavailable.push(seatNum);
      }
    });

    if (unavailable.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Conflict: Seats ${unavailable.join(', ')} were just booked by another user. Please reselect.`
      });
    }

    // Reserve seats
    caseObj.selectedSeats.forEach(seatNum => {
      const seat = showSeats.find(s => s.seatNumber === seatNum);
      if (seat) seat.seatStatus = 'Booked';
    });

    caseObj.caseStatus = 'Confirmed';
    caseObj.confirmationDate = now;
    caseObj.sla.status = 'Satisfied';
    caseObj.history.push({
      timestamp: now,
      action: 'Booking Confirmed & Seats Reserved',
      status: 'Confirmed',
      user: 'System',
      urgency: caseObj.urgency,
      details: `Reserved seats: ${caseObj.selectedSeats.join(', ')}. Ruleset: ${caseObj.rulesetVersion}`
    });

    // STAGE 5: Notification
    caseObj.currentStage = 'Stage 5 – Notification';
    caseObj.stageNumber = 5;

    const emailSubject = `Booking Confirmed: CineWave Entertainment [${caseObj.bookingID}]`;
    const emailBody = `Dear ${caseObj.customer.customerName},

Thank you for booking with CineWave Entertainment (Application Version: ${db.pegaConfig.applicationVersion})! Your movie tickets have been confirmed.

==================================================
BOOKING SUMMARY
==================================================
Booking ID:      ${caseObj.bookingID}
Customer:        ${caseObj.customer.customerName} (${caseObj.customer.customerTier} Member)
Movie:           ${caseObj.movie.movieName}
Theatre:         ${caseObj.theatre.theatreName}
Location:        ${caseObj.theatre.location}
Date:            ${caseObj.show.showDate}
Time:            ${caseObj.show.showTime}
Selected Seats:  ${caseObj.selectedSeats.join(', ')}
Total Tickets:   ${caseObj.numberOfTickets}
Ticket Price:    ₹${caseObj.ticketPrice} (Pega Decision Table Applied)
Total Amount:    ₹${caseObj.totalAmount}
Ruleset:         ${caseObj.rulesetVersion}
Booking Status:  Confirmed
==================================================

Please show this digital confirmation or your Booking ID at the cinema entrance. Enjoy the movie!

Warm regards,
CineWave Entertainment Team`;

    const notificationRecord = {
      notificationID: `NOTIF-${10000 + db.notifications.length + 1}`,
      bookingID: caseObj.bookingID,
      recipientEmail: caseObj.customer.email,
      recipientName: caseObj.customer.customerName,
      subject: emailSubject,
      bodyText: emailBody,
      sentAt: now
    };

    db.notifications.unshift(notificationRecord);

    caseObj.history.push({
      timestamp: now,
      action: 'Email Notification Dispatched',
      status: 'Notification Sent',
      user: 'System (Pega Correspondence)',
      urgency: caseObj.urgency,
      details: `Sent confirmation email to ${caseObj.customer.email}`
    });

    // STAGE 6: Case Completion
    caseObj.currentStage = 'Stage 6 – Case Completion';
    caseObj.stageNumber = 6;
    caseObj.caseStatus = 'Completed';
    caseObj.history.push({
      timestamp: now,
      action: 'Case Resolved-Completed',
      status: 'Completed',
      user: 'System',
      urgency: caseObj.urgency,
      details: `All booking stages completed under Ruleset ${caseObj.rulesetVersion}. Case archived.`
    });

    saveData();

    return res.json({
      success: true,
      message: `Booking ${caseObj.bookingID} confirmed and completed successfully!`,
      data: caseObj,
      notification: notificationRecord
    });
  }

  return res.status(400).json({ success: false, message: "Invalid decision. Must be 'CONFIRM' or 'CANCEL'" });
});

// Staff Action: Cancel a booking (Routes to Alternate Stage: Cancellation)
app.post('/api/cases/:id/staff-cancel', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (['Cancelled', 'Resolved-Timeout'].includes(caseObj.caseStatus)) {
    return res.status(400).json({ success: false, message: 'Case is already cancelled or timed out' });
  }

  const showSeats = db.seatsByShow[caseObj.show.showID] || [];
  caseObj.selectedSeats.forEach(seatNum => {
    const seat = showSeats.find(s => s.seatNumber === seatNum);
    if (seat) seat.seatStatus = 'Available';
  });

  const now = new Date().toISOString();
  caseObj.isAlternateStage = true;
  caseObj.alternateStageName = 'Alternate Stage: Staff Cancellation';
  caseObj.caseStatus = 'Cancelled';
  caseObj.currentStage = 'Alternate Stage: Staff Cancellation';
  caseObj.history.push({
    timestamp: now,
    action: 'Booking Cancelled by Staff -> Alternate Stage',
    status: 'Cancelled',
    user: 'Staff Operator',
    urgency: caseObj.urgency,
    details: `Staff cancellation: ${reason || 'Operator override'}. Seats released: ${caseObj.selectedSeats.join(', ')}`
  });

  saveData();

  res.json({
    success: true,
    message: `Booking ${caseObj.bookingID} cancelled by staff and routed to Alternate Stage. Seats released.`,
    data: caseObj
  });
});

// Get all cases
app.get('/api/cases', (req, res) => {
  const { status, email, workQueue } = req.query;
  let list = db.cases;

  if (status) {
    list = list.filter(c => c.caseStatus.toLowerCase() === status.toLowerCase());
  }
  if (email) {
    list = list.filter(c => c.customer.email.toLowerCase() === email.toLowerCase());
  }
  if (workQueue) {
    list = list.filter(c => c.routedTo === workQueue);
  }

  res.json({ success: true, count: list.length, data: list });
});

// Get case details by ID
app.get('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  const caseNotifications = db.notifications.filter(n => n.bookingID === caseObj.bookingID);

  res.json({
    success: true,
    data: {
      ...caseObj,
      notifications: caseNotifications
    }
  });
});

app.get('/api/notifications', (req, res) => {
  const { bookingID, email } = req.query;
  let list = db.notifications;
  if (bookingID) list = list.filter(n => n.bookingID === bookingID);
  if (email) list = list.filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());
  res.json({ success: true, data: list });
});

// Reporting & Analytics
app.get('/api/reports/dashboard', (req, res) => {
  const totalBookings = db.cases.length;
  const pendingBookings = db.cases.filter(c => ['Booking Requested', 'Availability Checked', 'Awaiting Customer Confirmation', 'Pending-ManagerApproval'].includes(c.caseStatus)).length;
  const confirmedBookings = db.cases.filter(c => ['Confirmed', 'Completed'].includes(c.caseStatus)).length;
  const cancelledBookings = db.cases.filter(c => ['Cancelled', 'Resolved-Timeout'].includes(c.caseStatus)).length;
  const pendingApprovals = db.cases.filter(c => c.caseStatus === 'Pending-ManagerApproval').length;

  let totalRevenue = 0;
  db.cases.forEach(c => {
    if (['Confirmed', 'Completed'].includes(c.caseStatus)) {
      totalRevenue += (c.totalAmount || 0);
    }
  });

  let totalAvailableSeats = 0;
  Object.keys(db.seatsByShow).forEach(showId => {
    totalAvailableSeats += getShowAvailableSeatsCount(showId);
  });

  const theatreCounts = {};
  db.cases.forEach(c => {
    const tName = c.theatre.theatreName;
    theatreCounts[tName] = (theatreCounts[tName] || 0) + 1;
  });

  const movieCounts = {};
  db.cases.forEach(c => {
    const mName = c.movie.movieName;
    movieCounts[mName] = (movieCounts[mName] || 0) + 1;
  });

  const dateCounts = {};
  db.cases.forEach(c => {
    const date = (c.bookingDate || '').split('T')[0] || 'Unknown';
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });

  res.json({
    success: true,
    kpis: {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      pendingApprovals,
      totalRevenue,
      totalAvailableSeats
    },
    bookingsByTheatre: theatreCounts,
    bookingsByMovie: movieCounts,
    bookingsByDate: dateCounts,
    pegaConfig: db.pegaConfig
  });
});

// Admin Reset
app.post('/api/admin/reset', (req, res) => {
  db = {
    pegaConfig: { ...PEGA_CONFIG },
    caseCounter: 10001,
    movies: DEFAULT_MOVIES,
    theatres: DEFAULT_THEATRES,
    shows: DEFAULT_SHOWS,
    seatsByShow: {},
    cases: [sampleHistoricalBooking],
    notifications: [db.notifications[0]]
  };

  DEFAULT_SHOWS.forEach(show => {
    let seats = generateStandardSeats(show.showID);
    seats = seedInitialBookedSeats(seats, show.showID);
    db.seatsByShow[show.showID] = seats;
  });

  saveData();
  res.json({ success: true, message: 'Database reset to default seed state' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🎬 CineWave Entertainment – Pega Major Version ${PEGA_CONFIG.applicationVersion}`);
    console.log(`📦 Ruleset: ${PEGA_CONFIG.rulesetVersion} (Built on ${PEGA_CONFIG.builtOnApplication})`);
    console.log(`🚀 Running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
