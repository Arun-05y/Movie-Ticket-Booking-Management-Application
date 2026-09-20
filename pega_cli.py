"""
CineWave Entertainment – Interactive Pega Platform™ Python CLI
A command-line terminal tool for Pega System Architects, Developers, and Students.
"""

import sys
import os
from pega_engine import PegaCaseEngine
from pega_prediction_studio import PegaPredictionStudio


def clear_banner():
    print("\n" + "=" * 65)
    print("🎬 CINEWAVE ENTERTAINMENT – PEGA PLATFORM™ PYTHON CLI")
    print("=" * 65)


def print_case_summary(case_data):
    print(f"\n🎟️ Case ID:      {case_data['bookingID']}")
    print(f"📦 Ruleset:      {case_data.get('rulesetVersion', 'N/A')}")
    print(f"📊 Status:       {case_data['caseStatus']}")
    print(f"⚡ Urgency:      {case_data.get('urgency', 10)}")
    print(f"📍 Current Stage:{case_data['currentStage']}")
    print(f"👤 Customer:     {case_data['customer']['customerName']} ({case_data['customer'].get('customerTier', 'Regular')} Member)")
    print(f"🎬 Movie:        {case_data['movie']['movieName']}")
    print(f"🏛️ Theatre:      {case_data['theatre']['theatreName']} ({case_data['theatre']['location']})")
    print(f"🕒 Show:         {case_data['show']['showDate']} at {case_data['show']['showTime']}")
    print(f"🎟️ Tickets:      {case_data['numberOfTickets']}")
    print(f"💺 Seats:        {', '.join(case_data.get('selectedSeats', [])) or 'None'}")
    print(f"💰 Total Amount: ₹{case_data['totalAmount']}")
    print("-" * 65)


def run_cli():
    engine = PegaCaseEngine()
    prediction_studio = PegaPredictionStudio()

    while True:
        clear_banner()
        cfg = engine.db.get("pegaConfig", {})
        print(f"Platform: {cfg.get('platformVersion', '24.1 Infinity')} | Ruleset: {cfg.get('rulesetVersion', '01-01-01')} | Active Cases: {len(engine.db.get('cases', []))}")
        print("\nSelect a Pega Operation:")
        print("1. 📋 List All Booking Cases (Master Ledger)")
        print("2. ✨ Create New Booking Case (Stage 1)")
        print("3. 💺 Select Seats & Evaluate Decision Table (Stage 2 & 3)")
        print("4. ✓ Confirm / Cancel Booking (Stage 4, 5, 6)")
        print("5. 🧠 Pega Prediction Studio (AI Dynamic Demand & NBA)")
        print("6. ⚡ Simulate SLA Expiry (Route to Alternate Stage: Timeout)")
        print("7. 👥 Review Manager Work Queue (Bulk Bookings > 4)")
        print("8. ⚙️ Perform Pega Major Ruleset Skim (e.g. 01-01-01 -> 02-01-01)")
        print("9. 🚪 Exit")

        choice = input("\nEnter choice (1-9): ").strip()

        if choice == "1":
            cases = engine.db.get("cases", [])
            print(f"\nFound {len(cases)} cases:")
            print(f"{'Case ID':<10} | {'Customer':<15} | {'Movie':<15} | {'Status':<25} | {'Urgency':<8} | {'Total'}")
            print("-" * 90)
            for c in cases:
                print(f"{c['bookingID']:<10} | {c['customer']['customerName'][:14]:<15} | {c['movie']['movieName'][:14]:<15} | {c['caseStatus']:<25} | {c.get('urgency', 10):<8} | ₹{c['totalAmount']}")
            input("\nPress Enter to continue...")

        elif choice == "2":
            print("\n--- Create Booking Case ---")
            cname = input("Customer Name [Arun Kumar]: ").strip() or "Arun Kumar"
            email = input("Email [arun@example.com]: ").strip() or "arun@example.com"
            mobile = input("Mobile [9876543210]: ").strip() or "9876543210"
            tier = input("Member Tier (Regular/VIP/Gold) [VIP]: ").strip() or "VIP"
            tickets = int(input("Number of Tickets (1-10) [2]: ").strip() or "2")

            movies = engine.get_d_movie_list()
            theatres = engine.get_d_theatre_list()
            shows = engine.get_d_show_list()

            payload = {
                "customerName": cname,
                "email": email,
                "mobileNumber": mobile,
                "customerTier": tier,
                "movieID": movies[0]["movieID"] if movies else "MOV-101",
                "theatreID": theatres[0]["theatreID"] if theatres else "TH-01",
                "showID": shows[0]["showID"] if shows else "SH-201",
                "numberOfTickets": tickets
            }

            try:
                new_c = engine.create_booking_case(payload)
                print("\n✅ Case successfully initiated!")
                print_case_summary(new_c)
            except Exception as e:
                print("❌ Error:", e)
            input("\nPress Enter to continue...")

        elif choice == "3":
            cid = input("\nEnter Booking ID (e.g. CW-10001): ").strip()
            seats_in = input("Enter seat numbers separated by comma (e.g. A3, A4): ").strip()
            seats = [s.strip() for s in seats_in.split(",") if s.strip()]
            try:
                up = engine.select_seats(cid, seats)
                print("\n✅ Seats selected and Pega Decision Table evaluated!")
                print_case_summary(up)
            except Exception as e:
                print("❌ Error:", e)
            input("\nPress Enter to continue...")

        elif choice == "4":
            cid = input("\nEnter Booking ID: ").strip()
            dec = input("Decision (CONFIRM or CANCEL): ").strip().upper()
            try:
                res = engine.confirm_or_cancel(cid, dec)
                print(f"\n✅ Decision {dec} executed!")
                print_case_summary(res["case"])
            except Exception as e:
                print("❌ Error:", e)
            input("\nPress Enter to continue...")

        elif choice == "5":
            print("\n--- Pega Prediction Studio (Machine Learning Decisioning) ---")
            print("1. Predict Seat Demand & AI Pricing")
            print("2. Next-Best-Action (NBA) Customer Strategy")
            sub = input("Select sub-option (1 or 2): ").strip()

            if sub == "1":
                pred = prediction_studio.predict_seat_demand(
                    show_time="07:30 PM",
                    is_weekend=True,
                    theatre_location="Chennai",
                    current_occupancy_pct=65.0,
                    movie_rating=8.8
                )
                print("\n🧠 Pega Prediction Studio Output:")
                print(f"Model: {pred['model_name']} (Ruleset: {pred['ruleset']})")
                print(f"Propensity: {pred['predicted_sellout_propensity'] * 100:.1f}%")
                print(f"Category:   {pred['demand_category']}")
                print(f"AI Surge:   ₹{pred['ai_price_adjustment']}")
                print(f"Confidence: {pred['confidence_score'] * 100:.1f}% AUC")
            else:
                nba = prediction_studio.get_next_best_action("VIP", 2, 400.0)
                print("\n🎯 Pega Customer Decision Hub (CDH) Next-Best-Action:")
                print(f"Offer:      {nba['next_best_action_offer']}")
                print(f"Voucher:    {nba['discount_code']}")
                print(f"Propensity: {nba['propensity_score'] * 100:.1f}%")
                print(f"Priority:   {nba['business_priority']}")
                print(f"Arbitration Score: {nba['arbitration_score']}")
            input("\nPress Enter to continue...")

        elif choice == "6":
            cid = input("\nEnter Booking ID to simulate SLA expiry: ").strip()
            try:
                res = engine.expire_sla(cid)
                print("\n⏱️ Pega SLA Deadline Expired! Routed to Alternate Stage:")
                print_case_summary(res)
            except Exception as e:
                print("❌ Error:", e)
            input("\nPress Enter to continue...")

        elif choice == "7":
            cid = input("\nEnter Booking ID to review in Work Queue: ").strip()
            act = input("Action (APPROVE or REJECT): ").strip().upper()
            try:
                res = engine.manager_review(cid, act, "Reviewed via Python CLI")
                print(f"\n✅ Manager decision {act} recorded!")
                print_case_summary(res)
            except Exception as e:
                print("❌ Error:", e)
            input("\nPress Enter to continue...")

        elif choice == "8":
            confirm = input("Are you sure you want to perform a Pega Major Ruleset Skim? (y/n): ").strip().lower()
            if confirm == "y":
                cfg = engine.major_skim()
                print(f"\n🚀 Pega Major Skim Complete! New Ruleset Version: {cfg['rulesetVersion']}")
            input("\nPress Enter to continue...")

        elif choice == "9":
            print("\nExiting Pega Python CLI. Goodbye!")
            sys.exit(0)


if __name__ == "__main__":
    run_cli()
