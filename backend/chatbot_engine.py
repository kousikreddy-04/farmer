
import os
import google.generativeai as genai
from dotenv import load_dotenv

import sys

# Load API Key
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        print(f"DEBUG: Successfully loaded gemini-2.5-flash")
        sys.stdout.flush()
    except Exception as e:
        print(f"DEBUG: Failed to load model: {e}")
        sys.stdout.flush()
        model = None
else:
    model = None


SYSTEM_PROMPT = """
You are 'Smart Kisan', an expert agricultural AI assistant for Indian farmers. 
Your goal is to help farmers with crops, fertilizers, diseases, weather, and government schemes.
- Be helpful, polite, and concise.
- Answer in the SAME language as the user's question (English, Hindi, Telugu, Tamil, etc.).
- Provide practical, actionable advice.
- If asked about prices or subsidies, give general info and suggest checking official sources like e-NAM.
"""

def get_response(message, language='en'):
    """
    Generates a response using Gemini API.
    """
    print(f"DEBUG: Processing message: '{message}' in '{language}'")
    sys.stdout.flush()
    
    if not model:
        print(f"DEBUG: Model is None. API_KEY present: {bool(API_KEY)}")
        sys.stdout.flush()
        return f"DEBUG: Offline. Key Present: {bool(API_KEY)}. Path: {os.getcwd()}"

    try:
        # Construct Prompt
        full_prompt = f"{SYSTEM_PROMPT}\n\nUser ({language}): {message}\nSmart Kisan:"
        
        response = model.generate_content(full_prompt)
        reply = response.text.strip()
        print(f"DEBUG: Gemini Reply: {reply[:50]}...")
        sys.stdout.flush()
        return reply
        
    except Exception as e:
        print(f"Gemini Error: {e}")
        sys.stdout.flush()
        return f"DEBUG: Gemini Error: {str(e)}"
