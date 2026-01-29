
import psycopg2
import os
from dotenv import load_dotenv
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "farmers"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

def get_connection():
    try:
        return psycopg2.connect(**DB_CONFIG)
    except psycopg2.OperationalError:
        # Fallback if needed (e.g., specific user preference locally)
        DB_CONFIG['password'] = 'kousik'
        return psycopg2.connect(**DB_CONFIG)

def add_column_if_not_exists(cur, table, column, data_type):
    try:
        cur.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='{table.lower()}' AND column_name='{column}';
        """)
        if not cur.fetchone():
            print(f"Adding '{column}' column to '{table}'...")
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {data_type};")
        else:
            print(f"Column '{column}' already exists in '{table}'.")
    except Exception as e:
        print(f"Error checking/adding column {column}: {e}")

def migrate():
    print("Starting Database Migration...")
    try:
        conn = get_connection()
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        # 1. Create Users Table
        print("--- Checking 'Users' Table ---")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS Users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                phone VARCHAR(20) UNIQUE,
                location VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Update Users Columns
        add_column_if_not_exists(cur, 'Users', 'location', 'VARCHAR(100)')
        add_column_if_not_exists(cur, 'Users', 'password_hash', 'VARCHAR(255)')
        add_column_if_not_exists(cur, 'Users', 'profile_pic', 'TEXT')

        # 3. Create Recommendations Table (Ensure it exists for column check)
        # (Assuming it's created by app.py or schema.sql, but safer to have stub if critical)
        # Skipped full creation here to avoid conflict with complex schema, but dealing with modification:
        
        print("--- Checking 'Recommendations' Table ---")
        # Ensure Recommendations table exists before altering
        cur.execute("SELECT to_regclass('public.Recommendations');")
        if cur.fetchone()[0]:
            add_column_if_not_exists(cur, 'Recommendations', 'full_response', 'JSONB')
        else:
            print("Warning: Recommendations table does not exist yet. Skipping column add.")

        # 4. Seed Data
        print("--- Seeding Data ---")
        cur.execute("SELECT id FROM Users WHERE id = 1;")
        if not cur.fetchone():
            try:
                cur.execute("INSERT INTO Users (id, name, phone, location) VALUES (1, 'Siva Kumar', '9876543210', 'Andhra Pradesh');")
                print("Default user (ID=1) created.")
            except Exception as e:
                 print(f"Skipping default user creation (might exist with different ID): {e}")

        conn.commit()
        cur.close()
        conn.close()
        print("\n✅ Database Migration Completed Successfully!")

    except Exception as e:
        print(f"\n❌ Migration Failed: {e}")

if __name__ == "__main__":
    migrate()
