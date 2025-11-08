# Fertilizer Project

A minimal, end-to-end scaffold:

- ml_model: data + training script producing a `fertilizer_model.pkl`
- backend: FastAPI API exposing `/predict`
- frontend: React + Vite app to submit inputs and display prediction

## Prerequisites

- Python 3.9+
- Node.js 18+

## First-time setup

1) Train the model (optional; backend can auto-train if missing):

```
cd ml_model
python model_train.py
```

This writes `fertilizer_model.pkl` into `ml_model/`.

2) Start everything (Windows):

Double-click `run_all.bat` or run:

```
run_all.bat
```

It will:

- Create/activate a Python venv
- Install backend requirements
- Start FastAPI at http://127.0.0.1:8000
- Install frontend deps and start Vite dev server (default http://127.0.0.1:5173)

## Manual run

Backend:

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```
cd frontend
npm install
npm run dev
```

## Predict endpoint
- Method: POST `/predict`
- Body (JSON) example:
```
{
  "N": 90,
  "P": 40,
  "K": 40,
  "pH": 6.5,
  "moisture": 25
}
```
- Response:
```
{
  "prediction": "Urea"
}
```

Notes:
- If `fertilizer_model.pkl` is missing, the backend will attempt to train it automatically using `ml_model/model_train.py` and `data_core.csv`.
