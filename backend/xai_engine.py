
import os
from google import genai
from dotenv import load_dotenv
from knowledge_base import CROP_INFO

import sys

# Load API Key
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
        print("DEBUG: XAI Engine loaded gemini-2.5-flash via google.genai")
        sys.stdout.flush()
    except Exception as e:
        print(f"DEBUG: Failed to init genai block: {e}")
        client = None
else:
    client = None

# Fallback Templates (used if API fails)
TEMPLATES = {
    "en": {
        "text": "Your soil is {soil}, suitable for {crop}. Weather ({temp:.1f}°C) is favorable.",
        "fert_label": "Fertilizer:", "prec_label": "Precaution:"
    },
    "hi": {
        "text": "आपकी मिट्टी {soil} है, जो {crop} के लिए उपयुक्त है। मौसम ({temp:.1f}°C) अनुकूल है।",
        "fert_label": "उर्वरक:", "prec_label": "सावधानी:"
    },
    "te": {
        "text": "మీ మట్టి {soil}, ఇది {crop} కు అనుకూలం. వాతావరణం ({temp:.1f}°C) బాగుంది.",
        "fert_label": "ఎరువులు:", "prec_label": "జాగ్రత్త:"
    },
    "ta": {
        "text": "உங்கள் மண் {soil}, இது {crop} பயிரிட ஏற்றது. வானிலை ({temp:.1f}°C) சாதகமாக உள்ளது.",
        "fert_label": "உரம்:", "prec_label": "முன்னெச்சரிக்கை:"
    }
}

def generate_explanation(crop, soil_type, weather_data, confidence, language="en"):
    """
    Generates a detailed explanation using Gemini API.
    """
    # 1. Fallback Logic
    if not client:
        return generate_fallback(crop, soil_type, weather_data, language)

    try:
        # 2. Construct Prompt for Gemini
        prompt = f"""
        You are an expert agronomist.
        Context:
        - Crop: {crop}
        - Soil Type: {soil_type}
        - Temperature: {weather_data.get('temperature')}°C
        - Rainfall: {weather_data.get('rainfall')}mm
        - Humidity: {weather_data.get('humidity')}%
        
        Task:
        Explain WHY this crop is suitable for this soil and weather in {language} language.
        Then provide 2 specific fertilizer tips and 1 precaution in specific bullet points.
        
        Format:
        [Explanation in {language}]
        
        {language} translation of "Recommendations":
        • [Fertilizer Tip 1]
        • [Fertilizer Tip 2]
        • [Precaution]
        
        Keep it concise (maximum 60 words).
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        text_response = response.text.strip()
        
        return {
            "text": text_response,
            "bullet_points": [] # Gemini response already formatted well
        }
        
    except Exception as e:
        print(f"Gemini XAI Error: {e}")
        return generate_fallback(crop, soil_type, weather_data, language)

def generate_fallback(crop, soil_type, weather_data, language):
    if language not in TEMPLATES: language = "en"
    t = TEMPLATES[language]
    
    # Simple Template Response
    base_text = t["text"].format(soil=soil_type, crop=crop, temp=weather_data.get('temperature', 25))
    
    # Append hardcoded details
    crop_lower = crop.lower()
    details = CROP_INFO.get(crop_lower, CROP_INFO["default"])[language]
    
    full_text = f"{base_text}\n\n{t['fert_label']} {details['fertilizer']}\n{t['prec_label']} {details['precautions']}"
    
    return {
        "text": full_text,
        "bullet_points": []
    }
