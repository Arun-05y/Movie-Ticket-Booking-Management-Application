"""
Comprehensive Automated Test Suite for Pega Platform™ Python Engine
Tests Pega Major Architecture, Prediction Studio, SLAs, Alternate Stages, and Decision Tables.
"""

import unittest
import sys
import io

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from pega_engine import PegaCaseEngine
from pega_prediction_studio import PegaPredictionStudio


class TestPegaPythonEngine(unittest.TestCase):

    def setUp(self):
        self.engine = PegaCaseEngine()
        self.prediction_studio = PegaPredictionStudio()
        self.engine.db["pegaConfig"]["majorVersion"] = "01"
        self.engine.db["pegaConfig"]["rulesetVersion"] = "CineWave:01-01-01"
        self.engine.db["pegaConfig"]["applicationVersion"] = "01.01.01"
        for show in self.engine.db.get("shows", []):
            sid = show["showID"]
            for s in self.engine.db.get("seatsByShow", {}).get(sid, []):
                if s["seatNumber"] not in ["A1", "A2", "B5", "C7", "C8"]:
                    s["seatStatus"] = "Available"
        self.engine.save_data()

    def test_01_pega_major_metadata(self):
        """Test 1: Verify Pega Major Versioning & ECS Configuration"""
        cfg = self.engine.db.get("pegaConfig", {})
        self.assertIn(cfg["majorVersion"], ["01", "02", "03"])
        self.assertTrue(cfg["rulesetVersion"].startswith("CineWave:"))
        self.assertEqual(cfg["platformVersion"], "24.1 Infinity")
        self.assertEqual(cfg["classHierarchy"]["caseType"], "CW-CineWave-Work-MovieBooking")
        print("  [PASS]: Pega Major Versioning and ECS verified in Python")

    def test_02_decision_table_evaluation(self):
        """Test 2: Verify Pega Decision Table: LookupPricing"""
        # Test Sunday (Weekend surge +30), Standard seat, VIP tier (15% discount)
        res = self.engine.evaluate_decision_table("Standard", "2026-09-20", "VIP", 200.0)
        self.assertTrue(res["isWeekend"])
        self.assertEqual(res["weekendSurge"], 30)
        self.assertEqual(res["discountPct"], 15)
        self.assertIn(int(res["finalUnitPrice"]), [195, 196])
        print("  [PASS]: Pega Decision Table evaluated with dynamic discount in Python")

    def test_03_prediction_studio_and_cdh(self):
        """Test 3: Verify Pega Prediction Studio & Customer Decision Hub NBA"""
        # Test Demand Forecasting
        pred = self.prediction_studio.predict_seat_demand(
            show_time="07:30 PM",
            is_weekend=True,
            theatre_location="Chennai",
            current_occupancy_pct=70.0,
            movie_rating=8.8
        )
        self.assertGreaterEqual(pred["predicted_sellout_propensity"], 0.60)
        self.assertIn("Demand", pred["demand_category"])

        # Test Next-Best-Action
        nba = self.prediction_studio.get_next_best_action("VIP", 2, 400.0)
        self.assertIn("Beverage", nba["next_best_action_offer"])
        self.assertGreater(nba["arbitration_score"], 50)
        print("  [PASS]: Pega Prediction Studio ML & CDH Next-Best-Action verified in Python")

    def test_04_primary_lifecycle_flow(self):
        """Test 4: End-to-End Primary Case Lifecycle (Stages 1 through 6)"""
        movies = self.engine.get_d_movie_list()
        theatres = self.engine.get_d_theatre_list()
        shows = self.engine.get_d_show_list()

        payload = {
            "customerName": "Suresh Raina",
            "email": "suresh@example.com",
            "mobileNumber": "9812345678",
            "customerTier": "Gold",
            "movieID": movies[0]["movieID"],
            "theatreID": theatres[0]["theatreID"],
            "showID": shows[0]["showID"],
            "numberOfTickets": 2
        }

        # Stage 1
        case_data = self.engine.create_booking_case(payload)
        self.assertTrue(case_data["bookingID"].startswith("CW-"))
        self.assertEqual(case_data["caseStatus"], "Booking Requested")

        # Stage 2: Select seats
        updated = self.engine.select_seats(case_data["bookingID"], ["B7", "B8"])
        self.assertEqual(updated["caseStatus"], "Awaiting Customer Confirmation")
        self.assertEqual(updated["selectedSeats"], ["B7", "B8"])

        # Stages 3, 4, 5, 6: Confirm
        res = self.engine.confirm_or_cancel(case_data["bookingID"], "CONFIRM")
        final_case = res["case"]
        self.assertEqual(final_case["caseStatus"], "Completed")
        self.assertEqual(final_case["currentStage"], "Stage 6 – Case Completion")
        self.assertIsNotNone(res["notification"])
        print("  [PASS]: Primary Case Lifecycle completed successfully in Python")

    def test_05_work_queue_routing(self):
        """Test 5: Pega Work Queue Routing for Bulk Bookings (> 4 tickets)"""
        movies = self.engine.get_d_movie_list()
        theatres = self.engine.get_d_theatre_list()
        shows = self.engine.get_d_show_list()

        payload = {
            "customerName": "Corporate Booking Ltd",
            "email": "corp@example.com",
            "mobileNumber": "9899988877",
            "customerTier": "Regular",
            "movieID": movies[0]["movieID"],
            "theatreID": theatres[0]["theatreID"],
            "showID": shows[0]["showID"],
            "numberOfTickets": 6 # Bulk > 4
        }

        bulk_case = self.engine.create_booking_case(payload)
        self.assertEqual(bulk_case["caseStatus"], "Pending-ManagerApproval")
        self.assertEqual(bulk_case["routedTo"], "StaffReviewQueue@CineWave")

        # Manager Approval
        approved = self.engine.manager_review(bulk_case["bookingID"], "APPROVE", "Corporate quota granted")
        self.assertEqual(approved["caseStatus"], "Booking Requested")
        self.assertEqual(approved["routedTo"], "pyWorkList")
        print("  [PASS]: Pega Work Queue & Manager Approval verified in Python")

    def test_06_sla_expiry_to_alternate_stage(self):
        """Test 6: Pega SLA Expiry & Alternate Stage: Seat Hold Timeout"""
        movies = self.engine.get_d_movie_list()
        theatres = self.engine.get_d_theatre_list()
        shows = self.engine.get_d_show_list()

        payload = {
            "customerName": "Vikram Rathore",
            "email": "vikram.r@example.com",
            "mobileNumber": "9811122299",
            "customerTier": "Regular",
            "movieID": movies[0]["movieID"],
            "theatreID": theatres[0]["theatreID"],
            "showID": shows[0]["showID"],
            "numberOfTickets": 1
        }

        c = self.engine.create_booking_case(payload)
        self.engine.select_seats(c["bookingID"], ["C1"])

        # Expire SLA
        timed_out = self.engine.expire_sla(c["bookingID"])
        self.assertTrue(timed_out["isAlternateStage"])
        self.assertEqual(timed_out["caseStatus"], "Resolved-Timeout")
        self.assertEqual(timed_out["urgency"], 60)
        print("  [PASS]: Pega SLA Expiration to Alternate Stage verified in Python")

    def test_07_pega_major_ruleset_skim(self):
        """Test 7: Pega Major Ruleset Skim Simulator (01-01-01 -> 02-01-01)"""
        old_major = self.engine.db["pegaConfig"]["majorVersion"]
        cfg = self.engine.major_skim()
        self.assertEqual(int(cfg["majorVersion"]), int(old_major) + 1)
        self.assertTrue(cfg["rulesetVersion"].endswith("-01-01"))
        print(f"  [PASS]: Pega Major Ruleset Skim executed in Python: {cfg['rulesetVersion']}")


if __name__ == "__main__":
    print("================================================================")
    print(" CINEWAVE ENTERTAINMENT - PEGA PYTHON ARCHITECTURE TEST SUITE")
    print("================================================================\n")
    unittest.main(verbosity=1)
