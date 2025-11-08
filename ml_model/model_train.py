import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import joblib

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data_core.csv')
model_path = os.path.join(os.path.dirname(__file__), "../ml_model/fertilizer_model.pkl")
model = joblib.load(model_path)



def train_and_save_model(data_path: str = DATA_PATH, model_path: str = MODEL_PATH) -> str:
    df = pd.read_csv(data_path)
    X = df[["N", "P", "K", "pH", "moisture"]]
    y = df["label"]

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.3, random_state=42)

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Validation accuracy: {acc:.2f}")

    joblib.dump({"model": clf, "label_encoder": le}, model_path)
    print(f"Model saved to: {model_path}")
    return model_path


if __name__ == "__main__":
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    train_and_save_model()
