// CineWave Entertainment - Pega Theme Cosmos Interactive Client
// Application Class: CW-CineWave-Work-MovieBooking

let currentPortal = 'customer';
let currentCustomerTab = 'new-case';
let currentStaffTab = 'dashboard';

// Master data caches
let cachedMovies = [];
let cachedTheatres = [];
let cachedShows = [];

// Active in-flight case
let currentCase = null;
let currentShowSeatData = null;
let selectedSeatNumbers = [];

// Init on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadMasterData();
  await refreshCustomerData();
  await refreshStaffDashboard();
});

// -------------------------------------------------------------
// Portal & Tab Navigation
// -------------------------------------------------------------
function switchPortal(portal) {
  currentPortal = portal;
  const btnCust = document.getElementById('btnPortalCustomer');
  const btnStaff = document.getElementById('btnPortalStaff');
  const secCust = document.getElementById('customerPortalSection');
  const secStaff = document.getElementById('staffPortalSection');
  const userAvatar = document.getElementById('headerUserAvatar');
  const userName = document.getElementById('headerUserName');
  const userRole = document.getElementById('headerUserRole');

  if (portal === 'customer') {
    btnCust.classList.add('active');
    btnStaff.classList.remove('active');
    secCust.classList.remove('hidden');
    secStaff.classList.add('hidden');
    userAvatar.textContent = 'CU';
    userAvatar.style.background = '#0080ff';
    userName.textContent = 'Arun Kumar';
    userRole.textContent = 'Customer User';
    refreshCustomerData();
  } else {
    btnCust.classList.remove('active');
    btnStaff.classList.add('active');
    secCust.classList.add('hidden');
    secStaff.classList.remove('hidden');
    userAvatar.textContent = 'OP';
    userAvatar.style.background = '#10b981';
    userName.textContent = 'Operator@CineWave';
    userRole.textContent = 'Staff Operator';
    refreshStaffDashboard();
  }
}

function switchCustomerTab(tab) {
  currentCustomerTab = tab;
  ['tabCustomerNew', 'tabCustomerList', 'tabCustomerInbox'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  ['viewCustomerNewCase', 'viewCustomerMyBookings', 'viewCustomerInbox'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  if (tab === 'new-case') {
    document.getElementById('tabCustomerNew').classList.add('active');
    document.getElementById('viewCustomerNewCase').classList.remove('hidden');
  } else if (tab === 'my-bookings') {
    document.getElementById('tabCustomerList').classList.add('active');
    document.getElementById('viewCustomerMyBookings').classList.remove('hidden');
    loadMyBookings();
  } else if (tab === 'inbox') {
    document.getElementById('tabCustomerInbox').classList.add('active');
    document.getElementById('viewCustomerInbox').classList.remove('hidden');
    loadCustomerInbox();
  }
}

function switchStaffTab(tab) {
  currentStaffTab = tab;
  ['tabStaffDashboard', 'tabStaffBookings', 'tabStaffSeats', 'tabStaffMaster'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });
  ['viewStaffDashboard', 'viewStaffBookings', 'viewStaffSeats', 'viewStaffMaster'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  if (tab === 'dashboard') {
    document.getElementById('tabStaffDashboard').classList.add('active');
    document.getElementById('viewStaffDashboard').classList.remove('hidden');
    refreshStaffDashboard();
  } else if (tab === 'bookings') {
    document.getElementById('tabStaffBookings').classList.add('active');
    document.getElementById('viewStaffBookings').classList.remove('hidden');
    loadStaffBookings();
  } else if (tab === 'seats') {
    document.getElementById('tabStaffSeats').classList.add('active');
    document.getElementById('viewStaffSeats').classList.remove('hidden');
    populateInspectorShows();
  } else if (tab === 'master') {
    document.getElementById('tabStaffMaster').classList.add('active');
    document.getElementById('viewStaffMaster').classList.remove('hidden');
    populateStaffMasterForms();
  }
}

// -------------------------------------------------------------
// Load Master Data (Pega Data Pages)
// -------------------------------------------------------------
async function loadMasterData() {
  try {
    const [resMovies, resTheatres, resShows] = await Promise.all([
      fetch('/api/movies').then(r => r.json()),
      fetch('/api/theatres').then(r => r.json()),
      fetch('/api/shows').then(r => r.json())
    ]);

    if (resMovies.success) cachedMovies = resMovies.data;
    if (resTheatres.success) cachedTheatres = resTheatres.data;
    if (resShows.success) cachedShows = resShows.data;

    populateBookingDropdowns();
  } catch (err) {
    console.error('Error loading master data:', err);
  }
}

function populateBookingDropdowns() {
  const selMovie = document.getElementById('selectMovie');
  const selTheatre = document.getElementById('selectTheatre');

  if (selMovie) {
    selMovie.innerHTML = '<option value="">-- Choose Movie --</option>';
    cachedMovies.forEach(m => {
      selMovie.innerHTML += `<option value="${m.movieID}">${m.movieName} (${m.language} - ${m.genre})</option>`;
    });
    // Default selection
    if (cachedMovies.length > 0) selMovie.value = cachedMovies[0].movieID;
  }

  if (selTheatre) {
    selTheatre.innerHTML = '<option value="">-- Choose Theatre --</option>';
    cachedTheatres.forEach(t => {
      selTheatre.innerHTML += `<option value="${t.theatreID}">${t.theatreName} (${t.location})</option>`;
    });
    // Default selection
    if (cachedTheatres.length > 0) selTheatre.value = cachedTheatres[0].theatreID;
  }

  onMovieOrTheatreChanged();
}

function onMovieOrTheatreChanged() {
  const movieID = document.getElementById('selectMovie').value;
  const theatreID = document.getElementById('selectTheatre').value;
  const selShow = document.getElementById('selectShow');

  selShow.innerHTML = '<option value="">-- Choose Show --</option>';

  const filteredShows = cachedShows.filter(s => {
    const matchMovie = !movieID || s.movieID === movieID;
    const matchTheatre = !theatreID || s.theatreID === theatreID;
    return matchMovie && matchTheatre;
  });

  filteredShows.forEach(s => {
    selShow.innerHTML += `<option value="${s.showID}">${s.showDate} @ ${s.showTime} — ₹${s.ticketPrice} (${s.availableSeats} seats left)</option>`;
  });

  if (filteredShows.length > 0) {
    selShow.value = filteredShows[0].showID;
  }
}

// -------------------------------------------------------------
// STAGE 1: Booking Request Submission
// -------------------------------------------------------------
async function handleStage1Submit(e) {
  e.preventDefault();
  const alertDiv = document.getElementById('stage1Alert');
  alertDiv.innerHTML = '';

  const payload = {
    customerName: document.getElementById('inputCustomerName').value.trim(),
    email: document.getElementById('inputCustomerEmail').value.trim(),
    mobileNumber: document.getElementById('inputCustomerPhone').value.trim(),
    movieID: document.getElementById('selectMovie').value,
    theatreID: document.getElementById('selectTheatre').value,
    showID: document.getElementById('selectShow').value,
    numberOfTickets: parseInt(document.getElementById('inputTicketsCount').value)
  };

  try {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success) {
      alertDiv.innerHTML = `<div class="pega-alert alert-error">❌ ${data.message}</div>`;
      return;
    }

    currentCase = data.data;
    selectedSeatNumbers = [];

    // Advance UI to Stage 2
    updateCaseHeader();
    await loadStage2SeatLayout();
    transitionToStageView(2);

  } catch (err) {
    alertDiv.innerHTML = `<div class="pega-alert alert-error">❌ Connection error: ${err.message}</div>`;
  }
}

// -------------------------------------------------------------
// STAGE 2: Check Availability & Select Seats
// -------------------------------------------------------------
async function loadStage2SeatLayout() {
  const showID = currentCase.show.showID;
  const res = await fetch(`/api/shows/${showID}/seats`);
  const data = await res.json();

  if (!data.success) {
    alert('Failed to load show seat matrix');
    return;
  }

  currentShowSeatData = data.data;
  selectedSeatNumbers = [];

  document.getElementById('lblTargetTicketsCount').textContent = currentCase.numberOfTickets;
  updateSeatCountBanner();
  renderSeatMatrix();
}

function renderSeatMatrix() {
  const container = document.getElementById('cinemaSeatMatrix');
  container.innerHTML = '';

  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seats = currentShowSeatData.seats;

  rows.forEach(rowLetter => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'seat-row';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowLetter;
    rowDiv.appendChild(label);

    const rowSeats = seats.filter(s => s.seatNumber.startsWith(rowLetter));
    rowSeats.forEach(seat => {
      const seatNode = document.createElement('div');
      seatNode.className = `seat-node ${seat.seatStatus.toLowerCase()}`;
      seatNode.textContent = seat.seatNumber;
      seatNode.dataset.seat = seat.seatNumber;

      if (selectedSeatNumbers.includes(seat.seatNumber)) {
        seatNode.classList.add('selected');
      }

      if (seat.seatStatus === 'Booked') {
        seatNode.title = `Seat ${seat.seatNumber} is already booked!`;
        seatNode.onclick = () => {
          showAlert('stage2Alert', `⚠️ Seat ${seat.seatNumber} is already booked! Please select an available seat.`, 'alert-error');
        };
      } else {
        seatNode.title = `Seat ${seat.seatNumber} (${seat.seatType}) - Click to select`;
        seatNode.onclick = () => toggleSeatSelection(seat.seatNumber);
      }

      rowDiv.appendChild(seatNode);
    });

    container.appendChild(rowDiv);
  });
}

function toggleSeatSelection(seatNumber) {
  const alertDiv = document.getElementById('stage2Alert');
  alertDiv.innerHTML = '';

  const index = selectedSeatNumbers.indexOf(seatNumber);
  if (index > -1) {
    // Unselect
    selectedSeatNumbers.splice(index, 1);
  } else {
    // Select
    if (selectedSeatNumbers.length >= currentCase.numberOfTickets) {
      showAlert('stage2Alert', `⚠️ You requested ${currentCase.numberOfTickets} tickets. Deselect a seat before picking another.`, 'alert-warning');
      return;
    }
    selectedSeatNumbers.push(seatNumber);
  }

  updateSeatCountBanner();
  renderSeatMatrix();
}

function updateSeatCountBanner() {
  const lblSelected = document.getElementById('lblSelectedSeatsCount');
  lblSelected.textContent = selectedSeatNumbers.length;

  const banner = document.getElementById('seatSelectionStatusBanner');
  if (selectedSeatNumbers.length === currentCase.numberOfTickets) {
    banner.className = 'pega-alert alert-success';
  } else {
    banner.className = 'pega-alert alert-info';
  }
}

async function handleStage2Submit() {
  const alertDiv = document.getElementById('stage2Alert');
  alertDiv.innerHTML = '';

  if (selectedSeatNumbers.length !== currentCase.numberOfTickets) {
    showAlert('stage2Alert', `❌ Pega Validation Rule: You must select exactly ${currentCase.numberOfTickets} seats. Currently selected: ${selectedSeatNumbers.length}.`, 'alert-error');
    return;
  }

  try {
    const res = await fetch(`/api/cases/${currentCase.bookingID}/select-seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedSeats: selectedSeatNumbers })
    });
    const data = await res.json();

    if (!data.success) {
      showAlert('stage2Alert', `❌ ${data.message}`, 'alert-error');
      return;
    }

    currentCase = data.data;
    updateCaseHeader();
    populateStage3Summary();
    transitionToStageView(3);

  } catch (err) {
    showAlert('stage2Alert', `❌ Error: ${err.message}`, 'alert-error');
  }
}

function backToStage1() {
  transitionToStageView(1);
}

function backToStage2() {
  transitionToStageView(2);
}

// -------------------------------------------------------------
// STAGE 3: Customer Confirmation Summary
// -------------------------------------------------------------
function populateStage3Summary() {
  document.getElementById('sumBookingID').textContent = currentCase.bookingID;
  document.getElementById('sumCustomerName').textContent = currentCase.customer.customerName;
  document.getElementById('sumCustomerContact').textContent = `${currentCase.customer.email} · ${currentCase.customer.mobileNumber}`;
  document.getElementById('sumMovie').textContent = `${currentCase.movie.movieName} (${currentCase.movie.genre})`;
  document.getElementById('sumTheatre').textContent = `${currentCase.theatre.theatreName} (${currentCase.theatre.location})`;
  document.getElementById('sumShowTime').textContent = `${currentCase.show.showDate} at ${currentCase.show.showTime}`;
  document.getElementById('sumSeats').textContent = currentCase.selectedSeats.join(', ');
  document.getElementById('sumTickets').textContent = currentCase.numberOfTickets;
  document.getElementById('sumPricePerTicket').textContent = `₹${currentCase.ticketPrice}`;
  document.getElementById('sumTotalAmount').textContent = `₹${currentCase.totalAmount} (${currentCase.numberOfTickets} × ₹${currentCase.ticketPrice})`;
}

// -------------------------------------------------------------
// STAGE 4, 5, 6: Customer Decision (Confirm / Cancel)
// -------------------------------------------------------------
async function handleDecision(decision) {
  const alertDiv = document.getElementById('stage3Alert');
  alertDiv.innerHTML = '';

  try {
    const res = await fetch(`/api/cases/${currentCase.bookingID}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision })
    });
    const data = await res.json();

    if (!data.success) {
      showAlert('stage3Alert', `❌ ${data.message}`, 'alert-error');
      return;
    }

    currentCase = data.data;
    updateCaseHeader();

    // Render Stage Final View
    renderFinalCompletionView(decision);
    transitionToStageView('final');

    // Refresh background data
    await loadMasterData();
    await refreshCustomerData();

  } catch (err) {
    showAlert('stage3Alert', `❌ Error: ${err.message}`, 'alert-error');
  }
}

function renderFinalCompletionView(decision) {
  const banner = document.getElementById('finalStatusBanner');
  const btnViewEmail = document.getElementById('btnViewEmailModal');

  if (decision === 'CANCEL') {
    banner.innerHTML = `
      <div class="pega-alert alert-error">
        <div>
          <h3 style="font-size: 16px; margin-bottom: 4px;">❌ Booking Cancelled</h3>
          <p>Case <strong>${currentCase.bookingID}</strong> was cancelled by the customer. Any held seats have been released back to general availability.</p>
        </div>
      </div>
    `;
    btnViewEmail.classList.add('hidden');
  } else {
    banner.innerHTML = `
      <div class="pega-alert alert-success">
        <div>
          <h3 style="font-size: 16px; margin-bottom: 4px;">🎉 Case Completed & Booking Confirmed!</h3>
          <p>Booking ID <strong>${currentCase.bookingID}</strong> is finalized! Seats <strong>${currentCase.selectedSeats.join(', ')}</strong> are reserved. An automated email confirmation has been dispatched to <strong>${currentCase.customer.email}</strong>.</p>
        </div>
      </div>
    `;
    btnViewEmail.classList.remove('hidden');
  }

  // Populate pyHistory table
  const tbody = document.getElementById('caseAuditHistoryBody');
  tbody.innerHTML = '';
  (currentCase.history || []).forEach(h => {
    const timeStr = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    tbody.innerHTML += `
      <tr>
        <td>${timeStr}</td>
        <td><strong>${h.action}</strong></td>
        <td><span class="status-badge ${getStatusBadgeClass(h.status)}">${h.status}</span></td>
        <td>${h.user}</td>
        <td>${h.details || ''}</td>
      </tr>
    `;
  });
}

function startFreshBooking() {
  currentCase = null;
  selectedSeatNumbers = [];
  document.getElementById('caseDisplayId').textContent = 'CW-New (Draft)';
  document.getElementById('caseDisplayStatus').textContent = 'Booking Requested';
  document.getElementById('caseDisplayStatus').className = 'status-badge status-requested';
  resetChevrons(1);
  transitionToStageView(1);
}

// -------------------------------------------------------------
// UI Navigation Helpers
// -------------------------------------------------------------
function transitionToStageView(stage) {
  ['stageView1', 'stageView2', 'stageView3', 'stageViewFinal'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  if (stage === 1) {
    document.getElementById('stageView1').classList.remove('hidden');
    resetChevrons(1);
  } else if (stage === 2) {
    document.getElementById('stageView2').classList.remove('hidden');
    resetChevrons(2);
  } else if (stage === 3) {
    document.getElementById('stageView3').classList.remove('hidden');
    resetChevrons(3);
  } else if (stage === 'final') {
    document.getElementById('stageViewFinal').classList.remove('hidden');
    if (currentCase.caseStatus === 'Cancelled') {
      markChevronsCancelled();
    } else {
      markAllChevronsCompleted();
    }
  }
}

function resetChevrons(activeStageNum) {
  for (let i = 1; i <= 6; i++) {
    const chevron = document.getElementById(`chevronStage${i}`);
    chevron.className = 'stage-chevron';
    if (i < activeStageNum) {
      chevron.classList.add('completed');
    } else if (i === activeStageNum) {
      chevron.classList.add('active');
    }
  }
}

function markAllChevronsCompleted() {
  for (let i = 1; i <= 6; i++) {
    const chevron = document.getElementById(`chevronStage${i}`);
    chevron.className = 'stage-chevron completed';
  }
}

function markChevronsCancelled() {
  for (let i = 1; i <= 6; i++) {
    const chevron = document.getElementById(`chevronStage${i}`);
    if (i <= 3) {
      chevron.className = 'stage-chevron completed';
    } else if (i === 4) {
      chevron.className = 'stage-chevron cancelled';
    } else {
      chevron.className = 'stage-chevron';
    }
  }
}

function updateCaseHeader() {
  if (!currentCase) return;
  document.getElementById('caseDisplayId').textContent = currentCase.bookingID;
  const badge = document.getElementById('caseDisplayStatus');
  badge.textContent = currentCase.caseStatus;
  badge.className = `status-badge ${getStatusBadgeClass(currentCase.caseStatus)}`;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Booking Requested': return 'status-requested';
    case 'Availability Checked': return 'status-checked';
    case 'Awaiting Customer Confirmation': return 'status-awaiting';
    case 'Confirmed':
    case 'Notification Sent':
    case 'Completed': return 'status-completed';
    case 'Cancelled': return 'status-cancelled';
    default: return 'status-requested';
  }
}

function showAlert(containerId, message, alertClass) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="pega-alert ${alertClass}">${message}</div>`;
}

// -------------------------------------------------------------
// Customer "My Bookings" and Notifications Inbox
// -------------------------------------------------------------
async function refreshCustomerData() {
  try {
    const res = await fetch('/api/cases');
    const data = await res.json();
    if (data.success) {
      const myCount = data.data.length;
      document.getElementById('badgeMyBookingsCount').textContent = myCount;
    }

    const resNotif = await fetch('/api/notifications');
    const dataNotif = await resNotif.json();
    if (dataNotif.success) {
      document.getElementById('badgeInboxCount').textContent = dataNotif.data.length;
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadMyBookings() {
  const tbody = document.getElementById('myBookingsTableBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading bookings...</td></tr>';

  try {
    const res = await fetch('/api/cases');
    const data = await res.json();

    if (!data.success || data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8;">No bookings found. Click "New Booking" to create a case.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.data.forEach(c => {
      const seatsStr = (c.selectedSeats && c.selectedSeats.length > 0) ? c.selectedSeats.join(', ') : 'None';
      tbody.innerHTML += `
        <tr>
          <td><strong>${c.bookingID}</strong></td>
          <td>${c.movie.movieName}</td>
          <td>${c.theatre.theatreName} (${c.theatre.location})</td>
          <td>${c.show.showDate} ${c.show.showTime}</td>
          <td>${seatsStr}</td>
          <td><strong>₹${c.totalAmount || 0}</strong></td>
          <td><span class="status-badge ${getStatusBadgeClass(c.caseStatus)}">${c.caseStatus}</span></td>
          <td>
            <button class="btn-pega btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="inspectCaseById('${c.bookingID}')">
              Open Case
            </button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Failed to load bookings: ${err.message}</td></tr>`;
  }
}

async function inspectCaseById(caseID) {
  try {
    const res = await fetch(`/api/cases/${caseID}`);
    const data = await res.json();
    if (data.success) {
      currentCase = data.data;
      updateCaseHeader();
      switchCustomerTab('new-case');
      renderFinalCompletionView(currentCase.caseStatus === 'Cancelled' ? 'CANCEL' : 'CONFIRM');
      transitionToStageView('final');
    }
  } catch (err) {
    alert('Error inspecting case: ' + err.message);
  }
}

async function loadCustomerInbox() {
  const container = document.getElementById('inboxListContainer');
  container.innerHTML = '<p>Loading notifications...</p>';

  try {
    const res = await fetch('/api/notifications');
    const data = await res.json();

    if (!data.success || data.data.length === 0) {
      container.innerHTML = '<p style="color:#64748b;">No email notifications delivered yet.</p>';
      return;
    }

    container.innerHTML = '';
    data.data.forEach(n => {
      const sentTime = new Date(n.sentAt).toLocaleString();
      container.innerHTML += `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <strong style="color: var(--pega-navy); font-size: 15px;">${n.subject}</strong>
              <div style="font-size: 12px; color: #64748b;">Recipient: ${n.recipientName} &lt;${n.recipientEmail}&gt; · Dispatched: ${sentTime}</div>
            </div>
            <span class="status-badge status-completed">Delivered</span>
          </div>
          <div class="email-preview-card">${n.bodyText}</div>
        </div>
      `;
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

// -------------------------------------------------------------
// Staff Portal Functions
// -------------------------------------------------------------
async function refreshStaffDashboard() {
  try {
    const res = await fetch('/api/reports/dashboard');
    const data = await res.json();

    if (!data.success) return;

    const { kpis, bookingsByTheatre, bookingsByMovie, bookingsByDate } = data;

    // Update KPIs
    document.getElementById('kpiTotalBookings').textContent = kpis.totalBookings;
    document.getElementById('kpiPendingBookings').textContent = kpis.pendingBookings;
    document.getElementById('kpiConfirmedBookings').textContent = kpis.confirmedBookings;
    document.getElementById('kpiCancelledBookings').textContent = kpis.cancelledBookings;
    document.getElementById('kpiTotalRevenue').textContent = `₹${kpis.totalRevenue.toLocaleString()}`;
    document.getElementById('kpiAvailableSeats').textContent = kpis.totalAvailableSeats;

    // Render Bar Charts
    renderBarChart('chartBookingsByTheatre', bookingsByTheatre, kpis.totalBookings);
    renderBarChart('chartBookingsByMovie', bookingsByMovie, kpis.totalBookings);
    renderBarChart('chartBookingsByDate', bookingsByDate, kpis.totalBookings);

  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

function renderBarChart(containerId, dataMap, total) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  const entries = Object.entries(dataMap);
  if (entries.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8; font-size:12px;">No data available for this report.</p>';
    return;
  }

  const maxVal = Math.max(...entries.map(e => e[1]), 1);

  entries.forEach(([label, count]) => {
    const pct = Math.round((count / maxVal) * 100);
    container.innerHTML += `
      <div class="bar-item">
        <div class="bar-label-row">
          <span>${label}</span>
          <span><strong>${count}</strong> bookings</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  });
}

async function loadStaffBookings() {
  const filter = document.getElementById('staffFilterStatus').value;
  const tbody = document.getElementById('staffBookingsTableBody');
  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading ledger...</td></tr>';

  try {
    let url = '/api/cases';
    if (filter) url += `?status=${encodeURIComponent(filter)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#94a3b8;">No matching cases in ledger.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.data.forEach(c => {
      const seatsStr = (c.selectedSeats && c.selectedSeats.length > 0) ? c.selectedSeats.join(', ') : 'None';
      const canCancel = c.caseStatus !== 'Cancelled';
      tbody.innerHTML += `
        <tr>
          <td><strong>${c.bookingID}</strong></td>
          <td>${c.customer.customerName} (${c.customer.mobileNumber})</td>
          <td>${c.movie.movieName}</td>
          <td>${c.theatre.theatreName}</td>
          <td>${c.show.showDate} ${c.show.showTime}</td>
          <td>${seatsStr}</td>
          <td><strong>₹${c.totalAmount || 0}</strong></td>
          <td><span class="status-badge ${getStatusBadgeClass(c.caseStatus)}">${c.caseStatus}</span></td>
          <td>
            ${canCancel ? `
              <button class="btn-pega btn-danger" style="padding: 4px 10px; font-size: 11px;" onclick="staffCancelBooking('${c.bookingID}')">
                Cancel Booking
              </button>
            ` : '<span style="color:#94a3b8; font-size:11px;">N/A</span>'}
          </td>
        </tr>
      `;
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:red;">Error: ${err.message}</td></tr>`;
  }
}

async function staffCancelBooking(bookingID) {
  if (!confirm(`Are you sure you want to cancel booking ${bookingID}? This will release the reserved seats.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/cases/${bookingID}/staff-cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Operator manual cancellation' })
    });
    const data = await res.json();

    if (data.success) {
      alert(`Booking ${bookingID} cancelled. Seats released.`);
      await loadStaffBookings();
      await refreshStaffDashboard();
    } else {
      alert(`Failed to cancel: ${data.message}`);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// Seat Inspector
function populateInspectorShows() {
  const sel = document.getElementById('selectInspectorShow');
  sel.innerHTML = '';
  cachedShows.forEach(s => {
    sel.innerHTML += `<option value="${s.showID}">${s.movieName} - ${s.theatreName} (${s.showDate} @ ${s.showTime})</option>`;
  });
  loadShowSeatInspector();
}

async function loadShowSeatInspector() {
  const showID = document.getElementById('selectInspectorShow').value;
  if (!showID) return;

  const res = await fetch(`/api/shows/${showID}/seats`);
  const data = await res.json();
  if (!data.success) return;

  const { totalSeats, availableSeats, seats } = data.data;
  const bookedSeats = totalSeats - availableSeats;
  const occPct = Math.round((bookedSeats / totalSeats) * 100);

  document.getElementById('inspTotalSeats').textContent = totalSeats;
  document.getElementById('inspAvailSeats').textContent = availableSeats;
  document.getElementById('inspBookedSeats').textContent = bookedSeats;
  document.getElementById('inspOccupancyRate').textContent = `${occPct}%`;

  const container = document.getElementById('inspectorSeatMatrix');
  container.innerHTML = '';

  const rows = ['A', 'B', 'C', 'D', 'E'];
  rows.forEach(rowLetter => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'seat-row';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowLetter;
    rowDiv.appendChild(label);

    const rowSeats = seats.filter(s => s.seatNumber.startsWith(rowLetter));
    rowSeats.forEach(seat => {
      const seatNode = document.createElement('div');
      seatNode.className = `seat-node ${seat.seatStatus.toLowerCase()}`;
      seatNode.textContent = seat.seatNumber;
      seatNode.title = `Seat ${seat.seatNumber} - ${seat.seatStatus} (${seat.seatType})`;
      rowDiv.appendChild(seatNode);
    });

    container.appendChild(rowDiv);
  });
}

// Master Data Forms
function populateStaffMasterForms() {
  const selMovie = document.getElementById('addShowMovie');
  const selTheatre = document.getElementById('addShowTheatre');

  selMovie.innerHTML = '';
  cachedMovies.forEach(m => {
    selMovie.innerHTML += `<option value="${m.movieID}">${m.movieName}</option>`;
  });

  selTheatre.innerHTML = '';
  cachedTheatres.forEach(t => {
    selTheatre.innerHTML += `<option value="${t.theatreID}">${t.theatreName} (${t.location})</option>`;
  });
}

async function handleCreateMovie(e) {
  e.preventDefault();
  const payload = {
    movieName: document.getElementById('addMovieTitle').value.trim(),
    language: document.getElementById('addMovieLang').value.trim(),
    genre: document.getElementById('addMovieGenre').value.trim(),
    duration: document.getElementById('addMovieDuration').value.trim(),
    rating: document.getElementById('addMovieRating').value.trim()
  };

  try {
    const res = await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert(`Movie "${data.data.movieName}" added successfully to Pega Data Type.`);
      document.getElementById('addMovieTitle').value = '';
      await loadMasterData();
      populateStaffMasterForms();
    }
  } catch (err) {
    alert('Error adding movie: ' + err.message);
  }
}

async function handleCreateShow(e) {
  e.preventDefault();
  const payload = {
    movieID: document.getElementById('addShowMovie').value,
    theatreID: document.getElementById('addShowTheatre').value,
    showDate: document.getElementById('addShowDate').value,
    showTime: document.getElementById('addShowTime').value.trim(),
    ticketPrice: parseFloat(document.getElementById('addShowPrice').value)
  };

  try {
    const res = await fetch('/api/shows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert(`New show scheduled successfully! Show ID: ${data.data.showID}`);
      await loadMasterData();
    }
  } catch (err) {
    alert('Error scheduling show: ' + err.message);
  }
}

// -------------------------------------------------------------
// Modal Dialog: Email Viewer
// -------------------------------------------------------------
async function openEmailModalForCurrentCase() {
  if (!currentCase) return;

  try {
    const res = await fetch(`/api/notifications?bookingID=${currentCase.bookingID}`);
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      const notif = data.data[0];
      document.getElementById('modalEmailRecipient').textContent = `${notif.recipientName} <${notif.recipientEmail}>`;
      document.getElementById('modalEmailSubject').textContent = notif.subject;
      document.getElementById('modalEmailBody').textContent = notif.bodyText;

      document.getElementById('emailModalBackdrop').classList.add('open');
    } else {
      alert('No email correspondence record found for this case.');
    }
  } catch (err) {
    alert('Error fetching notification: ' + err.message);
  }
}

function closeEmailModal() {
  document.getElementById('emailModalBackdrop').classList.remove('open');
}
