import requests
import os

from dotenv import load_dotenv
load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

def get_current_weather(lat, lon):
    """
    Fetches real-time weather from OpenWeatherMap.
    Returns: {'temperature': 25, 'humidity': 60, 'rainfall': 100} (rainfall estimated)
    """
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url)
        data = response.json()
        
        if response.status_code == 200:
            return {
                "temperature": data['main']['temp'],
                "humidity": data['main']['humidity'],
                "rainfall": 200.0, # Placeholder
                "location": data.get("name", "Unknown Location")
            }
    except Exception as e:
        print(f"Weather API Error: {e}")
    
    # Fallback to regional averages
    return {"temperature": 30.0, "humidity": 70.0, "rainfall": 150.0}
