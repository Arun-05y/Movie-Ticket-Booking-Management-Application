# CineWave Entertainment – Movie Ticket Booking Management
## Comprehensive Pega Platform™ Implementation & Student Lab Guide

**Application Name:** CineWave Entertainment  
**Application Class Structure:** `CW-CineWave-Work-MovieBooking`  
**Case Type:** `Movie Ticket Booking` (Case Prefix: `CW-`)  
**Pega UI Framework:** Pega Theme Cosmos / Constellation  
**Target Audience:** Pega System Architects (CSA / CSSA), Business Architects, and Students  

---

## 1. Project Overview & Business Requirements

CineWave Entertainment manages movie ticket bookings across multiple theatres and locations. Previously, bookings were conducted through offline phone calls and emails, resulting in double-booking errors, lack of visibility into real-time seating availability, and delayed confirmations.

This enterprise Pega application digitizes the complete end-to-end movie ticket booking lifecycle:
1. Customers submit booking requests with contact details and movie preferences.
2. The system checks show schedules and presents real-time seating layouts.
3. Customers confirm their seats and review pricing before final commitment.
4. The system validates seating availability, updates seat records to prevent race conditions, and marks bookings as Confirmed.
5. Automated email correspondence is dispatched to the customer with full ticket vouchers.
6. Staff and operations managers track booking cases, seat occupancy, and revenue reports via a dedicated portal.

---

## 2. Enterprise Class Structure & Naming Conventions

Pega follows an inheritance model. For CineWave Entertainment, configure the following class layers:

| Layer | Class Name | Description |
|---|---|---|
| **Organization Layer** | `CW` | Base organization class |
| **Application Layer** | `CW-CineWave` | Shared application rules and assets |
| **Work Layer (Work Pool)** | `CW-CineWave-Work` | Base work pool for all case types |
| **Case Type Class** | `CW-CineWave-Work-MovieBooking` | The "Movie Ticket Booking" case type |
| **Data Layer** | `CW-CineWave-Data` | Top-level data class |
| **Customer Data** | `CW-CineWave-Data-Customer` | Customer profile attributes |
| **Movie Data** | `CW-CineWave-Data-Movie` | Movie catalog attributes |
| **Theatre Data** | `CW-CineWave-Data-Theatre` | Cinema halls and locations |
| **Show Data** | `CW-CineWave-Data-Show` | Schedules, timings, and ticket prices |
| **Seat Data** | `CW-CineWave-Data-Seat` | Seat numbers, tiers, and statuses |

---

## 3. Data Model & Data Types Setup

Create the following 6 Pega Data Types in **App Studio > Data > Data objects and integrations** or **Dev Studio > Data Types**:

### 3.1 Customer Data Type (`CW-CineWave-Data-Customer`)
| Field Name | Property Name | Type | Key / Required |
|---|---|---|---|
| Customer ID | `.CustomerID` | Text | Key |
| Customer Name | `.CustomerName` | Text | Required |
| Email Address | `.Email` | Email | Required |
| Mobile Number | `.MobileNumber` | Phone | Required |

### 3.2 Movie Data Type (`CW-CineWave-Data-Movie`)
| Field Name | Property Name | Type | Key / Required |
|---|---|---|---|
| Movie ID | `.MovieID` | Text | Key |
| Movie Title | `.MovieName` | Text | Required |
| Language | `.Language` | Text | Required |
| Genre | `.Genre` | Text | Required |
| Duration | `.Duration` | Text | Optional |
| Rating | `.Rating` | Decimal / Text | Optional |
| Poster URL | `.PosterURL` | URL | Optional |

### 3.3 Theatre Data Type (`CW-CineWave-Data-Theatre`)
| Field Name | Property Name | Type | Key / Required |
|---|---|---|---|
| Theatre ID | `.TheatreID` | Text | Key |
| Theatre Name | `.TheatreName` | Text | Required |
| Location | `.Location` | Text | Required |
| Total Seats | `.TotalSeats` | Integer | Required |

### 3.4 Show Data Type (`CW-CineWave-Data-Show`)
| Field Name | Property Name | Type | Key / Required |
|---|---|---|---|
| Show ID | `.ShowID` | Text | Key |
| Movie Reference | `.Movie` | Single Page (`CW-CineWave-Data-Movie`) | Required |
| Theatre Reference | `.Theatre` | Single Page (`CW-CineWave-Data-Theatre`) | Required |
| Show Date | `.ShowDate` | Date | Required |
| Show Time | `.ShowTime` | TimeOfDay / Text | Required |
| Ticket Price | `.TicketPrice` | Currency | Required |
| Available Seats | `.AvailableSeats` | Integer | Calculated |
| Total Seats | `.TotalSeats` | Integer | Required |

### 3.5 Seat Data Type (`CW-CineWave-Data-Seat`)
| Field Name | Property Name | Type | Key / Required |
|---|---|---|---|
| Seat Number | `.SeatNumber` | Text | Key (e.g. A1, B5) |
| Show ID | `.ShowID` | Text | Key |
| Seat Type | `.SeatType` | Picklist (`Standard`, `Premium`, `Recliner`) | Required |
| Seat Status | `.SeatStatus` | Picklist (`Available`, `Booked`, `Reserved`) | Required |

### 3.6 Booking Case Properties (`CW-CineWave-Work-MovieBooking`)
| Field Name | Property Name | Type | Usage |
|---|---|---|---|
| Booking ID | `.BookingID` | Text (pyID) | Auto-generated (`CW-10001`) |
| Customer | `.Customer` | Single Page (`CW-CineWave-Data-Customer`) | Page reference |
| Movie | `.Movie` | Single Page (`CW-CineWave-Data-Movie`) | Page reference |
| Theatre | `.Theatre` | Single Page (`CW-CineWave-Data-Theatre`) | Page reference |
| Show | `.Show` | Single Page (`CW-CineWave-Data-Show`) | Page reference |
| Number of Tickets | `.NumberOfTickets` | Integer | User input (>= 1) |
| Selected Seats | `.SelectedSeats` | Value List (Text) | e.g. `[A3, A4]` |
| Ticket Price | `.TicketPrice` | Currency | Sourced from Show |
| Total Amount | `.TotalAmount` | Currency | Declare Expression |
| Booking Status | `.BookingStatus` | Text (`pyStatusWork`) | Lifecycle status |
| Booking Date | `.BookingDate` | DateTime | Timestamp |
| Confirmation Date | `.ConfirmationDate`| DateTime | Timestamp |
| Customer Decision | `.CustomerDecision` | Text (`CONFIRM` / `CANCEL`) | Radio / Action |

---

## 4. Pega Data Pages Configuration

Data Pages provide declarative, on-demand data caching and retrieval:

1. **`D_MovieList`**:
   - **Scope:** Node / Thread
   - **Object Type:** `CW-CineWave-Data-Movie`
   - **Data Structure:** List
   - **Source:** Lookup or Report Definition on `CW-CineWave-Data-Movie`
   - **Usage:** Populates the movie selection dropdown in Stage 1.

2. **`D_TheatreList`**:
   - **Scope:** Thread
   - **Parameters:** `Location` (Optional)
   - **Source:** Report Definition filtered by `.Location`
   - **Usage:** Populates theatre selection dropdown.

3. **`D_ShowList`**:
   - **Scope:** Thread
   - **Parameters:** `MovieID`, `TheatreID`, `Date`
   - **Source:** Report Definition on `CW-CineWave-Data-Show`
   - **Usage:** Dynamically filters available shows for selected movie and theatre.

4. **`D_SeatAvailability`**:
   - **Scope:** Thread
   - **Parameters:** `ShowID`
   - **Object Type:** `CW-CineWave-Data-Seat`
   - **Data Structure:** List
   - **Source:** Report Definition returning all seats where `.ShowID == param.ShowID`.

---

## 5. Case Life Cycle Configuration

Open **App Studio > Case types > Movie Ticket Booking** or **Dev Studio > Case Type Record**.

Configure the **6 Primary Stages** with their processes and steps:

```
[ Stage 1: Booking Request ]
  └── Process: Collect Customer Details
        └── Step 1: Collect Information (View: EnterBookingDetails)
        └── Step 2: Automation (Data Transform: InitBooking)

[ Stage 2: Check Show & Seat Availability ]
  └── Process: Seat Selection
        └── Step 1: User Action (View: SelectSeatsView)
        └── Step 2: Validate (Validate Rule: ValidateSeatSelection)

[ Stage 3: Customer Confirmation ]
  └── Process: Confirm Or Cancel
        └── Step 1: User Action (View: ReviewBookingSummary)
        └── Step 2: Decision Fork (When: CustomerConfirmed vs CustomerCancelled)

[ Stage 4: Booking Processing ]
  └── Process: Seat Reservation
        └── Step 1: Automation (Data Transform: ReserveSeats OR CancelBooking)
        └── Step 2: Set Case Status ("Confirmed" OR "Cancelled")

[ Stage 5: Notification ]
  └── Process: Send Customer Email
        └── Step 1: Automation (Send Email: BookingConfirmationNotification)

[ Stage 6: Case Completion ]
  └── Process: Resolve Case
        └── Step 1: Update Status ("Completed")
        └── Step 2: Resolution (Resolved-Completed)
```

### 5.1 Detailed Stage Configuration

#### Stage 1: Booking Request
- **Stage Name:** `Booking Request`
- **Initial Case Status:** `Booking Requested`
- **Step 1:** Collect Information (View: `EnterBookingDetails`)
  - Capture `.Customer.CustomerName`, `.Customer.Email`, `.Customer.MobileNumber`
  - Capture `.Movie.MovieID`, `.Theatre.TheatreID`, `.Show.ShowID`, `.NumberOfTickets`
- **Step 2:** Data Transform (`InitBooking`)
  - Set `.BookingDate = @CurrentDateTime()`
  - Set `.TicketPrice = D_ShowList[ShowID:.Show.ShowID].TicketPrice`

#### Stage 2: Check Show & Seat Availability
- **Stage Name:** `Check Show & Seat Availability`
- **Case Status:** `Availability Checked`
- **Step 1:** View `SelectSeatsView`
  - Reference Data Page `D_SeatAvailability[ShowID: .Show.ShowID]`
  - Render seating matrix grid with Row identifiers (A through E) and Seat columns (1 through 10)
  - Color-code seats: Green (Available), Red (Booked), Blue (Selected)
- **Step 2:** Validation Rule (`ValidateSeatSelection`)
  - Check: `LengthOfList(.SelectedSeats) == .NumberOfTickets`
  - Check: None of the selected seats have `.SeatStatus == "Booked"`

#### Stage 3: Customer Confirmation
- **Stage Name:** `Customer Confirmation`
- **Case Status:** `Awaiting Customer Confirmation`
- **Step 1:** View `ReviewBookingSummary`
  - Display read-only summary card: Movie Title, Theatre Name, Location, Show Date/Time, Selected Seats list, Number of Tickets, Ticket Price, and Total Amount.
  - Action buttons / Radio choices:
    - Choice A: `Confirm Booking` (`.CustomerDecision = "CONFIRM"`)
    - Choice B: `Cancel Booking` (`.CustomerDecision = "CANCEL"`)

#### Stage 4: Booking Processing
- **Stage Name:** `Booking Processing`
- **Decision Shape:** Evaluates `.CustomerDecision`
  - **Path A (CONFIRM):**
    - Data Transform: `ReserveSeats` (iterates over `.SelectedSeats` and updates `.SeatStatus = "Booked"`)
    - Set Case Status: `Confirmed`
    - Set `.ConfirmationDate = @CurrentDateTime()`
  - **Path B (CANCEL):**
    - Data Transform: `CancelBooking`
    - Set Case Status: `Cancelled`
    - Resolve Case as `Resolved-Cancelled` (Jump to Stage 6)

#### Stage 5: Notification
- **Stage Name:** `Notification`
- **Condition:** Run only if `.CustomerDecision == "CONFIRM"`
- **Step 1:** Automation `Send Email`
  - **Recipient:** `.Customer.Email`
  - **Subject:** `Booking Confirmed: CineWave Entertainment [.BookingID]`
  - **Correspondence Rule:** `BookingConfirmationNotification` (HTML template with complete booking receipt)

#### Stage 6: Case Completion
- **Stage Name:** `Case Completion`
- **Case Status:** `Completed`
- **Resolution:** `Resolved-Completed`
- **Audit:** Automatic audit entry added to `pyHistory`

---

## 6. Business Rules & Declarative Logic

In **Dev Studio**, create the following business rules:

### 6.1 Declare Expression: Total Amount Calculation
- **Applies To:** `CW-CineWave-Work-MovieBooking`
- **Target Property:** `.TotalAmount`
- **Expression:** `.NumberOfTickets * .TicketPrice`
- **Change Tracking:** Calculate value whenever inputs change (Automatic).

### 6.2 Validate Rule: `ValidateSeatSelection`
- **Applies To:** `CW-CineWave-Work-MovieBooking`
- **Conditions:**
  1. **Seat Count Check:**
     - Expression: `LengthOfList(.SelectedSeats) != .NumberOfTickets`
     - Error Message: *"The number of selected seats must equal the number of requested tickets."*
  2. **Seat Availability Check:**
     - Expression: Iterate `.SelectedSeats`. If seat status is not Available:
     - Error Message: *"One or more selected seats are already booked. Please modify your selection."*

### 6.3 When Rules:
- **`CustomerConfirmed`**: `.CustomerDecision = "CONFIRM"`
- **`CustomerCancelled`**: `.CustomerDecision = "CANCEL"`

---

## 7. Email Correspondence Rule Setup

Create a Correspondence rule in **Dev Studio > Technical > Correspondence**:
- **Name:** `BookingConfirmationNotification`
- **Applies To:** `CW-CineWave-Work-MovieBooking`
- **Correspondence Type:** `EMAIL`
- **Template Body (HTML):**

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #d3dbe3; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #002244; color: #ffffff; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">🎬 CineWave Entertainment</h2>
    <p style="margin: 5px 0 0 0; color: #8bbcef; font-size: 14px;">Movie Ticket Booking Confirmation</p>
  </div>
  <div style="padding: 24px; color: #222222;">
    <p>Dear <strong><pega:reference name=".Customer.CustomerName"/></strong>,</p>
    <p>Your movie ticket booking has been successfully confirmed. Below are your booking details:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Booking ID:</td><td style="padding: 8px; font-weight: bold;"><pega:reference name=".BookingID"/></td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Movie:</td><td style="padding: 8px; font-weight: bold;"><pega:reference name=".Movie.MovieName"/></td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Theatre:</td><td style="padding: 8px; font-weight: bold;"><pega:reference name=".Theatre.TheatreName"/> (<pega:reference name=".Theatre.Location"/>)</td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Show Date & Time:</td><td style="padding: 8px; font-weight: bold;"><pega:reference name=".Show.ShowDate"/> at <pega:reference name=".Show.ShowTime"/></td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Selected Seats:</td><td style="padding: 8px; font-weight: bold; color: #0060cc;"><pega:reference name=".SelectedSeats"/></td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Number of Tickets:</td><td style="padding: 8px; font-weight: bold;"><pega:reference name=".NumberOfTickets"/></td></tr>
      <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px; color: #64748b;">Ticket Price:</td><td style="padding: 8px; font-weight: bold;">₹<pega:reference name=".TicketPrice"/></td></tr>
      <tr style="background-color: #f1f5f9;"><td style="padding: 8px; font-weight: bold; color: #002244;">Total Amount Paid:</td><td style="padding: 8px; font-weight: bold; color: #0060cc; font-size: 16px;">₹<pega:reference name=".TotalAmount"/></td></tr>
      <tr><td style="padding: 8px; color: #64748b;">Status:</td><td style="padding: 8px; font-weight: bold; color: #0d8a43;">Confirmed</td></tr>
    </table>

    <p style="font-size: 12px; color: #64748b;">Please present this digital confirmation or your Booking ID at the cinema entrance. Enjoy the movie!</p>
  </div>
  <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
    &copy; 2026 CineWave Entertainment. All rights reserved.
  </div>
</div>
```

---

## 8. Reports & Analytics Configuration

Create the following Report Definitions in **Dev Studio > Reports > Report Definition** under class `CW-CineWave-Work-MovieBooking`:

1. **`TotalBookingsSummary`**:
   - **Columns:** `.BookingID`, `.Customer.CustomerName`, `.Movie.MovieName`, `.Theatre.TheatreName`, `.TotalAmount`, `.BookingStatus`
   - **Filter:** `.pyStatusWork != ""`

2. **`BookingsByTheatre`**:
   - **Summarized Column:** `Count(.BookingID)`
   - **Group By:** `.Theatre.TheatreName`
   - **Chart:** Vertical Bar Chart

3. **`BookingsByMovie`**:
   - **Summarized Column:** `Count(.BookingID)`
   - **Group By:** `.Movie.MovieName`
   - **Chart:** Pie / Donut Chart

4. **`BookingsByDate`**:
   - **Summarized Column:** `Count(.BookingID)`
   - **Group By:** `Date(.BookingDate)`
   - **Chart:** Trend / Line Chart

---

## 9. Comprehensive Student Lab Test Scenarios

### Scenario 1: Successful End-to-End Booking (Happy Path)
1. **Goal:** Verify complete lifecycle progression from draft request to completed case with notification.
2. **Steps:**
   - Go to Customer Portal > Click **+ New Booking**.
   - Enter Customer Name: `Rahul Verma`, Email: `rahul.verma@example.com`, Mobile: `9845012345`.
   - Select Movie: `Inception`, Theatre: `CineWave Central`, Show: `20-Sep-2026 at 07:30 PM`.
   - Enter Number of Tickets: `2`.
   - Click **Continue to Seat Selection**.
   - In Stage 2, select seats `A3` and `A4`. Verify counter shows `2 / 2 tickets`.
   - Click **Proceed to Confirmation Summary**.
   - In Stage 3, verify summary details: Movie, Theatre, Seats `A3, A4`, Price `₹200`, Total Amount `₹400`.
   - Click **Confirm Booking**.
3. **Expected Results:**
   - Chevron progresses through Processing, Notification, and Completion.
   - Status updates to `Completed`.
   - Case ID generated: `CW-10001`.
   - Audit trail shows: Case Created → Seats Selected → Confirmation Received → Booking Processed → Email Dispatched → Resolved-Completed.
   - Click **View Dispatched Email Notification** to verify email contents.

---

### Scenario 2: Seat Count Mismatch Validation
1. **Goal:** Verify Business Rule 2 (Selected seats must equal requested tickets).
2. **Steps:**
   - Create a booking for `3 tickets`.
   - In Stage 2, select only 2 seats (`B1`, `B2`).
   - Click **Proceed to Confirmation Summary**.
3. **Expected Results:**
   - Pega validation error displays: *"The number of selected seats must equal the number of requested tickets (Selected: 2, Requested: 3)."*
   - System prevents advancing to Stage 3 until exactly 3 seats are selected.

---

### Scenario 3: Already-Booked Seat Selection Prevention
1. **Goal:** Verify Business Rule 3 & 8 (Cannot book an already booked seat).
2. **Steps:**
   - In Show `SH-201`, seat `A1` is already booked (pre-seeded).
   - In Stage 2, attempt to click seat `A1`.
3. **Expected Results:**
   - Seat `A1` is disabled and colored dark gray/red.
   - Alert informs: *"Seat A1 is already booked! Please select an available seat."*
   - Seat cannot be added to selection.

---

### Scenario 4: Customer Cancellation Before Confirmation
1. **Goal:** Verify Business Rule 5 (Customer cancellation releases hold and cancels case).
2. **Steps:**
   - Request 1 ticket for `Inception`.
   - Select seat `B9`.
   - Proceed to Stage 3 (Customer Confirmation Summary).
   - Click **Cancel Booking**.
3. **Expected Results:**
   - Case status immediately transitions to `Cancelled`.
   - Stage 4 shows Cancelled status; Stage 5 notification is bypassed.
   - Seat `B9` remains `Available` for other customers.

---

### Scenario 5: Staff Management & Live Reports Verification
1. **Goal:** Verify Staff Portal dashboards, reports, and administrative seat release.
2. **Steps:**
   - Switch to **Staff Operator Portal** from the top masthead.
   - Review KPI metrics: Total Bookings, Pending, Confirmed, Cancelled, Total Revenue, Available Seats.
   - Inspect **Bookings by Theatre** and **Bookings by Movie** charts.
   - Navigate to **Show Seat Inspector**: select `Inception - CineWave Central` and verify visual seat occupancy rate.
   - Navigate to **Manage Bookings**, locate a confirmed booking, and click **Cancel Booking** as staff.
3. **Expected Results:**
   - Case updates to `Cancelled`.
   - Show seats are immediately freed and available for new bookings.
   - Dashboard KPIs update automatically.
