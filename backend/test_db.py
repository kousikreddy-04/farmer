import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "6543")
}

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()
cur.execute("SELECT id, user_id, timestamp, soil_type FROM Recommendations ORDER BY id DESC LIMIT 5;")
rows = cur.fetchall()
print("Recent Scans:")
print("ID | USER_ID | TIMESTAMP | SOIL_TYPE")
print("-" * 50)
for r in rows:
    print(f"{r[0]} | {r[1]} | {r[2]} | {r[3]}")
    
# Let's also check users
cur.execute("SELECT id, name, phone FROM Users;")
users = cur.fetchall()
print("\nUsers inside DB:")
for u in users:
    print(u)
    
cur.close()
conn.close()
