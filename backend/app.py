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

from datetime import timedelta
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt

# --- CONFIG ---
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-this") 
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
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
    """Smart Multilingual Chatbot (Context Aware)"""
    data = request.json
    user_msg = data.get('message', '')
    language = data.get('language', 'en')
    
    cultivation_context = None
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("SELECT crop_name FROM Cultivations WHERE user_id = %s AND status = 'ACTIVE' LIMIT 1", (user_id,))
                res = cur.fetchone()
                if res:
                    cultivation_context = res[0]
                cur.close()
                conn.close()
    except Exception as e:
        print(f"Chat Context Error: {e}")
    
    reply = chatbot_engine.get_response(user_msg, language, cultivation_context)
    
    if user_id:
        try:
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("INSERT INTO Chats (user_id, message, is_bot) VALUES (%s, %s, %s)", (user_id, user_msg, False))
                cur.execute("INSERT INTO Chats (user_id, message, is_bot) VALUES (%s, %s, %s)", (user_id, reply, True))
                conn.commit()
                cur.close()
                conn.close()
        except Exception as e:
            print(f"Chat Save Error: {e}")
        
    return jsonify({"reply": reply})

@app.route('/chat_history', methods=['GET'])
@jwt_required()
def get_chat_history():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn: return jsonify([])
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT message, is_bot FROM Chats WHERE user_id = %s ORDER BY id ASC", (user_id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        history = [{"text": r['message'], "isBot": r['is_bot']} for r in rows]
        return jsonify(history)
    except Exception as e:
        print(f"Chat History Error: {e}")
        return jsonify([])

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
        except Exception as jwt_err:
            print(f"DEBUG: JWT Validation Failed: {jwt_err}")
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
                print(f"DEBUG: Soil type: {soil_type} (conf: {soil_conf})")
                
                if soil_conf < 0.5:
                    return jsonify({"error": "The image doesn't clearly look like recognizable soil. Please upload a clearer photo of the ground.", "status": "error"}), 400
                    
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


# --- CULTIVATION & LEDGER ENDPOINTS ---
@app.route('/api/cultivation/start', methods=['POST'])
@jwt_required()
def start_cultivation():
    user_id = get_jwt_identity()
    data = request.json
    crop_name = data.get('crop_name')
    
    if not crop_name:
         return jsonify({"error": "Crop name required"}), 400
         
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Error"}), 500
    
    try:
        cur = conn.cursor()
        # Mark others as completed
        cur.execute("UPDATE Cultivations SET status = 'COMPLETED' WHERE user_id = %s AND status = 'ACTIVE'", (user_id,))
        # Insert new cultivation
        cur.execute("INSERT INTO Cultivations (user_id, crop_name) VALUES (%s, %s) RETURNING id", (user_id, crop_name))
        cultivation_id = cur.fetchone()[0]
        
        # Ask Gemini to generate schedule
        tasks = chatbot_engine.generate_cultivation_schedule(crop_name)
        
        from datetime import datetime, timedelta
        for t in tasks:
            days = t.get('days_from_start', 0)
            task_date = datetime.now() + timedelta(days=days)
            cur.execute("INSERT INTO Schedules (cultivation_id, task_name, due_date) VALUES (%s, %s, %s)",
                       (cultivation_id, t.get('task_name'), task_date.strftime('%Y-%m-%d')))
                       
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": f"Started {crop_name}", "tasks": len(tasks)})
    except Exception as e:
        print(f"Cultivation Start Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cultivation/active', methods=['GET'])
@jwt_required()
def get_active_cultivation():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Error"}), 500
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM Cultivations WHERE user_id = %s AND status = 'ACTIVE' LIMIT 1", (user_id,))
        active_crop = cur.fetchone()
        
        if not active_crop:
            return jsonify({"status": "none"})
            
        cur.execute("SELECT * FROM Schedules WHERE cultivation_id = %s ORDER BY due_date", (active_crop['id'],))
        schedules = cur.fetchall()
        
        cur.execute("SELECT * FROM Ledgers WHERE cultivation_id = %s ORDER BY date DESC", (active_crop['id'],))
        ledgers = cur.fetchall()
        
        cur.close()
        conn.close()
        
        # Format dates for JSON
        for s in schedules: s['due_date'] = str(s['due_date'])
        for l in ledgers: 
            l['date'] = str(l['date'])
            l['amount'] = float(l['amount'])
            
        return jsonify({
            "status": "active",
            "cultivation": active_crop,
            "schedules": schedules,
            "ledgers": ledgers
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cultivation/schedule/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_schedule(task_id):
    completed = request.json.get('completed', True)
    conn = get_db_connection()
    if conn:
        cur = conn.cursor()
        cur.execute("UPDATE Schedules SET completed = %s WHERE id = %s", (completed, task_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    return jsonify({"error": "DB Error"}), 500

@app.route('/api/cultivation/ledger', methods=['POST'])
@jwt_required()
def add_ledger():
    user_id = get_jwt_identity()
    data = request.json
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Error"}), 500
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM Cultivations WHERE user_id = %s AND status = 'ACTIVE' LIMIT 1", (user_id,))
        active = cur.fetchone()
        if not active:
             return jsonify({"error": "No active cultivation"}), 400
             
        cur.execute("INSERT INTO Ledgers (cultivation_id, type, amount, category, notes) VALUES (%s, %s, %s, %s, %s)",
                   (active[0], data['type'], data['amount'], data.get('category'), data.get('notes')))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cultivation/finish', methods=['POST'])
@jwt_required()
def finish_cultivation():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Error"}), 500
    try:
        cur = conn.cursor()
        cur.execute("UPDATE Cultivations SET status = 'COMPLETED' WHERE user_id = %s AND status = 'ACTIVE'", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Cultivation marked as completed."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cultivation/history', methods=['GET'])
@jwt_required()
def get_cultivation_history():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Error"}), 500
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM Cultivations WHERE user_id = %s AND status = 'COMPLETED' ORDER BY start_date DESC", (user_id,))
        cultivations = cur.fetchall()
        
        history_data = []
        for c in cultivations:
            cur.execute("SELECT SUM(amount) FROM Ledgers WHERE cultivation_id = %s AND type = 'PROFIT'", (c['id'],))
            profit = cur.fetchone()['sum'] or 0
            cur.execute("SELECT SUM(amount) FROM Ledgers WHERE cultivation_id = %s AND type = 'EXPENSE'", (c['id'],))
            expense = cur.fetchone()['sum'] or 0
            
            history_data.append({
                "id": c['id'],
                "crop_name": c['crop_name'],
                "start_date": str(c['start_date']),
                "profit": float(profit),
                "expense": float(expense),
                "net": float(profit) - float(expense)
            })
            
        cur.close()
        conn.close()
        return jsonify(history_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cultivation/history/<int:cultivation_id>', methods=['GET'])
@jwt_required()
def get_cultivation_history_details(cultivation_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Error"}), 500
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verify ownership
        cur.execute("SELECT * FROM Cultivations WHERE id = %s AND user_id = %s", (cultivation_id, user_id))
        cultivation = cur.fetchone()
        
        if not cultivation:
            return jsonify({"error": "Cultivation not found or unauthorized"}), 404
            
        cur.execute("SELECT * FROM Schedules WHERE cultivation_id = %s ORDER BY due_date", (cultivation_id,))
        schedules = cur.fetchall()
        
        cur.execute("SELECT * FROM Ledgers WHERE cultivation_id = %s ORDER BY date DESC", (cultivation_id,))
        ledgers = cur.fetchall()
        
        cur.close()
        conn.close()
        
        # Format dates for JSON
        cultivation['start_date'] = str(cultivation['start_date'])
        for s in schedules: s['due_date'] = str(s['due_date'])
        for l in ledgers: 
            l['date'] = str(l['date'])
            l['amount'] = float(l['amount'])
            
        return jsonify({
            "status": "success",
            "cultivation": cultivation,
            "schedules": schedules,
            "ledgers": ledgers
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# --- VOICE ASSISTANT ENDPOINT ---
import voice_service
import uuid

@app.route('/api/voice_chat', methods=['POST'])
def voice_chat():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        language = request.form.get('language', 'en')
        
        # Save temp audio file from mobile
        temp_id = str(uuid.uuid4())
        audio_ext = os.path.splitext(audio_file.filename)[1]
        input_audio_path = os.path.join('static', 'audio', f"in_{temp_id}{audio_ext}")
        audio_file.save(input_audio_path)
        
        # 1. Speech-to-Text
        user_text = voice_service.transcribe_audio(input_audio_path, language)
        if not user_text:
            return jsonify({"error": "Could not understand audio"}), 400
            
        # Optional Context Checking
        cultivation_context = None
        user_id = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                conn = get_db_connection()
                if conn:
                    cur = conn.cursor()
                    cur.execute("SELECT crop_name FROM Cultivations WHERE user_id = %s AND status = 'ACTIVE' LIMIT 1", (user_id,))
                    res = cur.fetchone()
                    if res: cultivation_context = res[0]
                    cur.close()
                    conn.close()
        except: pass
        
        # 2. Chatbot AI Engine
        reply_text = chatbot_engine.get_response(user_text, language, cultivation_context)
        
        if user_id:
            try:
                conn = get_db_connection()
                if conn:
                    cur = conn.cursor()
                    cur.execute("INSERT INTO Chats (user_id, message, is_bot) VALUES (%s, %s, %s)", (user_id, user_text, False))
                    cur.execute("INSERT INTO Chats (user_id, message, is_bot) VALUES (%s, %s, %s)", (user_id, reply_text, True))
                    conn.commit()
                    cur.close()
                    conn.close()
            except Exception as e:
                print(f"Voice Chat Save Error: {e}")
        
        # 3. Text-to-Speech
        output_audio_path = os.path.join('static', 'audio', f"out_{temp_id}.mp3")
        voice_service.text_to_speech(reply_text, language, output_audio_path)
        
        return jsonify({
            "status": "success",
            "user_text": user_text,
            "reply": reply_text,
            "audio_url": f"/static/audio/out_{temp_id}.mp3"
        })
        
    except Exception as e:
        print(f"Voice Chat Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
