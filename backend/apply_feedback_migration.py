from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE search_history ADD COLUMN feedback INTEGER NULL"))
            conn.commit()
            print("Migration successful: Added feedback column.")
        except Exception as e:
            print(f"Migration failed (might already exist): {e}")

if __name__ == "__main__":
    migrate()
