"""
CineWave Entertainment – Pega Platform™ Python Application Server
Powered by FastAPI & Uvicorn

Exposes:
1. Pega DX API v2 Standards
2. Pega Prediction Studio & CDH AI Decisioning Endpoints
3. Pega Theme Cosmos / Constellation Web Static Assets
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import uvicorn

from pega_engine import PegaCaseEngine
from pega_prediction_studio import PegaPredictionStudio

app = FastAPI(
    title="CineWave Entertainment – Pega Platform™ Python Backend",
    description="Enterprise Pega Platform Case Lifecycle & Prediction Studio in Python",
    version="01.01.01"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = PegaCaseEngine()
prediction_studio = PegaPredictionStudio()

# Models
class BookingRequest(BaseModel):
    customerName: str
    email: str
    mobileNumber: str
    movieID: str
    theatreID: str
    showID: str
    numberOfTickets: int
    customerTier: Optional[str] = "Regular"

class SeatSelectionRequest(BaseModel):
    selectedSeats: List[str]

class DecisionRequest(BaseModel):
    decision: str  # 'CONFIRM' or 'CANCEL'

class ManagerReviewRequest(BaseModel):
    action: str  # 'APPROVE' or 'REJECT'
    managerNotes: Optional[str] = ""

class DemandPredictionRequest(BaseModel):
    showTime: str
    isWeekend: bool
    theatreLocation: str
    currentOccupancyPct: float
    movieRating: float

class NBARequest(BaseModel):
    customerTier: str
    numberOfTickets: int
    totalAmount: float


# --- Pega Major Metadata ---
@app.get("/api/pega/version")
def get_pega_version():
    cases = engine.db.get("cases", [])
    active = len([c for c in cases if c.get("caseStatus") not in ["Completed", "Cancelled", "Resolved-Timeout"]])
    return {
        "success": True,
        "data": engine.db["pegaConfig"],
        "activeCasesCount": active,
        "totalCasesCount": len(cases)
    }

@app.post("/api/admin/major-skim")
def perform_major_skim():
    cfg = engine.major_skim()
    return {
        "success": True,
        "message": f"Pega Major Ruleset Skim executed! New Ruleset Version: {cfg['rulesetVersion']}",
        "data": cfg
    }

# --- Pega Data Pages ---
@app.get("/api/movies")
def get_movies():
    return {"success": True, "data": engine.get_d_movie_list()}

@app.get("/api/theatres")
def get_theatres(location: Optional[str] = None):
    return {"success": True, "data": engine.get_d_theatre_list(location)}

@app.get("/api/shows")
def get_shows(movieID: Optional[str] = None, theatreID: Optional[str] = None):
    return {"success": True, "data": engine.get_d_show_list(movieID, theatreID)}

@app.get("/api/shows/{show_id}/seats")
def get_seats(show_id: str):
    data = engine.get_d_seat_availability(show_id)
    if not data["show"]:
        raise HTTPException(status_code=404, detail="Show not found")
    return {"success": True, "data": data}

# --- Pega Case Lifecycle ---
@app.post("/api/cases")
def create_case(req: BookingRequest):
    try:
        case_data = engine.create_booking_case(req.dict())
        return {
            "success": True,
            "message": f"Case {case_data['bookingID']} created under {case_data['rulesetVersion']}",
            "data": case_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/cases/{case_id}/select-seats")
def select_seats(case_id: str, req: SeatSelectionRequest):
    try:
        updated = engine.select_seats(case_id, req.selectedSeats)
        return {"success": True, "message": "Seats validated and confirmed", "data": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/cases/{case_id}/confirm")
def confirm_case(case_id: str, req: DecisionRequest):
    try:
        res = engine.confirm_or_cancel(case_id, req.decision)
        return {
            "success": True,
            "message": f"Case {case_id} decision {req.decision} processed",
            "data": res["case"],
            "notification": res["notification"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/cases/{case_id}/expire-sla")
def expire_sla(case_id: str):
    try:
        updated = engine.expire_sla(case_id)
        return {
            "success": True,
            "message": f"SLA Deadline elapsed! Routed to Alternate Stage",
            "data": updated
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/cases/{case_id}/manager-review")
def manager_review(case_id: str, req: ManagerReviewRequest):
    try:
        updated = engine.manager_review(case_id, req.action, req.managerNotes)
        return {"success": True, "message": f"Manager decision {req.action} recorded", "data": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/cases")
def get_cases(status: Optional[str] = None, email: Optional[str] = None, workQueue: Optional[str] = None):
    cases = engine.db.get("cases", [])
    if status:
        cases = [c for c in cases if c.get("caseStatus", "").lower() == status.lower()]
    if email:
        cases = [c for c in cases if c.get("customer", {}).get("email", "").lower() == email.lower()]
    if workQueue:
        cases = [c for c in cases if c.get("routedTo") == workQueue]
    return {"success": True, "count": len(cases), "data": cases}

@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    case_obj = next((c for c in engine.db.get("cases", []) if c.get("bookingID") == case_id), None)
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    notifs = [n for n in engine.db.get("notifications", []) if n.get("bookingID") == case_id]
    return {"success": True, "data": {**case_obj, "notifications": notifs}}

@app.get("/api/notifications")
def get_notifications(bookingID: Optional[str] = None):
    notifs = engine.db.get("notifications", [])
    if bookingID:
        notifs = [n for n in notifs if n.get("bookingID") == bookingID]
    return {"success": True, "data": notifs}

# --- Pega Prediction Studio & Customer Decision Hub (CDH) Endpoints ---
@app.post("/api/prediction-studio/predict-demand")
def predict_demand(req: DemandPredictionRequest):
    pred = prediction_studio.predict_seat_demand(
        req.showTime,
        req.isWeekend,
        req.theatreLocation,
        req.currentOccupancyPct,
        req.movieRating
    )
    return {"success": True, "data": pred}

@app.post("/api/cdh/next-best-action")
def get_nba(req: NBARequest):
    nba = prediction_studio.get_next_best_action(
        req.customerTier,
        req.numberOfTickets,
        req.totalAmount
    )
    return {"success": True, "data": nba}

@app.post("/api/admin/reset")
def reset_db():
    engine.load_data()
    return {"success": True, "message": "Database reloaded"}


# Mount static directory for Pega Cosmos UI
public_dir = os.path.join(os.path.dirname(__file__), "public")
if os.path.exists(public_dir):
    app.mount("/", StaticFiles(directory=public_dir, html=True), name="static")

if __name__ == "__main__":
    print("=======================================================")
    print("🐍 CineWave Entertainment – Pega Platform™ Python Server")
    print("🚀 Running at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("=======================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
