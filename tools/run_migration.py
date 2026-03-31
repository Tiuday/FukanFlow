"""
Run the SQL migration against Supabase direct connection.
Uses psycopg2-binary (pre-built wheels, no compilation needed).

Run: py tools/run_migration.py
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from pathlib import Path

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    print("ERROR: python-dotenv not installed. Run: pip install python-dotenv")
    sys.exit(1)

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2-binary not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

from urllib.parse import quote_plus

def build_conn_str() -> str:
    password  = os.getenv("SUPABASE_DB_PASSWORD", "")
    user      = os.getenv("SUPABASE_DB_USER", "")
    host      = os.getenv("SUPABASE_DB_HOST", "")
    port      = os.getenv("SUPABASE_DB_PORT", "5432")
    dbname    = os.getenv("SUPABASE_DB_NAME", "postgres")
    return f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{dbname}"

def run_migration():
    sql_path = Path(__file__).parent / "migrations" / "001_initial_schema.sql"
    if not sql_path.exists():
        print(f"ERROR: Migration file not found: {sql_path}")
        sys.exit(1)

    sql = sql_path.read_text(encoding="utf-8")
    conn_str = build_conn_str()

    print("\nFukan Board — Running Migration")
    print(f"File: {sql_path.name}")
    print(f"Host: {os.getenv('SUPABASE_DB_HOST')}\n")

    try:
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        cur.close()
        conn.close()
        print("Migration applied successfully.")
        print("Tables created: news_items, user_interactions, fetch_logs")
    except psycopg2.Error as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
