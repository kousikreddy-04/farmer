
import os
from google import genai
from dotenv import load_dotenv

import sys

# Load API Key
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY)
        print(f"DEBUG: Successfully loaded client for gemini-2.5-flash via google.genai")
        sys.stdout.flush()
    except Exception as e:
        print(f"DEBUG: Failed to init client: {e}")
        sys.stdout.flush()
        client = None
else:
    client = None


SYSTEM_PROMPT = """
You are 'Smart Kisan', an expert agricultural AI assistant for Indian farmers. 
Your goal is to help farmers with crops, fertilizers, diseases, weather, and government schemes.
- Be helpful, polite, and concise.
- Answer in the SAME language as the user's question (English, Hindi, Telugu, Tamil, etc.).
- Provide practical, actionable advice.
- If asked about prices or subsidies, give general info and suggest checking official sources like e-NAM.
"""

def get_response(message, language='en', cultivation_context=None):
    """
    Generates a response using Gemini API.
    """
    print(f"DEBUG: Processing message: '{message}' in '{language}'")
    sys.stdout.flush()
    
    if not client:
        print(f"DEBUG: Client is None. API_KEY present: {bool(API_KEY)}")
        sys.stdout.flush()
        return f"DEBUG: Offline. Key Present: {bool(API_KEY)}. Path: {os.getcwd()}"

    try:
        # Construct Prompt
        dynamic_system_prompt = SYSTEM_PROMPT
        if cultivation_context:
            dynamic_system_prompt += f"\n\nIMPORTANT CONTEXT: The user is currently cultivating {cultivation_context}. Keep this in mind for all your advice."
        
        full_prompt = f"{dynamic_system_prompt}\n\nUser ({language}): {message}\nSmart Kisan:"
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        reply = response.text.strip()
        print(f"DEBUG: Gemini Reply: {reply[:50]}...")
        sys.stdout.flush()
        return reply
        
    except Exception as e:
        print(f"Gemini Error: {e}")
        sys.stdout.flush()
        return f"DEBUG: Gemini Error: {str(e)}"

def generate_cultivation_schedule(crop_name):
    """
    Generates a generic farming schedule for a given crop in JSON format.
    Output: [{'task_name': 'Sowing', 'days_from_start': 0}, ...]
    """
    if not client:
        print("DEBUG: Client is None.")
        return []
    
    prompt = f"""
    You are an expert agronomist. The user is starting a '{crop_name}' cultivation.
    Generate a simple chronological task schedule for this crop from sowing to harvest.
    Return ONLY a valid JSON array of objects. Do not include markdown formatting or backticks.
    Format:
    [
      {{"task_name": "Prepare Soil & Sowing", "days_from_start": 0}},
      {{"task_name": "First Watering", "days_from_start": 2}},
      {{"task_name": "Add Nitrogen Fertilizer", "days_from_start": 15}},
      {{"task_name": "Harvest", "days_from_start": 90}}
    ]
    Keep it to 5-8 major tasks.
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        import json
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        print(f"Schedule Gen Error: {e}")
        return []
