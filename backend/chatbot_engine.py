
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

def get_response(message, language='en'):
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
        full_prompt = f"{SYSTEM_PROMPT}\n\nUser ({language}): {message}\nSmart Kisan:"
        
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
