# CineWave Entertainment – Movie Ticket Booking Management (Pega Platform™)

A complete, enterprise-grade Movie Ticket Booking Management application built according to Pega Platform™ architecture standards.

This repository contains both:
1. **Interactive Pega Cosmos Web Application**: A fully functional, zero-configuration local application mirroring Pega Case Lifecycle stages, customer & staff portals, visual cinema seat selection, business rules, automated email correspondence, and report definitions.
2. **`PEGA_STUDENT_LAB_GUIDE.md`**: A comprehensive, step-by-step Pega implementation manual designed for students and system architects to reproduce this application directly in Pega App Studio and Dev Studio.

---

## 🌟 Key Pega Features Implemented

- **Case Type & Lifecycle**: `Movie Ticket Booking` (`CW-MovieBooking`, Case ID prefix `CW-`).
  - **Stage 1 – Booking Request**: Collect customer contact info, movie, theatre, show time, and ticket quantity. Initial status: `Booking Requested`.
  - **Stage 2 – Check Show & Seat Availability**: Live seat layout matrix (Rows A-E, 1-10). Real-time validation preventing duplicate booking of already reserved seats and enforcing selected seats = requested tickets count. Status: `Availability Checked`.
  - **Stage 3 – Customer Confirmation**: Summary card showing Movie, Theatre, Location, Date/Time, Seats, Price, and Total Amount (`Tickets × TicketPrice`). Customer must Confirm or Cancel. Status: `Awaiting Customer Confirmation`.
  - **Stage 4 – Booking Processing**: Decision shape reserving seats on confirmation, or releasing holds on cancellation. Status: `Confirmed` or `Cancelled`.
  - **Stage 5 – Notification**: Automated correspondence generation (`CorrType: EMAIL`) dispatching receipt to customer email.
  - **Stage 6 – Case Completion**: Resolution as `Resolved-Completed` and audit history logging in `pyHistory`.

- **Pega Data Types**:
  - `Customer` (`CW-CineWave-Data-Customer`): CustomerID, CustomerName, Email, MobileNumber
  - `Movie` (`CW-CineWave-Data-Movie`): MovieID, MovieName, Language, Genre, Duration, Rating
  - `Theatre` (`CW-CineWave-Data-Theatre`): TheatreID, TheatreName, Location, TotalSeats
  - `Show` (`CW-CineWave-Data-Show`): ShowID, Movie, Theatre, ShowDate, ShowTime, TicketPrice, AvailableSeats, TotalSeats
  - `Seat` (`CW-CineWave-Data-Seat`): SeatNumber, SeatType, SeatStatus, ShowID
  - `Booking` (`CW-CineWave-Work-MovieBooking`): BookingID, Customer, Movie, Theatre, SelectedSeats, TotalAmount, Status, Timestamps

- **Pega Portals**:
  - **Customer Portal**: Create new booking cases, review live stage chevrons, track "My Bookings", and view delivered email notifications in the simulated inbox.
  - **Staff Operator Portal**: View booking ledger (All, Pending, Confirmed, Cancelled), cancel bookings administratively, inspect show seating occupancy, manage movies and show schedules, and view report definitions & analytics.

- **Reports & Analytics Dashboard**:
  - KPI Cards: Total Bookings, Pending, Confirmed, Cancelled, Available Seats, Gross Revenue.
  - Pega Report Definition Visualizations: Bookings by Theatre, Bookings by Movie, Bookings by Date.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Application Server
```bash
npm start
```
The server will start on: **`http://localhost:3000`**

Open your browser and navigate to `http://localhost:3000` to interact with the application.

### 3. Run Automated Verification Tests
```bash
npm test
```
This runs `test_scenarios.js` verifying:
1. Successful end-to-end booking (Stages 1-6, status Completed, unique `CW-` ID, seat status update, notification generated).
2. Seat count mismatch validation (Request 3 tickets, select 2 seats -> rejected).
3. Duplicate booking prevention (Cannot select already-booked seats).
4. Cancellation flow (Customer cancels -> status Cancelled, seats remain available).
5. Mandatory field validation.

---

## 📚 Student Lab Guide
For complete click-by-click instructions to build this application in **Pega App Studio** and **Pega Dev Studio**, refer to:
👉 [**`PEGA_STUDENT_LAB_GUIDE.md`**](./PEGA_STUDENT_LAB_GUIDE.md)

---

## 📁 Project Structure

```
d:\MovieS\
├── PEGA_STUDENT_LAB_GUIDE.md   # Complete Pega App Studio/Dev Studio lab manual
├── README.md                   # Project overview and quick start instructions
├── package.json                # Node.js project manifest & dependencies
├── server.js                   # Express server with Pega Case Lifecycle engine & API
├── test_scenarios.js           # Automated test suite covering 5 business scenarios
└── public/
    ├── index.html              # Customer & Staff portal interfaces
    ├── pega-cosmos.css         # Authentic Pega Theme Cosmos design system styling
    └── app.js                  # Frontend controllers for case lifecycle & portals
```
