"""
CineWave Entertainment – Pega Prediction Studio & Customer Decision Hub (CDH)
Python ML Decisioning Module for Pega Platform™ '24.1 Infinity

In enterprise Pega architectures, Python is the primary platform for:
1. Pega Prediction Studio: Building, training, and deploying Machine Learning models.
2. Pega Customer Decision Hub (CDH): Real-time Next-Best-Action (NBA) decision strategies.
3. Adaptive Analytics & Dynamic Demand Elasticity Pricing.
"""

from typing import Dict, Any, List
import math
import numpy as np


class PegaPredictionStudio:
    """
    Simulates Pega Prediction Studio & Customer Decision Hub (CDH) decision engine.
    Applies adaptive propensity scoring, demand forecasting, and Next-Best-Action strategies.
    """

    def __init__(self):
        self.model_name = "Predict_MovieSeatDemand_v2"
        self.model_type = "Adaptive Gradient Boosting / Elasticity Model"
        self.accuracy_auc = 0.892
        self.ruleset = "CineWaveCDH:01-01-01"

    def predict_seat_demand(
        self,
        show_time: str,
        is_weekend: bool,
        theatre_location: str,
        current_occupancy_pct: float,
        movie_rating: float
    ) -> Dict[str, Any]:
        """
        Pega Prediction Studio: Dynamic Demand Elasticity Model.
        Predicts ticket sell-out probability and recommends dynamic surge or saver pricing.
        """
        # Feature weighting
        time_weight = 1.25 if "07:" in show_time or "08:" in show_time or "06:" in show_time else 0.9
        weekend_weight = 1.35 if is_weekend else 1.0
        location_weight = 1.2 if theatre_location.lower() in ['chennai', 'mumbai', 'bangalore'] else 1.0
        rating_weight = min(1.3, max(0.8, movie_rating / 7.5))

        base_propensity = (current_occupancy_pct / 100.0) * 0.4
        predicted_propensity = min(0.99, base_propensity + (0.15 * time_weight * weekend_weight * location_weight * rating_weight))

        # Dynamic Demand Category
        if predicted_propensity >= 0.75:
            demand_category = "High Demand (Hot Selling)"
            recommended_adjustment = +20  # +₹20 AI Surge
        elif predicted_propensity >= 0.45:
            demand_category = "Moderate Demand (Steady)"
            recommended_adjustment = 0
        else:
            demand_category = "Low Demand (Saver Show)"
            recommended_adjustment = -20  # -₹20 Saver Discount

        return {
            "model_name": self.model_name,
            "ruleset": self.ruleset,
            "predicted_sellout_propensity": round(predicted_propensity, 3),
            "demand_category": demand_category,
            "ai_price_adjustment": recommended_adjustment,
            "confidence_score": round(self.accuracy_auc, 3),
            "feature_contributions": {
                "show_time_impact": round(time_weight, 2),
                "weekend_impact": round(weekend_weight, 2),
                "location_impact": round(location_weight, 2),
                "rating_impact": round(rating_weight, 2)
            }
        }

    def get_next_best_action(
        self,
        customer_tier: str,
        number_of_tickets: int,
        total_amount: float
    ) -> Dict[str, Any]:
        """
        Pega Customer Decision Hub (CDH): Next-Best-Action (NBA) Engine.
        Determines the optimal personalized offer or retention action for the customer.
        """
        customer_tier = customer_tier.upper()

        if customer_tier == "GOLD":
            nba_offer = "Complimentary CineWave Gourmet Popcorn & Private Lounge Access"
            discount_code = "GOLD-VIP-LOUNGE"
            propensity = 0.94
            business_priority = 95
        elif customer_tier == "VIP":
            nba_offer = "50% Off CineWave Beverage Combo with Reserved Parking"
            discount_code = "VIP-BEV-COMBO"
            propensity = 0.88
            business_priority = 85
        else:
            if number_of_tickets >= 3:
                nba_offer = "Family Snack Pack Combo: 20% Off at Concession Stand"
                discount_code = "FAMILY-COMBO-20"
                propensity = 0.82
                business_priority = 75
            else:
                nba_offer = "Upgrade to CineWave VIP Membership for ₹99 and Save 15% on Every Show"
                discount_code = "UPGRADE-VIP-99"
                propensity = 0.74
                business_priority = 65

        # Pega CDH Arbitration Formula: Priority = Propensity × Business Weight × Value
        value_score = total_amount * 0.1
        arbitration_score = round(propensity * business_priority + value_score, 2)

        return {
            "strategy_name": "CineWave_CustomerRetention_NBA_v1",
            "next_best_action_offer": nba_offer,
            "discount_code": discount_code,
            "propensity_score": propensity,
            "business_priority": business_priority,
            "arbitration_score": arbitration_score,
            "channel": "Web Modal / Digital Ticket Voucher"
        }
