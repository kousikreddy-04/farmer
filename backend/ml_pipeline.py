import pickle
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array, load_img
from PIL import Image
import io
import os
import gc

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
CROP_MODEL_PATH = os.path.join(MODEL_DIR, "crop_model.pkl")
SOIL_MODEL_PATH = os.path.join(MODEL_DIR, "soil_model.h5")
MAPPING_PATH = os.path.join(MODEL_DIR, "soil_npk_mapping.json")

# Global variables for models
crop_model = None
soil_model = None
soil_classes = None
npk_mapping = None

def load_resources():
    global crop_model, npk_mapping
    print("Loading ML Resources...")
    
    try:
        with open(CROP_MODEL_PATH, "rb") as f:
            crop_model = pickle.load(f)
        print("Crop Model loaded.")
    except Exception as e:
        print(f"Failed to load crop model: {e}")

    # LAZY LOAD: Soil model NOT loaded at startup to save memory
    # It will be loaded on-demand when image analysis is requested
    print("Soil Model will be loaded on-demand (lazy loading)")

    try:
        with open(MAPPING_PATH, "r") as f:
            data = json.load(f)
            npk_mapping = data.get("mapping", {})
        print("NPK Mapping loaded.")
    except Exception as e:
        print(f"Failed to load NPK mapping: {e}")

def load_soil_model_lazy():
    """Load soil model only when needed"""
    global soil_model, soil_classes
    
    if soil_model is not None:
        return  # Already loaded
    
    try:
        print("Lazy-loading Soil Model...")
        soil_model = load_model(SOIL_MODEL_PATH)
        
        # Load classes
        with open(os.path.join(MODEL_DIR, "soil_classes.json"), "r") as f:
            indices = json.load(f)
            soil_classes = {v: k for k, v in indices.items()}
        
        print("Soil Model loaded successfully.")
    except Exception as e:
        print(f"Failed to lazy-load soil model: {e}")

def predict_soil_from_image(image_bytes):
    """
    Predicts soil type from image bytes.
    """
    # Lazy load soil model when needed
    load_soil_model_lazy()
    
    if soil_model is None:
        return "Unknown", 0.0

    try:
        # Preprocess
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((150, 150))
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0

        # Predict
        preds = soil_model.predict(img_array)
        class_idx = np.argmax(preds)
        confidence = float(np.max(preds))
        soil_type = soil_classes.get(class_idx, "Unknown")
        
        return soil_type, confidence
    except Exception as e:
        print(f"Error in soil prediction: {e}")
        return "Unknown", 0.0
    finally:
        # Force cleanup to save memory on Render free tier
        gc.collect()

def get_npk_for_soil(soil_type):
    """
    Returns (N, P, K) for a given soil type using the mapping.
    """
    if npk_mapping and soil_type in npk_mapping:
        vals = npk_mapping[soil_type]
        return vals.get("Nitrogen", 0), vals.get("Phosphorous", 0), vals.get("Potassium", 0)
    
    # Defaults
    return 40, 40, 40

def predict_crop(n, p, k, temp, humid, ph, rain):
    """
    Predicts crop based on inputs.
    """
    if crop_model is None:
        return "Model Not Loaded"

    # Input DataFrame with feature names to avoid warnings
    features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
    input_data = pd.DataFrame([[n, p, k, temp, humid, ph, rain]], columns=features)
    
    # Get probabilities
    probs = crop_model.predict_proba(input_data)[0]
    classes = crop_model.classes_

    # Get Top 3
    top_3_indices = np.argsort(probs)[-3:][::-1]
    top_3_crops = []
    
    for idx in top_3_indices:
        crop_name = classes[idx]
        confidence = float(probs[idx])
        top_3_crops.append({"crop": crop_name, "confidence": confidence})
    
    return top_3_crops

# Load on module import or explicit call
load_resources()
