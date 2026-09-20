# CineWave Entertainment – Movie Ticket Booking Management (Pega Platform™)
### Enterprise Pega Major Architecture ('24.1 Infinity, Theme-Cosmos & Python AI Decisioning)

A complete, enterprise-grade Movie Ticket Booking Management application built according to Pega Platform™ architecture standards, showcasing **Pega Major Architectural Pillars** and **First-Class Python Integration**:

- **Ruleset Major Versioning & Skimming**: Initial Major version `CineWave:01-01-01` with automated Pega Major Skim capabilities to `CineWave:02-01-01`.
- **Enterprise Class Structure (ECS)**: `CW-CineWave-Work-MovieBooking` inheriting from organizational and application base layers.
- **Primary & Alternate Stages**:
  - **Primary Stages 1 to 6**: `Booking Request` &rarr; `Check Availability` &rarr; `Customer Confirmation` &rarr; `Booking Processing` &rarr; `Notification` &rarr; `Case Completion`.
  - **Alternate Stage A: Seat Hold Timeout (SLA Expiry)**: Automatically releases reserved seats and sets status to `Resolved-Timeout` when the 10-minute SLA deadline passes.
  - **Alternate Stage B: Cancellation**: Resolves case as `Cancelled` when customer or manager aborts booking.
- **Service Level Agreements (SLA)**: `SeatHoldSLA` with Goal (5m, urgency +20) and Deadline (10m, urgency +30 and route to Alternate Stage).
- **Pega Decision Tables**: Declarative rule `LookupPricing` evaluating Seat Tier (Standard, Premium, Recliner), Weekend Surcharge, and Membership Discounts (VIP 15%, Gold 25%).
- **Pega Routing & Work Queues**: Direct routing to `pyWorkList` for regular bookings, and automated routing to `StaffReviewQueue@CineWave` for bulk orders (> 4 tickets) requiring Cinema Manager Approval.
- **Pega Prediction Studio & Customer Decision Hub (CDH) in Python**:
  - AI Dynamic Demand Elasticity Model (`pega_prediction_studio.py`).
  - Next-Best-Action (NBA) personalized retention strategy.
- **Pega Python SDK & CLI**: Programmatic `PegaClient` SDK and interactive terminal console (`pega_cli.py`).
- **Pega DX API v2 Python Server**: FastAPI microservice (`pega_app.py`).

---

## 🚀 Quick Start

### Option A: Node.js / Express Server
```bash
npm install
npm start          # Runs at http://localhost:3000
npm test           # Runs 33 Node.js test assertions
```

### Option B: Python FastAPI DX API Server & AI Studio
```bash
python pega_app.py # Runs at http://localhost:8000 (Swagger docs at /docs)
python pega_cli.py # Interactive Pega Terminal Console
python test_pega_python.py # Runs Python automated test suite
```

---

## 📚 Guides & Documentation
- 👉 [**`PEGA_STUDENT_LAB_GUIDE.md`**](./PEGA_STUDENT_LAB_GUIDE.md): Complete Pega App Studio & Dev Studio click-by-click manual.
- 👉 [**`PEGA_PYTHON_INTEGRATION_GUIDE.md`**](./PEGA_PYTHON_INTEGRATION_GUIDE.md): Pega Prediction Studio, CDH Next-Best-Action, DX API v2, and Python SDK guide.
