from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import ml_pipeline
import weather_service
import xai_engine

app = Flask(__name__)
CORS(app)

import os
from dotenv import load_dotenv

load_dotenv()

# --- DATABASE CONNECTION ---
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "farmers"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

# Global flag to track DB status
DB_AVAILABLE = False

def get_db_connection():
    global DB_AVAILABLE
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        DB_AVAILABLE = True
        return conn
            
    except Exception as e:
        print(f"DB Connection Error: {e}")
        DB_AVAILABLE = False
        return None

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt

# --- CONFIG ---
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-this") 
jwt = JWTManager(app)

# Helper: Hash Password
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Helper: Check Password
def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# --- AUTH ENDPOINTS ---

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    phone = data.get('phone')
    password = data.get('password')
    location = data.get('location', '')
    
    if not name or not phone or not password:
        return jsonify({"status": "error", "message": "Missing fields"}), 400
        
    conn = get_db_connection()
    if not conn: return jsonify({"status": "error", "message": "DB Error"}), 500
    
    try:
        cur = conn.cursor()
        # Check if phone exists
        cur.execute("SELECT id FROM Users WHERE phone = %s", (phone,))
        if cur.fetchone():
            return jsonify({"status": "error", "message": "Phone already registered"}), 400
            
        hashed = hash_password(password)
        cur.execute(
            "INSERT INTO Users (name, phone, password_hash, location) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, phone, hashed, location)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        token = create_access_token(identity=str(user_id))
        return jsonify({"status": "success", "token": token, "user": {"name": name, "phone": phone, "location": location}})
        
    except Exception as e:
        print(f"Register Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    phone = data.get('phone')
    password = data.get('password')
    
    conn = get_db_connection()
    if not conn: return jsonify({"status": "error", "message": "DB Error"}), 500
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM Users WHERE phone = %s", (phone,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if user and user.get('password_hash') and check_password(password, user['password_hash']):
            token = create_access_token(identity=str(user['id']))
            return jsonify({
                "status": "success", 
                "token": token, 
                "user": {
                    "name": user['name'], 
                    "phone": user['phone'], 
                    "location": user.get('location', ''),
                    "profile_pic": user.get('profile_pic')
                }
            })
        else:
             return jsonify({"status": "error", "message": "Invalid Login"}), 401
             
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/profile', methods=['GET', 'POST'])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn: return jsonify({"message": "DB Error"}), 500
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if request.method == 'POST':
            data = request.json
            name = data.get('name')
            location = data.get('location')
            profile_pic = data.get('profile_pic') # New field
            
            cur.execute(
                "UPDATE Users SET name = %s, location = %s, profile_pic = %s WHERE id = %s",
                (name, location, profile_pic, user_id)
            )
            conn.commit()
            
            # Fetch updated user
            cur.execute("SELECT name, phone, location, profile_pic FROM Users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            cur.close()
            conn.close()
            return jsonify({"status": "success", "user": user})
            
        else: # GET
            cur.execute("SELECT name, phone, location, profile_pic FROM Users WHERE id = %s", (user_id,))
            user = cur.fetchone()
            cur.close()
            conn.close()
            if user:
                return jsonify(user)
            else:
                return jsonify({"message": "User not found"}), 404
                
    except Exception as e:
        print(f"Profile Error: {e}")
        return jsonify({"message": str(e)}), 500

# Initialize DB Table (Safety check)
# Initialize DB Table (Safety check)
def init_db():
    conn = get_db_connection()
    if conn:
        try:
            # Use absolute path for robustness on Render
            base_dir = os.path.dirname(os.path.abspath(__file__))
            schema_path = os.path.join(base_dir, 'schema.sql')
            
            with open(schema_path, 'r') as f:
                schema = f.read()
            cur = conn.cursor()
            cur.execute(schema)
            conn.commit()
            cur.close()
            conn.close()
            print("Database initialized successfully.")
        except Exception as e:
            print(f"Schema Init Error: {e}")
    else:
        print("WARNING: Running without Database. functionality will be limited.")

# Try to init on start (Only once)
init_db()

@app.route('/')
def home():
    return "AI Crop Recommendation System (PostgreSQL Enabled) is Running."

# --- ENDPOINTS ---

@app.route('/weather', methods=['GET'])
def get_weather_endpoint():
    """Fetch real-time weather for the provided lat/lon"""
    try:
        lat = request.args.get('lat', type=float)
        lon = request.args.get('lon', type=float)
        if not lat or not lon:
            return jsonify({'error': 'Missing lat/lon'}), 400
        
        weather = weather_service.get_current_weather(lat, lon)
        return jsonify(weather)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """Fetch past recommendations for logged-in user"""
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn:
        return jsonify([]) 

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT recommended_crops, timestamp, soil_type, full_response FROM Recommendations WHERE user_id = %s ORDER BY timestamp DESC LIMIT 20", (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        # Format for frontend
        history = []
        for row in rows:
            history.append({
                "recommended_crops": row['recommended_crops'],
                "timestamp": row['timestamp'].strftime("%Y-%m-%d %H:%M"),
                "soil_assessment": {"type": row['soil_type']},
                "full_response": row['full_response']
            })
        return jsonify(history)
    except Exception as e:
        print(f"History Fetch Error: {e}")
        return jsonify([])

import chatbot_engine

@app.route('/chat', methods=['POST'])
def chat_bot():
    """Smart Multilingual Chatbot"""
    data = request.json
    user_msg = data.get('message', '')
    language = data.get('language', 'en')
    
    reply = chatbot_engine.get_response(user_msg, language)
        
    return jsonify({"reply": reply})

@app.route('/predict_soil', methods=['POST'])
def predict_soil():
    # Keep existing implementation if needed, but not primary
    return jsonify({"error": "Use /recommend_hybrid"}), 400

from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

@app.route('/recommend_hybrid', methods=['POST'])
def recommend_hybrid():
    """
    Hybrid endpoint with DB Persistence (User Aware)
    """
    try:
        # Try to get user identity if token exists (Optional Auth)
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except:
            user_id = None

        data = request.json
        lat = data.get('lat')
        lon = data.get('lon')
        image_base64 = data.get('image_base64')
        
        # ... (rest of logic unchanged until save)

        # 1. Weather
        weather = weather_service.get_current_weather(lat, lon)
        if data.get('temperature'):
            weather['temperature'] = float(data.get('temperature'))
        
        # 2. Soil Analysis
        soil_type = "Unknown"
        soil_conf = 0.0
        
        if image_base64:
            try:
                print("DEBUG: Attempting soil analysis...")
                image_bytes = base64.b64decode(image_base64)
                soil_type, soil_conf = ml_pipeline.predict_soil_from_image(image_bytes)
                print(f"DEBUG: Soil type: {soil_type}")
            except Exception as e:
                print(f"WARN: Soil prediction failed: {e}")
                soil_type = data.get('soil_type', 'Loamy')
        else:
            soil_type = data.get('soil_type', 'Loamy')
            
        # 3. NPK Inference
        if 'N' in data and data['N']:
            n, p, k = float(data['N']), float(data['P']), float(data['K'])
        else:
            n, p, k = ml_pipeline.get_npk_for_soil(soil_type)
            
        ph = float(data.get('ph', 7.0))
        
        # 4. Predict Crops
        top_crops = ml_pipeline.predict_crop(
            n, p, k, 
            weather['temperature'], 
            weather['humidity'], 
            ph, 
            weather['rainfall']
        )
        
        # 5. XAI & Formatting
        recommendations = []
        language = data.get('language', 'en')
        for item in top_crops:
            exp = xai_engine.generate_explanation(
                item['crop'], soil_type, weather, item['confidence'], language=language
            )
            recommendations.append({
                "crop": item['crop'],
                "confidence": item['confidence'],
                "suitability": "High" if item['confidence'] > 0.7 else "Medium",
                "explanation": exp
            })
            
        RISK_TEMPLATES = {
            "en": {
                "high_humidity": "Possible pests due to high humidity",
                "normal": "Normal risks",
                "drainage": "Ensure proper drainage",
                "organic": "Use organic fertilizers"
            },
            "hi": {
                "high_humidity": "उच्च आर्द्रता के कारण कीटों का खतरा",
                "normal": "सामान्य जोखिम",
                "drainage": "उचित जल निकासी सुनिश्चित करें",
                "organic": "जैविक उर्वरकों का प्रयोग करें"
            },
             "te": {
                "high_humidity": "ఎక్కువ తేమ కారణంగా చీడపీడల రావచ్చు",
                "normal": "సాధారణ ప్రమాదాలు",
                "drainage": "సరైన నీటి పారుదల ఉండేలా చూసుకోండి",
                "organic": "సేంద్రీయ ఎరువులు వాడండి"
            },
            "ta": {
                "high_humidity": "அதிக ஈரப்பதம் காரணமாக பூச்சிகள் வரலாம்",
                "normal": "சாதாரண இடர்கள்",
                "drainage": "சரியான வடிகால் வசதி செய்யுங்கள்",
                "organic": "இயற்கை உரங்களைப் பயன்படுத்துங்கள்"
            }
        }
        
        # Fallback to English if lang not found
        rt = RISK_TEMPLATES.get(language, RISK_TEMPLATES["en"])
        
        risks_precautions = {
            "risks": [rt["high_humidity"] if weather['humidity'] > 80 else rt["normal"]],
            "precautions": [rt["drainage"], rt["organic"]]
        }
        
        result = {
            "soil_assessment": {
                "type": soil_type,
                "confidence": float(soil_conf),
                "inferred_npk": {"N": n, "P": p, "K": k},
                "moisture": "High" if weather['rainfall'] > 100 else "Medium",
                "fertility": "High" if n > 50 else "Medium"
            },
            "weather_summary": {
                "temperature": weather['temperature'],
                "rainfall": weather['rainfall'],
                "humidity": weather['humidity'],
                "season": "Kharif"
            },
            "recommended_crops": recommendations,
            "risks_precautions": risks_precautions,
            "timestamp": "Just Now"
        }
        
        # --- SAVE TO DB ---
        conn = get_db_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO Recommendations (user_id, latitude, longitude, soil_type, weather_json, recommended_crops, full_response)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (user_id if user_id else None, lat, lon, soil_type, json.dumps(weather), json.dumps(recommendations), json.dumps(result)))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                print(f"DB Save Error: {e}")
        
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
