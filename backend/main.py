from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import os

app = FastAPI(
    title="AutoValuate API",
    description="Used car price prediction API powered by a Random Forest model trained on CarDekho data",
    version="1.0.0"
)

# CORS - allow requests from any frontend (adjust in production to your domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model and columns at startup ──
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
model = joblib.load(os.path.join(MODEL_DIR, "car_price_model.pkl"))
model_columns = joblib.load(os.path.join(MODEL_DIR, "model_columns.pkl"))

# Brands the model was trained on (extracted from one-hot columns)
BRANDS = sorted([c.replace("brand_", "") for c in model_columns if c.startswith("brand_")])
# The dropped brand (first one alphabetically, due to drop_first=True) acts as the baseline
ALL_BRANDS_INCLUDING_BASELINE = sorted(BRANDS + ["Ambassador"])  # Ambassador was dropped as baseline

FUEL_TYPES = ["Diesel", "Petrol", "LPG", "CNG"]  # CNG is baseline (dropped)
SELLER_TYPES = ["Individual", "Trustmark Dealer", "Dealer"]  # Dealer is baseline (dropped)
TRANSMISSIONS = ["Manual", "Automatic"]  # Automatic is baseline (dropped)
OWNER_TYPES = ["Test Drive Car", "First Owner", "Second Owner", "Third Owner", "Fourth & Above Owner"]

OWNER_MAP = {
    "Test Drive Car": 0,
    "First Owner": 1,
    "Second Owner": 2,
    "Third Owner": 3,
    "Fourth & Above Owner": 4
}


class CarInput(BaseModel):
    brand: str = Field(..., description="Car brand/manufacturer")
    year: int = Field(..., ge=1990, le=2026, description="Manufacturing year")
    km_driven: int = Field(..., ge=0, le=500000, description="Total kilometers driven")
    fuel: str = Field(..., description="Fuel type: Diesel, Petrol, CNG, or LPG")
    seller_type: str = Field(..., description="Seller type: Individual, Dealer, or Trustmark Dealer")
    transmission: str = Field(..., description="Transmission: Manual or Automatic")
    owner: str = Field(..., description="Ownership history")
    mileage: float = Field(..., ge=0, le=50, description="Mileage in km/ltr/kg")
    engine: float = Field(..., ge=500, le=6000, description="Engine displacement in CC")
    max_power: float = Field(..., ge=20, le=500, description="Max power in BHP")
    seats: int = Field(..., ge=2, le=10, description="Number of seats")

    class Config:
        json_schema_extra = {
            "example": {
                "brand": "Maruti",
                "year": 2018,
                "km_driven": 45000,
                "fuel": "Petrol",
                "seller_type": "Individual",
                "transmission": "Manual",
                "owner": "First Owner",
                "mileage": 18.5,
                "engine": 1197,
                "max_power": 82.0,
                "seats": 5
            }
        }


class PredictionResponse(BaseModel):
    predicted_price: float
    predicted_price_formatted: str
    price_range_low: float
    price_range_high: float
    currency: str = "INR"


def build_feature_row(car: CarInput) -> pd.DataFrame:
    car_age = 2024 - car.year

    row = {col: 0 for col in model_columns}

    row["km_driven"] = car.km_driven
    row["mileage(km/ltr/kg)"] = car.mileage
    row["engine"] = car.engine
    row["max_power"] = car.max_power
    row["seats"] = car.seats
    row["car_age"] = max(car_age, 0)

    if car.owner not in OWNER_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid owner type. Must be one of {list(OWNER_MAP.keys())}")
    row["owner_encoded"] = OWNER_MAP[car.owner]

    # Fuel (one-hot, CNG is baseline/dropped)
    if car.fuel not in FUEL_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid fuel type. Must be one of {FUEL_TYPES}")
    if f"fuel_{car.fuel}" in row:
        row[f"fuel_{car.fuel}"] = 1

    # Seller type (Dealer is baseline/dropped)
    if car.seller_type not in SELLER_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid seller type. Must be one of {SELLER_TYPES}")
    if f"seller_type_{car.seller_type}" in row:
        row[f"seller_type_{car.seller_type}"] = 1

    # Transmission (Automatic is baseline/dropped)
    if car.transmission not in TRANSMISSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid transmission. Must be one of {TRANSMISSIONS}")
    if f"transmission_{car.transmission}" in row:
        row[f"transmission_{car.transmission}"] = 1

    # Brand (Ambassador is baseline/dropped)
    brand_col = f"brand_{car.brand}"
    if car.brand not in ALL_BRANDS_INCLUDING_BASELINE:
        raise HTTPException(status_code=400, detail=f"Unknown brand '{car.brand}'. Must be one of {ALL_BRANDS_INCLUDING_BASELINE}")
    if brand_col in row:
        row[brand_col] = 1
    # if brand is "Ambassador" (the dropped baseline), all brand_* columns stay 0 — correct

    df = pd.DataFrame([row])
    df = df[model_columns]  # ensure correct column order
    return df


@app.get("/")
def root():
    return {
        "service": "AutoValuate API",
        "status": "online",
        "model_r2_score": 0.9592,
        "endpoints": ["/predict", "/options", "/docs"]
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/options")
def get_options():
    """Returns valid input options for dropdowns in the frontend."""
    return {
        "brands": ALL_BRANDS_INCLUDING_BASELINE,
        "fuel_types": FUEL_TYPES,
        "seller_types": SELLER_TYPES,
        "transmissions": TRANSMISSIONS,
        "owner_types": OWNER_TYPES,
        "year_range": {"min": 1990, "max": 2024},
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_price(car: CarInput):
    try:
        X = build_feature_row(car)
        prediction = model.predict(X)[0]
        prediction = max(prediction, 0)

        # Use model's tree variance for a rough confidence range
        tree_predictions = [tree.predict(X)[0] for tree in model.estimators_]
        low = max(min(tree_predictions), 0)
        high = max(tree_predictions)

        return PredictionResponse(
            predicted_price=round(prediction, 2),
            predicted_price_formatted=f"₹{prediction:,.0f}",
            price_range_low=round(low, 2),
            price_range_high=round(high, 2),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
