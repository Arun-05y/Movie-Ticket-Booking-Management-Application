"""
CineWave Entertainment – Core Pega Platform™ Engine in Python
Implements Pega Major Architecture:
- Enterprise Class Structure (ECS)
- Case Life Cycle (Primary & Alternate Stages)
- Pega Service Level Agreements (SLA) & Urgency
- Declarative Processing & Decision Tables
- Work Queue Routing & Manager Approvals
- Pega Major Ruleset Skimming
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from pega_prediction_studio import PegaPredictionStudio

DATA_FILE = os.path.join(os.path.dirname(__file__), "data_store.json")


class PegaCaseEngine:
    def __init__(self):
        self.prediction_studio = PegaPredictionStudio()
        self.load_data()

    def load_data(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    self.db = json.load(f)
                return
            except Exception as e:
                print("Error reading data file, using defaults:", e)

        # Defaults if file missing
        self.db = {
            "pegaConfig": {
                "platformVersion": "24.1 Infinity",
                "builtOnApplication": "Theme-Cosmos:05.01",
                "applicationName": "CineWave Entertainment",
                "applicationVersion": "01.01.01",
                "majorVersion": "01",
                "minorVersion": "01",
                "patchVersion": "01",
                "rulesetName": "CineWave",
                "rulesetVersion": "CineWave:01-01-01",
                "classHierarchy": {
                    "org": "CW",
                    "app": "CW-CineWave",
                    "workPool": "CW-CineWave-Work",
                    "caseType": "CW-CineWave-Work-MovieBooking",
                    "data": "CW-CineWave-Data"
                }
            },
            "caseCounter": 10001,
            "movies": [],
            "theatres": [],
            "shows": [],
            "seatsByShow": {},
            "cases": [],
            "notifications": []
        }

    def save_data(self):
        try:
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(self.db, f, indent=2)
        except Exception as e:
            print("Failed to save data:", e)

    # -------------------------------------------------------------
    # Pega Data Pages
    # -------------------------------------------------------------
    def get_d_movie_list(self) -> List[Dict[str, Any]]:
        """Data Page: D_MovieList"""
        return self.db.get("movies", [])

    def get_d_theatre_list(self, location: Optional[str] = None) -> List[Dict[str, Any]]:
        """Data Page: D_TheatreList"""
        theatres = self.db.get("theatres", [])
        if location:
            return [t for t in theatres if t.get("location", "").lower() == location.lower()]
        return theatres

    def get_d_show_list(self, movie_id: Optional[str] = None, theatre_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Data Page: D_ShowList"""
        shows = self.db.get("shows", [])
        result = []
        for s in shows:
            avail = len([seat for seat in self.db.get("seatsByShow", {}).get(s["showID"], []) if seat.get("seatStatus") == "Available"])
            item = dict(s)
            item["availableSeats"] = avail
            if movie_id and s.get("movieID") != movie_id:
                continue
            if theatre_id and s.get("theatreID") != theatre_id:
                continue
            result.append(item)
        return result

    def get_d_seat_availability(self, show_id: str) -> Dict[str, Any]:
        """Data Page: D_SeatAvailability"""
        show = next((s for s in self.db.get("shows", []) if s["showID"] == show_id), None)
        seats = self.db.get("seatsByShow", {}).get(show_id, [])
        avail = len([s for s in seats if s.get("seatStatus") == "Available"])
        return {
            "show": show,
            "totalSeats": len(seats),
            "availableSeats": avail,
            "seats": seats
        }

    # -------------------------------------------------------------
    # Pega Decision Table: LookupPricing
    # -------------------------------------------------------------
    def evaluate_decision_table(
        self,
        seat_type: str,
        show_date: str,
        customer_tier: str = "Regular",
        base_price: float = 200.0
    ) -> Dict[str, Any]:
        """Rule-Declare-DecisionTable: LookupPricing"""
        date_obj = datetime.strptime(show_date, "%Y-%m-%d")
        is_weekend = date_obj.weekday() in (5, 6) # Sat, Sun

        tier_surcharge = 0
        if seat_type == "Premium":
            tier_surcharge = 50
        elif seat_type == "Recliner":
            tier_surcharge = 150

        weekend_surge = 30 if is_weekend else 0

        discount_pct = 0
        ct_upper = customer_tier.upper()
        if ct_upper == "VIP":
            discount_pct = 15
        elif ct_upper == "GOLD":
            discount_pct = 25

        raw_unit = base_price + tier_surcharge + weekend_surge
        discount_amount = round(raw_unit * (discount_pct / 100.0))
        final_unit = raw_unit - discount_amount

        return {
            "seatType": seat_type,
            "isWeekend": is_weekend,
            "customerTier": customer_tier,
            "basePrice": base_price,
            "tierSurcharge": tier_surcharge,
            "weekendSurge": weekend_surge,
            "discountPct": discount_pct,
            "discountAmount": discount_amount,
            "finalUnitPrice": final_unit,
            "decisionRule": f"Rule-Declare-DecisionTable: LookupPricing [{seat_type} | Weekend:{is_weekend} | {customer_tier}]"
        }

    # -------------------------------------------------------------
    # Pega Case Lifecycle Engine
    # -------------------------------------------------------------
    def create_booking_case(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 1: Booking Request"""
        customer_name = payload.get("customerName", "").strip()
        email = payload.get("email", "").strip()
        mobile = payload.get("mobileNumber", "").strip()
        movie_id = payload.get("movieID")
        theatre_id = payload.get("theatreID")
        show_id = payload.get("showID")
        tickets_count = int(payload.get("numberOfTickets", 0))
        customer_tier = payload.get("customerTier", "Regular")

        if not all([customer_name, email, mobile, movie_id, theatre_id, show_id]) or tickets_count < 1:
            raise ValueError("Mandatory field validation failed.")

        movie = next((m for m in self.db["movies"] if m["movieID"] == movie_id), None)
        theatre = next((t for t in self.db["theatres"] if t["theatreID"] == theatre_id), None)
        show = next((s for s in self.db["shows"] if s["showID"] == show_id), None)

        if not all([movie, theatre, show]):
            raise ValueError("Referenced Movie, Theatre, or Show does not exist.")

        # Check availability
        avail_seats = len([s for s in self.db["seatsByShow"].get(show_id, []) if s["seatStatus"] == "Available"])
        if tickets_count > avail_seats:
            raise ValueError(f"Requested tickets ({tickets_count}) exceed available seats ({avail_seats}).")

        # Pega Routing Rule: If tickets > 4, route to Manager Work Queue
        requires_manager_approval = tickets_count > 4
        initial_status = "Pending-ManagerApproval" if requires_manager_approval else "Booking Requested"
        initial_route = "StaffReviewQueue@CineWave" if requires_manager_approval else "pyWorkList"

        booking_id = f"CW-{self.db['caseCounter']}"
        self.db["caseCounter"] += 1
        now = datetime.utcnow().isoformat() + "Z"

        # Apply Decision Table
        dt_eval = self.evaluate_decision_table("Standard", show["showDate"], customer_tier, show["ticketPrice"])
        unit_price = dt_eval["finalUnitPrice"]
        total_amount = tickets_count * unit_price

        # Query Pega Prediction Studio for Next-Best-Action
        nba_data = self.prediction_studio.get_next_best_action(customer_tier, tickets_count, total_amount)

        new_case = {
            "bookingID": booking_id,
            "caseID": booking_id,
            "caseType": "Movie Ticket Booking",
            "caseStatus": initial_status,
            "currentStage": "Stage 1 – Booking Request",
            "stageNumber": 1,
            "isAlternateStage": False,
            "alternateStageName": None,
            "urgency": 10,
            "rulesetVersion": self.db["pegaConfig"]["rulesetVersion"],
            "requiresManagerApproval": requires_manager_approval,
            "managerApprovalStatus": "Pending" if requires_manager_approval else "N/A",
            "routedTo": initial_route,
            "customer": {
                "customerID": f"CUST-{os.urandom(2).hex().upper()}",
                "customerName": customer_name,
                "email": email,
                "mobileNumber": mobile,
                "customerTier": customer_tier
            },
            "movie": movie,
            "theatre": theatre,
            "show": show,
            "numberOfTickets": tickets_count,
            "selectedSeats": [],
            "basePrice": show["ticketPrice"],
            "ticketPrice": unit_price,
            "totalAmount": total_amount,
            "decisionTableAudit": dt_eval,
            "nextBestAction": nba_data,
            "sla": {
                "goalSeconds": 300,
                "deadlineSeconds": 600,
                "status": "Active"
            },
            "bookingDate": now,
            "confirmationDate": None,
            "history": [
                {
                    "timestamp": now,
                    "action": f"Case Created ({self.db['pegaConfig']['rulesetVersion']})",
                    "status": initial_status,
                    "user": customer_name,
                    "urgency": 10,
                    "details": "Bulk order routed to StaffReviewQueue" if requires_manager_approval else "Booking requested by customer"
                }
            ]
        }

        self.db["cases"].insert(0, new_case)
        self.save_data()
        return new_case

    def manager_review(self, case_id: str, action: str, manager_notes: str = "") -> Dict[str, Any]:
        """Pega Work Queue Router Action: Cinema Manager Approval"""
        case_obj = next((c for c in self.db["cases"] if c["bookingID"] == case_id), None)
        if not case_obj:
            raise ValueError("Case not found")

        now = datetime.utcnow().isoformat() + "Z"
        if action == "REJECT":
            case_obj["isAlternateStage"] = True
            case_obj["alternateStageName"] = "Alternate Stage: Cancellation"
            case_obj["caseStatus"] = "Cancelled"
            case_obj["managerApprovalStatus"] = "Rejected"
            case_obj["history"].append({
                "timestamp": now,
                "action": "Bulk Booking Rejected by Cinema Manager",
                "status": "Cancelled",
                "user": "CinemaManager",
                "urgency": case_obj["urgency"],
                "details": f"Manager rejected: {manager_notes}"
            })
        else:
            case_obj["managerApprovalStatus"] = "Approved"
            case_obj["caseStatus"] = "Booking Requested"
            case_obj["routedTo"] = "pyWorkList"
            case_obj["history"].append({
                "timestamp": now,
                "action": "Bulk Booking Approved by Cinema Manager",
                "status": "Booking Requested",
                "user": "CinemaManager",
                "urgency": case_obj["urgency"],
                "details": "Manager approved bulk order. Routed to customer pyWorkList."
            })

        self.save_data()
        return case_obj

    def select_seats(self, case_id: str, selected_seats: List[str]) -> Dict[str, Any]:
        """Stage 2: Check Availability & Select Seats"""
        case_obj = next((c for c in self.db["cases"] if c["bookingID"] == case_id), None)
        if not case_obj:
            raise ValueError("Case not found")

        if len(selected_seats) != case_obj["numberOfTickets"]:
            raise ValueError(f"Selected seats ({len(selected_seats)}) must equal requested tickets ({case_obj['numberOfTickets']}).")

        show_seats = self.db["seatsByShow"].get(case_obj["show"]["showID"], [])
        for seat_num in selected_seats:
            found = next((s for s in show_seats if s["seatNumber"] == seat_num), None)
            if not found or found["seatStatus"] != "Available":
                raise ValueError(f"Seat {seat_num} is already booked or unavailable.")

        first_seat = next((s for s in show_seats if s["seatNumber"] == selected_seats[0]), None)
        seat_type = first_seat["seatType"] if first_seat else "Standard"

        # Re-evaluate Decision Table for tier
        dt_res = self.evaluate_decision_table(
            seat_type,
            case_obj["show"]["showDate"],
            case_obj["customer"]["customerTier"],
            case_obj["basePrice"]
        )

        case_obj["selectedSeats"] = selected_seats
        case_obj["ticketPrice"] = dt_res["finalUnitPrice"]
        case_obj["totalAmount"] = case_obj["numberOfTickets"] * dt_res["finalUnitPrice"]
        case_obj["decisionTableAudit"] = dt_res

        case_obj["caseStatus"] = "Awaiting Customer Confirmation"
        case_obj["currentStage"] = "Stage 3 – Customer Confirmation"
        case_obj["stageNumber"] = 3

        now = datetime.utcnow().isoformat() + "Z"
        case_obj["history"].append({
            "timestamp": now,
            "action": f"Seats Selected [{', '.join(selected_seats)}] & Price Re-evaluated",
            "status": "Awaiting Customer Confirmation",
            "user": case_obj["customer"]["customerName"],
            "urgency": case_obj["urgency"],
            "details": f"Unit price: ₹{case_obj['ticketPrice']}. Total Amount: ₹{case_obj['totalAmount']}"
        })

        self.save_data()
        return case_obj

    def expire_sla(self, case_id: str) -> Dict[str, Any]:
        """Pega SLA Expiry Action -> Route to Alternate Stage: Seat Hold Timeout"""
        case_obj = next((c for c in self.db["cases"] if c["bookingID"] == case_id), None)
        if not case_obj:
            raise ValueError("Case not found")

        show_seats = self.db["seatsByShow"].get(case_obj["show"]["showID"], [])
        for snum in case_obj.get("selectedSeats", []):
            s = next((seat for seat in show_seats if seat["seatNumber"] == snum), None)
            if s and s["seatStatus"] != "Booked":
                s["seatStatus"] = "Available"

        now = datetime.utcnow().isoformat() + "Z"
        case_obj["isAlternateStage"] = True
        case_obj["alternateStageName"] = "Alternate Stage: Seat Hold Timeout (SLA Expiry)"
        case_obj["caseStatus"] = "Resolved-Timeout"
        case_obj["currentStage"] = "Alternate Stage: Seat Hold Timeout"
        case_obj["urgency"] = 60
        case_obj["sla"]["status"] = "DeadlinePassed-Expired"

        case_obj["history"].append({
            "timestamp": now,
            "action": "Pega SLA Deadline Expired (Urgency -> 60)",
            "status": "Resolved-Timeout",
            "user": "Pega SLA Agent (QueueProcessor)",
            "urgency": 60,
            "details": "10-minute SLA deadline elapsed. Held seats released. Case resolved as Timeout."
        })

        self.save_data()
        return case_obj

    def confirm_or_cancel(self, case_id: str, decision: str) -> Dict[str, Any]:
        """Stages 4, 5, 6: Confirm or Cancel"""
        case_obj = next((c for c in self.db["cases"] if c["bookingID"] == case_id), None)
        if not case_obj:
            raise ValueError("Case not found")

        now = datetime.utcnow().isoformat() + "Z"
        if decision == "CANCEL":
            case_obj["isAlternateStage"] = True
            case_obj["alternateStageName"] = "Alternate Stage: Customer Cancellation"
            case_obj["caseStatus"] = "Cancelled"
            case_obj["currentStage"] = "Alternate Stage: Cancellation"
            case_obj["sla"]["status"] = "Terminated"

            case_obj["history"].append({
                "timestamp": now,
                "action": "Customer Cancelled -> Alternate Stage: Cancellation",
                "status": "Cancelled",
                "user": case_obj["customer"]["customerName"],
                "urgency": case_obj["urgency"],
                "details": "Customer elected to cancel. Case resolved as Cancelled."
            })
            self.save_data()
            return {"case": case_obj, "notification": None}

        # CONFIRM
        show_seats = self.db["seatsByShow"].get(case_obj["show"]["showID"], [])
        for snum in case_obj["selectedSeats"]:
            s = next((seat for seat in show_seats if seat["seatNumber"] == snum), None)
            if s:
                s["seatStatus"] = "Booked"

        case_obj["caseStatus"] = "Confirmed"
        case_obj["confirmationDate"] = now
        case_obj["sla"]["status"] = "Satisfied"
        case_obj["currentStage"] = "Stage 5 – Notification"
        case_obj["stageNumber"] = 5

        # Notification
        email_subj = f"Booking Confirmed: CineWave Entertainment [{case_obj['bookingID']}]"
        email_body = f"Dear {case_obj['customer']['customerName']},\n\nYour movie booking {case_obj['bookingID']} is confirmed!\nTotal: ₹{case_obj['totalAmount']}\nSeats: {', '.join(case_obj['selectedSeats'])}"

        notif_rec = {
            "notificationID": f"NOTIF-{10000 + len(self.db.get('notifications', [])) + 1}",
            "bookingID": case_obj["bookingID"],
            "recipientEmail": case_obj["customer"]["email"],
            "recipientName": case_obj["customer"]["customerName"],
            "subject": email_subj,
            "bodyText": email_body,
            "sentAt": now
        }
        self.db.setdefault("notifications", []).insert(0, notif_rec)

        # Stage 6: Completion
        case_obj["currentStage"] = "Stage 6 – Case Completion"
        case_obj["stageNumber"] = 6
        case_obj["caseStatus"] = "Completed"

        case_obj["history"].append({
            "timestamp": now,
            "action": "Booking Confirmed & Resolved-Completed",
            "status": "Completed",
            "user": "System",
            "urgency": case_obj["urgency"],
            "details": f"Reserved seats: {', '.join(case_obj['selectedSeats'])}. Ruleset: {case_obj['rulesetVersion']}"
        })

        self.save_data()
        return {"case": case_obj, "notification": notif_rec}

    def major_skim(self) -> Dict[str, Any]:
        """Pega Major Ruleset Skim Simulator"""
        curr_major = int(self.db["pegaConfig"]["majorVersion"], 10)
        new_major_str = f"{curr_major + 1:02d}"

        self.db["pegaConfig"]["majorVersion"] = new_major_str
        self.db["pegaConfig"]["minorVersion"] = "01"
        self.db["pegaConfig"]["patchVersion"] = "01"
        self.db["pegaConfig"]["applicationVersion"] = f"{new_major_str}.01.01"
        self.db["pegaConfig"]["rulesetVersion"] = f"CineWave:{new_major_str}-01-01"

        self.save_data()
        return self.db["pegaConfig"]
