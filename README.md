# CineWave Entertainment – Movie Ticket Booking Management (Pega Platform™)
### Enterprise Pega Major Architecture ('24.1 Infinity & Theme-Cosmos)

A complete, enterprise-grade Movie Ticket Booking Management application built according to Pega Platform™ architecture standards, showcasing **Pega Major Architectural Pillars**:

- **Ruleset Major Versioning & Skimming**: Initial Major version `CineWave:01-01-01` with automated Pega Major Skim capabilities to `CineWave:02-01-01`.
- **Enterprise Class Structure (ECS)**: `CW-CineWave-Work-MovieBooking` inheriting from organizational and application base layers.
- **Primary & Alternate Stages**:
  - **Primary Stages 1 to 6**: `Booking Request` &rarr; `Check Availability` &rarr; `Customer Confirmation` &rarr; `Booking Processing` &rarr; `Notification` &rarr; `Case Completion`.
  - **Alternate Stage A: Seat Hold Timeout (SLA Expiry)**: Automatically releases reserved seats and sets status to `Resolved-Timeout` when the 10-minute SLA deadline passes.
  - **Alternate Stage B: Cancellation**: Resolves case as `Cancelled` when customer or manager aborts booking.
- **Service Level Agreements (SLA)**: `SeatHoldSLA` with Goal (5m, urgency +20) and Deadline (10m, urgency +30 and route to Alternate Stage).
- **Pega Decision Tables**: Declarative rule `LookupPricing` evaluating Seat Tier (Standard, Premium, Recliner), Weekend Surcharge, and Membership Discounts (VIP 15%, Gold 25%).
- **Pega Routing & Work Queues**: Direct routing to `pyWorkList` for regular bookings, and automated routing to `StaffReviewQueue@CineWave` for bulk orders (> 4 tickets) requiring Cinema Manager Approval.
- **Role-Based Access Control (RBAC)**: Access Groups for `CustomerUser`, `StaffOperator`, and `CinemaManager`.

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

### 3. Run Automated Pega Major Verification Tests
```bash
npm test
```
Verifies 33 assertions covering:
1. Pega Major Version metadata (`CineWave:01-01-01`).
2. Primary lifecycle with Pega Decision Table pricing.
3. Work Queue routing & Manager Approval for bulk tickets (> 4).
4. SLA Deadline expiry to Alternate Stage: `Seat Hold Timeout`.
5. Customer cancellation to Alternate Stage: `Cancellation`.
6. Pega Major Ruleset Skim (`01-01-01` &rarr; `02-01-01`).

---

## 📚 Student Lab Guide
For complete click-by-click instructions to build this application in **Pega App Studio** and **Pega Dev Studio**, refer to:
👉 [**`PEGA_STUDENT_LAB_GUIDE.md`**](./PEGA_STUDENT_LAB_GUIDE.md)
