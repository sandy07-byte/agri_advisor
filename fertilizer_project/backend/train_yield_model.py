import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
from sklearn.metrics import mean_squared_error
import joblib
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

DATA_PATH = os.path.join(os.path.dirname(__file__), '../dataset/crop_yield.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../ml_model/yield_model.pkl')


def ensure_dir_exists(path):
    dir_path = os.path.dirname(path)
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        logging.info(f"Created directory: {dir_path}")


def load_and_clean_data(csv_path):
    logging.info(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    logging.info(f"Initial shape: {df.shape}")
    df = df.dropna()
    logging.info(f"After dropping NA: {df.shape}")
    numeric_cols = ['Area', 'Annual_Rainfall', 'Fertilizer', 'Pesticide', 'Yield']
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna()
    df = df[df['Area'] > 0]
    logging.info(f"After numeric conversion and Area filter: {df.shape}")
    return df


def prepare_features(df):
    X_num = df[['Area', 'Annual_Rainfall', 'Fertilizer', 'Pesticide']]
    X_cat = pd.get_dummies(df[['Crop', 'Season', 'State']], drop_first=True)
    X = pd.concat([X_num, X_cat], axis=1)
    y = df['Yield']
    return X, y


def train_and_evaluate(X, y):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    logging.info(f"R2 Score: {r2:.4f}")
    logging.info(f"Mean Absolute Error: {mae:.4f}")
    logging.info(f"RMSE: {rmse:.4f}")
    print(f"\nModel Evaluation:\nR2 Score: {r2:.4f}\nMean Absolute Error: {mae:.4f}\nRMSE: {rmse:.4f}\n")
    return model, X


def save_model(model, X, path):
    ensure_dir_exists(path)
    model_dict = {
        "model": model,
        "columns": X.columns.tolist()
    }
    joblib.dump(model_dict, path)
    logging.info(f"Model saved to: {path}")


def main():
    df = load_and_clean_data(DATA_PATH)
    print("\nYield column statistics:")
    print(df["Yield"].describe())
    # Sample for faster training if large
    if len(df) > 5000:
        df = df.sample(5000, random_state=42)
        print("\nSampled 5000 rows for faster training.")
    X, y = prepare_features(df)
    model, X_full = train_and_evaluate(X, y)
    save_model(model, X_full, MODEL_PATH)
    print("Yield prediction model training complete and saved successfully.")


if __name__ == "__main__":
    main()
