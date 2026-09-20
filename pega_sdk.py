"""
CineWave Entertainment – Official Pega Platform™ Python SDK Client
Enables programmatic integration with Pega Case Lifecycles, Data Pages, and Decisioning.
"""

from typing import Dict, Any, List, Optional
import requests


class PegaClient:
    """Client SDK for interacting with CineWave Pega Application."""

    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip("/")

    def get_version(self) -> Dict[str, Any]:
        """Fetch active Pega Platform & Ruleset Major Version."""
        resp = requests.get(f"{self.base_url}/api/pega/version")
        resp.raise_for_status()
        return resp.json()

    def get_data_page(self, page_name: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Query a Pega Data Page (e.g. D_MovieList, D_TheatreList, D_ShowList)."""
        endpoint_map = {
            "D_MovieList": "/api/movies",
            "D_TheatreList": "/api/theatres",
            "D_ShowList": "/api/shows"
        }
        path = endpoint_map.get(page_name, f"/api/{page_name.lower()}")
        resp = requests.get(f"{self.base_url}{path}", params=params or {})
        resp.raise_for_status()
        return resp.json().get("data", [])

    def get_seat_availability(self, show_id: str) -> Dict[str, Any]:
        """Query D_SeatAvailability for a given ShowID."""
        resp = requests.get(f"{self.base_url}/api/shows/{show_id}/seats")
        resp.raise_for_status()
        return resp.json().get("data", {})

    def evaluate_decision_table(
        self,
        seat_type: str,
        show_date: str,
        customer_tier: str = "Regular",
        base_price: float = 200.0
    ) -> Dict[str, Any]:
        """Invoke Pega Decision Table: LookupPricing."""
        resp = requests.post(f"{self.base_url}/api/pega/evaluate-decision-table", json={
            "seatType": seat_type,
            "showDate": show_date,
            "customerTier": customer_tier,
            "basePrice": base_price
        })
        resp.raise_for_status()
        return resp.json().get("data", {})

    def create_case(
        self,
        customer_name: str,
        email: str,
        mobile_number: str,
        movie_id: str,
        theatre_id: str,
        show_id: str,
        tickets: int,
        customer_tier: str = "Regular"
    ) -> Dict[str, Any]:
        """Create a new Movie Ticket Booking Case (Stage 1)."""
        payload = {
            "customerName": customer_name,
            "email": email,
            "mobileNumber": mobile_number,
            "customerTier": customer_tier,
            "movieID": movie_id,
            "theatreID": theatre_id,
            "showID": show_id,
            "numberOfTickets": tickets
        }
        resp = requests.post(f"{self.base_url}/api/cases", json=payload)
        resp.raise_for_status()
        return resp.json().get("data", {})

    def select_seats(self, case_id: str, seats: List[str]) -> Dict[str, Any]:
        """Advance to Stage 2 & select seats."""
        resp = requests.post(f"{self.base_url}/api/cases/{case_id}/select-seats", json={
            "selectedSeats": seats
        })
        resp.raise_for_status()
        return resp.json().get("data", {})

    def confirm_booking(self, case_id: str) -> Dict[str, Any]:
        """Confirm booking (Stage 3 -> 4 -> 5 -> 6)."""
        resp = requests.post(f"{self.base_url}/api/cases/{case_id}/confirm", json={
            "decision": "CONFIRM"
        })
        resp.raise_for_status()
        return resp.json()

    def cancel_booking(self, case_id: str) -> Dict[str, Any]:
        """Route case to Alternate Stage: Cancellation."""
        resp = requests.post(f"{self.base_url}/api/cases/{case_id}/confirm", json={
            "decision": "CANCEL"
        })
        resp.raise_for_status()
        return resp.json()

    def expire_sla(self, case_id: str) -> Dict[str, Any]:
        """Simulate SLA deadline expiry -> Alternate Stage: Seat Hold Timeout."""
        resp = requests.post(f"{self.base_url}/api/cases/{case_id}/expire-sla")
        resp.raise_for_status()
        return resp.json().get("data", {})

    def manager_review(self, case_id: str, action: str, notes: str = "") -> Dict[str, Any]:
        """Cinema Manager review for bulk booking work queue."""
        resp = requests.post(f"{self.base_url}/api/cases/{case_id}/manager-review", json={
            "action": action,
            "managerNotes": notes
        })
        resp.raise_for_status()
        return resp.json().get("data", {})

    def major_skim(self) -> Dict[str, Any]:
        """Execute Pega Major Ruleset Skim (01-01-01 -> 02-01-01)."""
        resp = requests.post(f"{self.base_url}/api/admin/major-skim")
        resp.raise_for_status()
        return resp.json().get("data", {})
