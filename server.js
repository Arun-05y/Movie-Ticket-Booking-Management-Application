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

let db = {
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

// Seed sample historical bookings
const sampleHistoricalBooking = {
  bookingID: 'CW-10000',
  caseID: 'CW-10000',
  caseStatus: 'Completed',
  currentStage: 'Stage 6 – Case Completion',
  stageNumber: 6,
  customer: {
    customerID: 'CUST-901',
    customerName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    mobileNumber: '9876543210'
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
  bookingDate: '2026-09-18T14:30:00.000Z',
  confirmationDate: '2026-09-18T14:32:00.000Z',
  history: [
    { timestamp: '2026-09-18T14:30:00.000Z', action: 'Case Created', status: 'Booking Requested', user: 'Priya Sharma' },
    { timestamp: '2026-09-18T14:31:00.000Z', action: 'Seats Selected [A1, A2]', status: 'Availability Checked', user: 'Priya Sharma' },
    { timestamp: '2026-09-18T14:32:00.000Z', action: 'Customer Confirmation Received', status: 'Awaiting Customer Confirmation', user: 'Priya Sharma' },
    { timestamp: '2026-09-18T14:32:10.000Z', action: 'Booking Processed & Seats Reserved', status: 'Confirmed', user: 'System' },
    { timestamp: '2026-09-18T14:32:15.000Z', action: 'Email Notification Sent', status: 'Notification Sent', user: 'System' },
    { timestamp: '2026-09-18T14:32:20.000Z', action: 'Case Resolved-Completed', status: 'Completed', user: 'System' }
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

// Helper: Calculate available seats for a show
function getShowAvailableSeatsCount(showID) {
  const seats = db.seatsByShow[showID] || [];
  return seats.filter(s => s.seatStatus === 'Available').length;
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// --- Master Data Endpoints (Pega Data Pages / Data Types) ---

// D_MovieList
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

// D_TheatreList
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

// D_ShowList
app.get('/api/shows', (req, res) => {
  const { movieID, theatreID, date } = req.query;
  let list = db.shows.map(show => {
    return {
      ...show,
      availableSeats: getShowAvailableSeatsCount(show.showID)
    };
  });

  if (movieID) {
    list = list.filter(s => s.movieID === movieID);
  }
  if (theatreID) {
    list = list.filter(s => s.theatreID === theatreID);
  }
  if (date) {
    list = list.filter(s => s.showDate === date);
  }

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
  // generate seats
  db.seatsByShow[showID] = generateStandardSeats(showID);
  saveData();

  res.json({ success: true, data: { ...newShow, availableSeats: theatre.totalSeats } });
});

// D_SeatAvailability by showID
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

// --- Pega Case Lifecycle Engine (Case Type: Movie Ticket Booking) ---

// STAGE 1: Booking Request (Create Case)
app.post('/api/cases', (req, res) => {
  const {
    customerName,
    email,
    mobileNumber,
    movieID,
    theatreID,
    showID,
    numberOfTickets
  } = req.body;

  // Business Rule 1: Validate mandatory fields
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

  // Create unique Booking ID (Prefix: CW-XXXXX)
  const bookingID = `CW-${db.caseCounter++}`;
  const now = new Date().toISOString();

  // Total Amount Calculation (Business Rule 6)
  const ticketPrice = show.ticketPrice;
  const totalAmount = ticketsCount * ticketPrice;

  const newCase = {
    bookingID,
    caseID: bookingID,
    caseType: 'Movie Ticket Booking',
    caseStatus: 'Booking Requested', // Initial status
    currentStage: 'Stage 1 – Booking Request',
    stageNumber: 1,
    customer: {
      customerID: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName,
      email,
      mobileNumber
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
    ticketPrice,
    totalAmount,
    bookingDate: now,
    confirmationDate: null,
    history: [
      {
        timestamp: now,
        action: 'Case Created',
        status: 'Booking Requested',
        user: customerName,
        details: `Booking Request created for ${movie.movieName} at ${theatre.theatreName}. Tickets: ${ticketsCount}`
      }
    ]
  };

  db.cases.unshift(newCase);
  saveData();

  res.json({
    success: true,
    message: `Case ${bookingID} initiated successfully with status 'Booking Requested'`,
    data: newCase
  });
});

// STAGE 2: Check Show & Seat Availability -> Select Seats
app.post('/api/cases/:id/select-seats', (req, res) => {
  const { id } = req.params;
  const { selectedSeats } = req.body;

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (caseObj.caseStatus === 'Cancelled' || caseObj.caseStatus === 'Completed') {
    return res.status(400).json({ success: false, message: `Cannot modify a case that is already ${caseObj.caseStatus}` });
  }

  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return res.status(400).json({ success: false, message: 'No seats selected' });
  }

  // Business Rule 2: Selected seats must equal tickets requested
  if (selectedSeats.length !== caseObj.numberOfTickets) {
    return res.status(400).json({
      success: false,
      message: `Validation Error: Selected seats count (${selectedSeats.length}) must equal requested tickets (${caseObj.numberOfTickets}).`
    });
  }

  // Business Rule 3 & 8: Only available seats can be selected; seat cannot be booked twice
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

  // Update Case
  caseObj.selectedSeats = selectedSeats;
  caseObj.caseStatus = 'Availability Checked';
  caseObj.currentStage = 'Stage 2 – Check Show & Seat Availability';
  caseObj.stageNumber = 2;

  const now = new Date().toISOString();
  caseObj.history.push({
    timestamp: now,
    action: 'Seats Selected & Availability Checked',
    status: 'Availability Checked',
    user: caseObj.customer.customerName,
    details: `Selected seats: ${selectedSeats.join(', ')} for Show ${caseObj.show.showID}`
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
    details: `Booking summary prepared. Total Amount: ₹${caseObj.totalAmount}`
  });

  saveData();

  res.json({
    success: true,
    message: `Seats confirmed and validated. Case advanced to 'Awaiting Customer Confirmation'`,
    data: caseObj
  });
});

// STAGE 3 -> 4 -> 5 -> 6: Customer Decision (Confirm or Cancel)
app.post('/api/cases/:id/confirm', (req, res) => {
  const { id } = req.params;
  const { decision } = req.body; // 'CONFIRM' or 'CANCEL'

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (caseObj.caseStatus === 'Cancelled' || caseObj.caseStatus === 'Completed') {
    return res.status(400).json({
      success: false,
      message: `Case is already finalized with status '${caseObj.caseStatus}'`
    });
  }

  const now = new Date().toISOString();

  // Business Rule 5: If customer cancels before final confirmation
  if (decision === 'CANCEL') {
    caseObj.caseStatus = 'Cancelled';
    caseObj.currentStage = 'Stage 4 – Booking Processing (Cancelled)';
    caseObj.stageNumber = 4;
    caseObj.history.push({
      timestamp: now,
      action: 'Customer Cancelled Booking',
      status: 'Cancelled',
      user: caseObj.customer.customerName,
      details: 'Customer elected to cancel the booking at Confirmation stage.'
    });

    saveData();

    return res.json({
      success: true,
      message: `Booking ${caseObj.bookingID} has been successfully cancelled.`,
      data: caseObj
    });
  }

  // Customer CONFIRMED
  if (decision === 'CONFIRM') {
    // STAGE 4: Booking Processing
    caseObj.currentStage = 'Stage 4 – Booking Processing';
    caseObj.stageNumber = 4;

    // Verify seats are still available right at execution (concurrency check)
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

    // Business Rule 9: Once booking is confirmed, selected seats must become "Booked"
    caseObj.selectedSeats.forEach(seatNum => {
      const seat = showSeats.find(s => s.seatNumber === seatNum);
      if (seat) {
        seat.seatStatus = 'Booked';
      }
    });

    caseObj.caseStatus = 'Confirmed';
    caseObj.confirmationDate = now;
    caseObj.history.push({
      timestamp: now,
      action: 'Booking Confirmed & Seats Reserved',
      status: 'Confirmed',
      user: 'System',
      details: `Reserved seats: ${caseObj.selectedSeats.join(', ')}. Confirmation Date: ${now}`
    });

    // STAGE 5: Notification (Business Rule 11: Automatically send email notification)
    caseObj.currentStage = 'Stage 5 – Notification';
    caseObj.stageNumber = 5;

    const emailSubject = `Booking Confirmed: CineWave Entertainment [${caseObj.bookingID}]`;
    const emailBody = `Dear ${caseObj.customer.customerName},

Thank you for booking with CineWave Entertainment! Your movie tickets have been confirmed.

==================================================
BOOKING SUMMARY
==================================================
Booking ID:      ${caseObj.bookingID}
Customer:        ${caseObj.customer.customerName}
Movie:           ${caseObj.movie.movieName}
Theatre:         ${caseObj.theatre.theatreName}
Location:        ${caseObj.theatre.location}
Date:            ${caseObj.show.showDate}
Time:            ${caseObj.show.showTime}
Selected Seats:  ${caseObj.selectedSeats.join(', ')}
Total Tickets:   ${caseObj.numberOfTickets}
Ticket Price:    ₹${caseObj.ticketPrice}
Total Amount:    ₹${caseObj.totalAmount}
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
      details: `Sent confirmation email to ${caseObj.customer.email}`
    });

    // STAGE 6: Case Completion
    caseObj.currentStage = 'Stage 6 – Case Completion';
    caseObj.stageNumber = 6;
    caseObj.caseStatus = 'Completed'; // Final Status
    caseObj.history.push({
      timestamp: now,
      action: 'Case Resolved-Completed',
      status: 'Completed',
      user: 'System',
      details: 'All booking stages successfully completed. Booking history archived.'
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

// Staff Action: Cancel a booking
app.post('/api/cases/:id/staff-cancel', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const caseObj = db.cases.find(c => c.bookingID === id || c.caseID === id);
  if (!caseObj) {
    return res.status(404).json({ success: false, message: 'Case not found' });
  }

  if (caseObj.caseStatus === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'Case is already cancelled' });
  }

  // Release seats if they were booked
  const showSeats = db.seatsByShow[caseObj.show.showID] || [];
  caseObj.selectedSeats.forEach(seatNum => {
    const seat = showSeats.find(s => s.seatNumber === seatNum);
    if (seat) {
      seat.seatStatus = 'Available';
    }
  });

  const now = new Date().toISOString();
  caseObj.caseStatus = 'Cancelled';
  caseObj.currentStage = 'Resolved-Cancelled';
  caseObj.history.push({
    timestamp: now,
    action: 'Booking Cancelled by Staff',
    status: 'Cancelled',
    user: 'Staff Operator',
    details: `Cancellation reason: ${reason || 'Customer request / administrative action'}. Seats released: ${caseObj.selectedSeats.join(', ')}`
  });

  saveData();

  res.json({
    success: true,
    message: `Booking ${caseObj.bookingID} cancelled by staff. Seats released.`,
    data: caseObj
  });
});

// Get all cases (with optional filters)
app.get('/api/cases', (req, res) => {
  const { status, email } = req.query;
  let list = db.cases;

  if (status) {
    list = list.filter(c => c.caseStatus.toLowerCase() === status.toLowerCase());
  }
  if (email) {
    list = list.filter(c => c.customer.email.toLowerCase() === email.toLowerCase());
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

// --- Notifications Endpoint ---
app.get('/api/notifications', (req, res) => {
  const { bookingID, email } = req.query;
  let list = db.notifications;
  if (bookingID) {
    list = list.filter(n => n.bookingID === bookingID);
  }
  if (email) {
    list = list.filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());
  }
  res.json({ success: true, data: list });
});

// --- Reporting & Analytics Dashboards (Pega Report Definitions) ---
app.get('/api/reports/dashboard', (req, res) => {
  const totalBookings = db.cases.length;
  const pendingBookings = db.cases.filter(c => ['Booking Requested', 'Availability Checked', 'Awaiting Customer Confirmation'].includes(c.caseStatus)).length;
  const confirmedBookings = db.cases.filter(c => ['Confirmed', 'Completed'].includes(c.caseStatus)).length;
  const cancelledBookings = db.cases.filter(c => c.caseStatus === 'Cancelled').length;

  let totalRevenue = 0;
  db.cases.forEach(c => {
    if (['Confirmed', 'Completed'].includes(c.caseStatus)) {
      totalRevenue += (c.totalAmount || 0);
    }
  });

  // Calculate total available seats across all shows
  let totalAvailableSeats = 0;
  Object.keys(db.seatsByShow).forEach(showId => {
    totalAvailableSeats += getShowAvailableSeatsCount(showId);
  });

  // Bookings by Theatre
  const theatreCounts = {};
  db.cases.forEach(c => {
    const tName = c.theatre.theatreName;
    theatreCounts[tName] = (theatreCounts[tName] || 0) + 1;
  });

  // Bookings by Movie
  const movieCounts = {};
  db.cases.forEach(c => {
    const mName = c.movie.movieName;
    movieCounts[mName] = (movieCounts[mName] || 0) + 1;
  });

  // Bookings by Date
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
      totalRevenue,
      totalAvailableSeats
    },
    bookingsByTheatre: theatreCounts,
    bookingsByMovie: movieCounts,
    bookingsByDate: dateCounts
  });
});

// Reset database endpoint (convenient for testing and labs)
app.post('/api/admin/reset', (req, res) => {
  db = {
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

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎬 CineWave Entertainment Pega Application Server`);
  console.log(`🚀 Running at: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

module.exports = app;
