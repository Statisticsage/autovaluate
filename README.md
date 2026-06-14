# AutoValuate — Used Car Price Predictor

> Get an instant, AI-driven price estimate for any used car, with a live 3D visualization of where it sits in the market.

**Built by:** James Clarence Hena Baysah · [Portfolio](https://baysahtech.vercel.app)

---

## What This Is

A full-stack ML application:
1. **Model:** Random Forest Regressor (R² = 0.96) trained on 7,749 real CarDekho used car listings
2. **Backend:** FastAPI service that loads the model and serves predictions via REST API
3. **Frontend:** React app — clean form for car details, live price estimate with count-up animation, and a 3D scatter plot (Three.js) showing how the car compares to the broader market

---

## Project Structure

```
autovaluate/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── requirements.txt
│   ├── render.yaml           # Render deploy config
│   └── model/
│       ├── car_price_model.pkl
│       └── model_columns.pkl
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main component
    │   ├── App.module.css     # Styles (indigo + amber fintech theme)
    │   ├── index.css           # Design tokens
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## How the Model Works

**Dataset:** [CarDekho used car listings](https://www.cardekho.com) — 8,128 rows → cleaned to 7,749 (removed missing values + top 1% price/mileage outliers)

**Features (43 total):**
- Numeric: km driven, mileage, engine CC, max power (BHP), seats, car age, owner rank
- Categorical (one-hot): fuel type, seller type, transmission, brand (31 brands)

**Feature importance:**
| Feature | Importance |
|---|---|
| Max power (BHP) | 67.9% |
| Car age | 13.2% |
| Km driven | 9.2% |
| Mileage | 2.3% |
| Brand (combined) | ~4% |

**Key insight:** Engine power is the dominant price signal — it acts as a proxy for vehicle segment/luxury positioning, more directly than brand or fuel type alone.

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test it: open `http://localhost:8000/docs` for interactive API docs.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to `http://localhost:8000` automatically.

---

## API Reference

### `POST /predict`

```json
{
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
```

**Response:**
```json
{
  "predicted_price": 612660.0,
  "predicted_price_formatted": "₹612,660",
  "price_range_low": 350000.0,
  "price_range_high": 850000.0,
  "currency": "INR"
}
```

### `GET /options`
Returns valid dropdown values (brands, fuel types, etc.)

---

## Deployment

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Go to [render.com](https://render.com) → New → Web Service → connect repo
3. Render will detect `render.yaml` automatically — or set manually:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy — copy your live API URL (e.g. `https://autovaluate-api.onrender.com`)

> **Note:** Free tier services on Render sleep after inactivity — the first request after idle may take 30-60 seconds to wake up.

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → import repo
3. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
4. Deploy

---

## Portfolio Case Study

**Problem:** Used car buyers and sellers lack an accessible, data-driven way to verify if a price is fair.

**Solution:** A full ML pipeline — from raw data cleaning through model training to a deployed prediction API and interactive frontend — that estimates a fair market price in real-time, with a 3D visualization showing how the car compares to thousands of real listings.

**Skills demonstrated:**
- Data cleaning & exploratory analysis (pandas, outlier handling, feature engineering)
- ML model training & evaluation (scikit-learn, Random Forest, R²/MAE/RMSE)
- API development (FastAPI, Pydantic validation)
- Full-stack integration (React ↔ FastAPI)
- 3D data visualization (Three.js)
- Deployment (Render + Vercel)

**Result:** R² of 0.96 — the model explains 96% of price variation in the dataset, with predictions typically within ~14% of actual listing price.

---

## License

MIT
