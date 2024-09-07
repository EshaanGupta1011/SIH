from datetime import datetime
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
import logging

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Welcome to SIH Backend!"}

def create_sequences(data, time_steps=1):
    X, y = [], []
    for i in range(len(data) - time_steps):
        X.append(data[i:(i + time_steps), 0])
        y.append(data[i + time_steps, 0])
    return np.array(X), np.array(y)

def predict_load(custom_date, period_hours):

    try:
        df = pd.read_csv("./processed.csv")
        df['Datetime'] = pd.to_datetime(df['Datetime'], format="%Y-%m-%d %H:%M:%S")
        df.set_index(df['Datetime'], inplace=True)
        df = df.asfreq('15min')
        df.sort_index(inplace=True)
        logging.debug(f"Dataframe shape: {df.shape}")
    except Exception as e:
        logging.error("Error reading processed.csv", exc_info=e)
        raise HTTPException(status_code=500, detail="Error reading data file.")

    
    test_start = custom_date - pd.Timedelta(hours=2)
    test_end = custom_date + pd.Timedelta(hours=period_hours) - pd.Timedelta(minutes=15)
    test = df.loc[test_start:test_end]

    if test.empty:
        logging.error(f"Empty test dataset for date range {test_start} to {test_end}.")
        raise HTTPException(status_code=400, detail="The test dataset is empty for the provided date.")

    train_end = custom_date - pd.Timedelta(minutes=15)
    train = df.loc[:train_end]

    
    logging.debug(f"Training data shape: {train.shape}, Test data shape: {test.shape}")

    
    train_data = train['Load'].dropna().values.reshape(-1, 1)
    test_data = test['Load'].dropna().values.reshape(-1, 1)

    
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(train_data)
    test_scaled = scaler.transform(test_data)

    
    time_steps = 8
    X_test, y_test = create_sequences(test_scaled, time_steps)
    X_test = X_test.reshape(X_test.shape[0], X_test.shape[1], 1)
    logging.debug(f"X_test shape: {X_test.shape}, y_test shape: {y_test.shape}")

    
    try:
        model = load_model('./lstm_model_2_year.keras')
        predicted = model.predict(X_test)
        predicted_load = scaler.inverse_transform(predicted.reshape(-1, 1))
        actual_load = scaler.inverse_transform(y_test.reshape(-1, 1))
    except Exception as e:
        logging.error("Error in predicting load.", exc_info=e)
        raise HTTPException(status_code=500, detail="Error during model prediction.")
    

    logging.debug(f"Predicted load sample: {predicted_load.flatten()[:5]}")
    logging.debug(f"Actual load sample: {actual_load.flatten()[:5]}")

    return {
        "predicted_load": predicted_load.flatten().tolist(),
        "actual_load": actual_load.flatten().tolist()
    }

@app.get("/predict/day")
async def predict_day(date: str = Query(..., description="The starting date for prediction in YYYY-MM-DD format")):
    try:
        custom_date = pd.to_datetime(date)
        return JSONResponse(predict_load(custom_date, 24))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except HTTPException as e:
        raise e 

@app.get("/predict/week")
async def predict_week(date: str = Query(..., description="The starting date for prediction in YYYY-MM-DD format")):
    try:
        custom_date = pd.to_datetime(date)
        return JSONResponse(predict_load(custom_date, 24*7))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except HTTPException as e:
        raise 

@app.get("/predict/month")
async def predict_month(date: str = Query(..., description="The starting date for prediction in YYYY-MM-DD format")):
    try:
        custom_date = pd.to_datetime(date)
        return JSONResponse(predict_load(custom_date, 24*31))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    except HTTPException as e:
        raise e

if __name__ == "_main_":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)