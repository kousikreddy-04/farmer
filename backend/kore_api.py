"""
kore_api.py — Kore.ai Chatbot API Services for Smart Kisan
Dedicated endpoints consumed by the Kore.ai XO Platform dialog tasks.
All responses follow a flat, Kore.ai-friendly JSON structure.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, verify_jwt_in_request
)
import psycopg2
from psycopg2.extras import RealDictCursor
import os, json
from datetime import datetime, timedelta

import chatbot_engine
import weather_service
import ml_pipeline

kore = Blueprint('kore', __name__, url_prefix='/kore/v1')

# ─── DB helper ────────────────────────────────────────────────────────────────
def get_db():
    try:
        return psycopg2.connect(
            dbname=os.getenv("DB_NAME", "farmers"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "password"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
        )
    except Exception as e:
        print(f"DB Error: {e}")
        return None

def ok(data: dict):
    return jsonify({"status": "success", **data})

def err(msg: str, code: int = 400):
    return jsonify({"status": "error", "message": msg}), code


# ══════════════════════════════════════════════════════════════════════════════
# 1. AUTH
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/auth/login', methods=['POST'])
def kore_login():
    """
    Kore.ai Auth — Login
    Body: { "phone": "9999999999", "password": "abc123" }
    Returns: { status, token, user: {name, phone, location} }
    """
    data = request.json or {}
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not phone or not password:
        return err("Phone and password are required.")

    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM Users WHERE phone = %s", (phone,))
        user = cur.fetchone()
        cur.close(); conn.close()

        import bcrypt
        if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            return err("Invalid phone or password.", 401)

        token = create_access_token(identity=str(user['id']))
        return ok({
            "token": token,
            "user": {
                "name": user['name'],
                "phone": user['phone'],
                "location": user.get('location', '')
            }
        })
    except Exception as e:
        return err(str(e), 500)


@kore.route('/auth/register', methods=['POST'])
def kore_register():
    """
    Kore.ai Auth — Register
    Body: { "name": "Raju", "phone": "9999999999", "password": "abc", "location": "Warangal" }
    """
    data = request.json or {}
    name     = data.get('name', '').strip()
    phone    = data.get('phone', '').strip()
    password = data.get('password', '').strip()
    location = data.get('location', '')

    if not name or not phone or not password:
        return err("Name, phone, and password are required.")

    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)

    try:
        import bcrypt
        cur = conn.cursor()
        cur.execute("SELECT id FROM Users WHERE phone = %s", (phone,))
        if cur.fetchone():
            return err("Phone number already registered.")

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            "INSERT INTO Users (name, phone, password_hash, location) VALUES (%s,%s,%s,%s) RETURNING id",
            (name, phone, hashed, location)
        )
        user_id = cur.fetchone()[0]
        conn.commit(); cur.close(); conn.close()

        token = create_access_token(identity=str(user_id))
        return ok({"token": token, "user": {"name": name, "phone": phone, "location": location}})
    except Exception as e:
        return err(str(e), 500)


# ══════════════════════════════════════════════════════════════════════════════
# 2. PROFILE
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/profile', methods=['GET'])
@jwt_required()
def kore_profile():
    """
    Returns logged-in farmer's profile.
    Header: Authorization: Bearer <token>
    """
    user_id = get_jwt_identity()
    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT name, phone, location FROM Users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close(); conn.close()
        if not user:
            return err("User not found.", 404)
        return ok({"user": dict(user)})
    except Exception as e:
        return err(str(e), 500)


# ══════════════════════════════════════════════════════════════════════════════
# 3. WEATHER
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/weather', methods=['GET'])
def kore_weather():
    """
    Get real-time weather.
    Query params: lat, lon
    Returns: { temperature, humidity, rainfall, season, farming_advice }
    """
    try:
        lat = request.args.get('lat', type=float)
        lon = request.args.get('lon', type=float)
        if lat is None or lon is None:
            return err("lat and lon query params are required.")

        w = weather_service.get_current_weather(lat, lon)

        # Farming advice based on weather
        advice = "Weather is suitable for general farming."
        if w.get('rainfall', 0) > 100:
            advice = "Heavy rainfall detected. Avoid sowing. Ensure field drainage."
        elif w.get('temperature', 25) > 38:
            advice = "Very high temperature. Irrigate in the early morning or evening."
        elif w.get('humidity', 60) > 85:
            advice = "High humidity — watch for fungal diseases on crops."

        return ok({
            "temperature": w.get('temperature'),
            "humidity": w.get('humidity'),
            "rainfall": w.get('rainfall'),
            "season": "Kharif" if datetime.now().month in [6,7,8,9,10] else "Rabi",
            "farming_advice": advice
        })
    except Exception as e:
        return err(str(e), 500)


# ══════════════════════════════════════════════════════════════════════════════
# 4. CROP RECOMMENDATION
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/crop/recommend', methods=['POST'])
def kore_crop_recommend():
    """
    Lightweight crop recommendation for Kore.ai.
    Body: { "soil_type": "Loamy", "lat": 17.3, "lon": 78.4, "language": "en" }
    Optional: { "N": 50, "P": 30, "K": 40, "ph": 6.5 }
    Returns: top 3 crops with confidence and advice.
    """
    data = request.json or {}
    soil_type = data.get('soil_type', 'Loamy')
    lat       = data.get('lat', 20.0)
    lon       = data.get('lon', 78.0)
    language  = data.get('language', 'en')

    try:
        w = weather_service.get_current_weather(lat, lon)

        if data.get('N'):
            n, p, k = float(data['N']), float(data['P']), float(data['K'])
        else:
            n, p, k = ml_pipeline.get_npk_for_soil(soil_type)

        ph = float(data.get('ph', 7.0))

        top_crops = ml_pipeline.predict_crop(
            n, p, k, w['temperature'], w['humidity'], ph, w['rainfall']
        )

        crops_out = []
        for item in top_crops[:3]:
            crops_out.append({
                "crop": item['crop'],
                "confidence_pct": round(item['confidence'] * 100, 1),
                "suitability": "High" if item['confidence'] > 0.7 else "Medium"
            })

        # Attempt JWT to get user_id for saving
        user_id = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            pass

        # Save to DB
        conn = get_db()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO Recommendations (user_id, latitude, longitude, soil_type, weather_json, recommended_crops, full_response) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                    (user_id, lat, lon, soil_type, json.dumps(w), json.dumps(crops_out), json.dumps(crops_out))
                )
                conn.commit(); cur.close(); conn.close()
            except Exception:
                pass

        return ok({
            "soil_type": soil_type,
            "weather": {"temperature": w['temperature'], "rainfall": w['rainfall']},
            "top_crops": crops_out,
            "message": f"Based on your {soil_type} soil, the best crops to grow are: " +
                       ", ".join([c['crop'].capitalize() for c in crops_out])
        })
    except Exception as e:
        return err(str(e), 500)


@kore.route('/crop/info', methods=['GET'])
def kore_crop_info():
    """
    Fertilizer and precaution info for a crop.
    Query: crop=rice&language=en
    """
    from knowledge_base import CROP_INFO
    crop     = request.args.get('crop', '').lower()
    language = request.args.get('language', 'en')

    info = CROP_INFO.get(crop, CROP_INFO.get('default', {}))
    lang_info = info.get(language, info.get('en', {}))

    return ok({
        "crop": crop,
        "fertilizer": lang_info.get('fertilizer', 'Use balanced NPK fertilizers.'),
        "precautions": lang_info.get('precautions', 'Ensure proper irrigation and weed control.')
    })


# ══════════════════════════════════════════════════════════════════════════════
# 5. CHAT (AI Assistant)
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/chat', methods=['POST'])
def kore_chat():
    """
    Send a message to the Gemini-powered agricultural AI.
    Body: { "message": "...", "language": "hi" }
    Header (optional): Authorization: Bearer <token>
    Returns: { reply }
    """
    data = request.json or {}
    message  = data.get('message', '').strip()
    language = data.get('language', 'en')

    if not message:
        return err("message field is required.")

    user_id = None
    cultivation_context = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            conn = get_db()
            if conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT crop_name FROM Cultivations WHERE user_id=%s AND status='ACTIVE' LIMIT 1",
                    (user_id,)
                )
                res = cur.fetchone()
                if res:
                    cultivation_context = res[0]
                cur.close(); conn.close()
    except Exception:
        pass

    reply = chatbot_engine.get_response(message, language, cultivation_context)

    # Save chat
    if user_id:
        try:
            conn = get_db()
            if conn:
                cur = conn.cursor()
                cur.execute("INSERT INTO Chats (user_id, message, is_bot) VALUES (%s,%s,%s)", (user_id, message, False))
                cur.execute("INSERT INTO Chats (user_id, message, is_bot) VALUES (%s,%s,%s)", (user_id, reply, True))
                conn.commit(); cur.close(); conn.close()
        except Exception:
            pass

    return ok({"reply": reply, "language": language})


# ══════════════════════════════════════════════════════════════════════════════
# 6. CULTIVATION TRACKER
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/cultivation/start', methods=['POST'])
@jwt_required()
def kore_start_cultivation():
    """
    Start a new cultivation cycle.
    Body: { "crop_name": "rice" }
    """
    user_id  = get_jwt_identity()
    data     = request.json or {}
    crop_name = data.get('crop_name', '').strip()

    if not crop_name:
        return err("crop_name is required.")

    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)

    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE Cultivations SET status='COMPLETED' WHERE user_id=%s AND status='ACTIVE'",
            (user_id,)
        )
        cur.execute(
            "INSERT INTO Cultivations (user_id, crop_name) VALUES (%s,%s) RETURNING id",
            (user_id, crop_name)
        )
        cultivation_id = cur.fetchone()[0]

        tasks = chatbot_engine.generate_cultivation_schedule(crop_name)
        for t in tasks:
            due = datetime.now() + timedelta(days=t.get('days_from_start', 0))
            cur.execute(
                "INSERT INTO Schedules (cultivation_id, task_name, due_date) VALUES (%s,%s,%s)",
                (cultivation_id, t.get('task_name'), due.strftime('%Y-%m-%d'))
            )

        conn.commit(); cur.close(); conn.close()
        return ok({
            "crop_name": crop_name,
            "total_tasks": len(tasks),
            "message": f"Cultivation of {crop_name.capitalize()} started! {len(tasks)} tasks scheduled."
        })
    except Exception as e:
        return err(str(e), 500)


@kore.route('/cultivation/active', methods=['GET'])
@jwt_required()
def kore_active_cultivation():
    """
    Get the farmer's active crop and upcoming tasks.
    Returns: { crop_name, start_date, upcoming_tasks, overdue_tasks }
    """
    user_id = get_jwt_identity()
    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT * FROM Cultivations WHERE user_id=%s AND status='ACTIVE' LIMIT 1",
            (user_id,)
        )
        active = cur.fetchone()
        if not active:
            return ok({"active": False, "message": "No active cultivation. Start one first!"})

        today = datetime.now().date()
        cur.execute(
            "SELECT id, task_name, due_date, completed FROM Schedules WHERE cultivation_id=%s ORDER BY due_date",
            (active['id'],)
        )
        schedules = cur.fetchall()
        cur.close(); conn.close()

        upcoming = []
        overdue  = []
        for s in schedules:
            if s['completed']:
                continue
            due = s['due_date']
            entry = {"id": s['id'], "task": s['task_name'], "due_date": str(due)}
            if due < today:
                overdue.append(entry)
            else:
                upcoming.append(entry)

        return ok({
            "active": True,
            "crop_name": active['crop_name'],
            "start_date": str(active['start_date'])[:10],
            "upcoming_tasks": upcoming[:3],
            "overdue_tasks": overdue,
            "message": f"You are growing {active['crop_name'].capitalize()}. "
                       f"{len(upcoming)} tasks upcoming, {len(overdue)} overdue."
        })
    except Exception as e:
        return err(str(e), 500)


@kore.route('/cultivation/task/complete', methods=['POST'])
@jwt_required()
def kore_complete_task():
    """
    Mark a scheduled task as completed.
    Body: { "task_id": 12 }
    """
    data    = request.json or {}
    task_id = data.get('task_id')
    if not task_id:
        return err("task_id is required.")

    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        cur = conn.cursor()
        cur.execute("UPDATE Schedules SET completed=TRUE WHERE id=%s", (task_id,))
        conn.commit(); cur.close(); conn.close()
        return ok({"message": "Task marked as completed! Great work! ✅"})
    except Exception as e:
        return err(str(e), 500)


@kore.route('/cultivation/finish', methods=['POST'])
@jwt_required()
def kore_finish_cultivation():
    """Mark active cultivation as completed (post-harvest)."""
    user_id = get_jwt_identity()
    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE Cultivations SET status='COMPLETED' WHERE user_id=%s AND status='ACTIVE'",
            (user_id,)
        )
        conn.commit(); cur.close(); conn.close()
        return ok({"message": "Congratulations! 🎉 Cultivation marked as complete. Check your profit summary."})
    except Exception as e:
        return err(str(e), 500)


@kore.route('/cultivation/history', methods=['GET'])
@jwt_required()
def kore_cultivation_history():
    """
    Past cultivation cycles with profit/loss summary.
    Returns: list of { crop_name, start_date, net_profit }
    """
    user_id = get_jwt_identity()
    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT * FROM Cultivations WHERE user_id=%s AND status='COMPLETED' ORDER BY start_date DESC LIMIT 10",
            (user_id,)
        )
        cultivations = cur.fetchall()

        result = []
        for c in cultivations:
            cur.execute("SELECT COALESCE(SUM(amount),0) FROM Ledgers WHERE cultivation_id=%s AND type='PROFIT'", (c['id'],))
            profit = float(cur.fetchone()['coalesce'])
            cur.execute("SELECT COALESCE(SUM(amount),0) FROM Ledgers WHERE cultivation_id=%s AND type='EXPENSE'", (c['id'],))
            expense = float(cur.fetchone()['coalesce'])
            result.append({
                "crop_name": c['crop_name'],
                "start_date": str(c['start_date'])[:10],
                "total_profit": profit,
                "total_expense": expense,
                "net_profit": profit - expense
            })

        cur.close(); conn.close()
        return ok({"history": result, "count": len(result)})
    except Exception as e:
        return err(str(e), 500)


# ══════════════════════════════════════════════════════════════════════════════
# 7. FINANCIAL LEDGER
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/ledger/add', methods=['POST'])
@jwt_required()
def kore_ledger_add():
    """
    Add expense or profit entry.
    Body: { "type": "EXPENSE|PROFIT", "amount": 500, "category": "Fertilizer", "notes": "Urea" }
    """
    user_id = get_jwt_identity()
    data    = request.json or {}
    entry_type = data.get('type', '').upper()
    amount     = data.get('amount')
    category   = data.get('category', 'General')
    notes      = data.get('notes', '')

    if entry_type not in ('EXPENSE', 'PROFIT'):
        return err("type must be EXPENSE or PROFIT.")
    if not amount:
        return err("amount is required.")

    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id FROM Cultivations WHERE user_id=%s AND status='ACTIVE' LIMIT 1",
            (user_id,)
        )
        active = cur.fetchone()
        if not active:
            return err("No active cultivation. Please start cultivation first.")

        cur.execute(
            "INSERT INTO Ledgers (cultivation_id, type, amount, category, notes) VALUES (%s,%s,%s,%s,%s)",
            (active[0], entry_type, float(amount), category, notes)
        )
        conn.commit(); cur.close(); conn.close()

        emoji = "💸" if entry_type == "EXPENSE" else "💰"
        return ok({
            "message": f"{emoji} ₹{amount} {entry_type.lower()} for {category} recorded successfully!"
        })
    except Exception as e:
        return err(str(e), 500)


@kore.route('/ledger/summary', methods=['GET'])
@jwt_required()
def kore_ledger_summary():
    """
    Net profit/loss summary for the active cultivation.
    Returns: { total_profit, total_expense, net_profit, entries }
    """
    user_id = get_jwt_identity()
    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            "SELECT id, crop_name FROM Cultivations WHERE user_id=%s AND status='ACTIVE' LIMIT 1",
            (user_id,)
        )
        active = cur.fetchone()
        if not active:
            return err("No active cultivation.")

        cur.execute(
            "SELECT type, amount, category, notes, date FROM Ledgers WHERE cultivation_id=%s ORDER BY date DESC LIMIT 20",
            (active['id'],)
        )
        entries = cur.fetchall()

        total_profit  = sum(float(e['amount']) for e in entries if e['type'] == 'PROFIT')
        total_expense = sum(float(e['amount']) for e in entries if e['type'] == 'EXPENSE')
        net = total_profit - total_expense

        cur.close(); conn.close()
        return ok({
            "crop_name": active['crop_name'],
            "total_profit": total_profit,
            "total_expense": total_expense,
            "net_profit": net,
            "profit_status": "Profitable ✅" if net >= 0 else "In Loss ❌",
            "recent_entries": [
                {
                    "type": e['type'],
                    "amount": float(e['amount']),
                    "category": e['category'],
                    "date": str(e['date'])[:10]
                } for e in entries[:5]
            ]
        })
    except Exception as e:
        return err(str(e), 500)


# ══════════════════════════════════════════════════════════════════════════════
# 8. NOTIFICATIONS / REMINDERS (Kore.ai Webhook Trigger)
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/notifications/due_tasks', methods=['GET'])
def kore_due_tasks():
    """
    Called by Kore.ai campaign scheduler to find farmers with tasks due today.
    Returns list of { user_id, phone, task_name, crop_name }
    No auth required — internal use only (protect with API key in production).
    """
    api_key = request.headers.get('X-API-Key', '')
    if api_key != os.getenv('KORE_INTERNAL_API_KEY', 'kore-internal-key'):
        return err("Unauthorized", 401)

    conn = get_db()
    if not conn:
        return err("Database unavailable.", 500)
    try:
        today = datetime.now().date()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT u.phone, u.name, s.task_name, c.crop_name
            FROM Schedules s
            JOIN Cultivations c ON s.cultivation_id = c.id
            JOIN Users u ON c.user_id = u.id
            WHERE s.due_date = %s AND s.completed = FALSE AND c.status = 'ACTIVE'
        """, (today,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return ok({"due_today": [dict(r) for r in rows], "count": len(rows)})
    except Exception as e:
        return err(str(e), 500)


# ══════════════════════════════════════════════════════════════════════════════
# 9. HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@kore.route('/health', methods=['GET'])
def kore_health():
    """Kore.ai uses this to verify the service is alive."""
    conn = get_db()
    db_ok = conn is not None
    if conn:
        conn.close()
    return ok({
        "service": "Smart Kisan Kore.ai API",
        "version": "1.0.0",
        "db_connected": db_ok
    })
