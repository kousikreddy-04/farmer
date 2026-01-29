import pandas as pd
import json
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import os

# Paths (Adjusted for Windows)
DATA_PATH = r"D:\farmers\backend\datasets"
CROP_CSV = os.path.join(DATA_PATH, "Crop_recommendation.csv")
DATA_CORE_CSV = os.path.join(DATA_PATH, "data_core.csv")
MODEL_PATH = "backend/models"

def train_crop_model():
    print("Loading Crop Data...")
    try:
        df = pd.read_csv(CROP_CSV)
    except FileNotFoundError:
        print(f"Error: {CROP_CSV} not found.")
        return

    # Features: N, P, K, temperature, humidity, ph, rainfall
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)

    preds = rf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Crop Model Accuracy: {acc:.4f}")

    # Save Model
    if not os.path.exists(MODEL_PATH):
        os.makedirs(MODEL_PATH)
    
    with open(os.path.join(MODEL_PATH, "crop_model.pkl"), "wb") as f:
        pickle.dump(rf, f)
    print("Crop Model Saved.")

def build_npk_mapping():
    print("Building NPK Mapping from data_core.csv...")
    try:
        df = pd.read_csv(DATA_CORE_CSV)
    except FileNotFoundError:
        print(f"Error: {DATA_CORE_CSV} not found.")
        return

    # Clean columns: 'Soil Type', 'Nitrogen', 'Phosphorous', 'Potassium'
    # Check actual columns from snippet: 'Soil Type', 'Nitrogen', 'Potassium', 'Phosphorous'
    # Note: 'Temparature', 'Humidity' etc are also there.
    
    # Normalize column names just in case
    df.columns = df.columns.str.strip()
    
    # Group by Soil Type
    # We want Mean N, P, K for imputing
    grouped = df.groupby('Soil Type')[['Nitrogen', 'Phosphorous', 'Potassium']].mean()
    mapping = grouped.to_dict('index')

    train_meta = {
        "mapping": mapping,
        "soil_types": list(mapping.keys())
    }

    with open(os.path.join(MODEL_PATH, "soil_npk_mapping.json"), "w") as f:
        json.dump(train_meta, f, indent=4)
    print("NPK Mapping Saved:", mapping)

if __name__ == "__main__":
    train_crop_model()
    build_npk_mapping()
