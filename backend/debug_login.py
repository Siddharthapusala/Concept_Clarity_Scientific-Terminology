from app.database import SessionLocal
from app.models import User
from app.security import verify_password, hash_password

def debug_login(username, password):
    db = SessionLocal()
    try:
        print(f"--- Debugging Login for '{username}' ---")
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            print(f"User '{username}' NOT FOUND in database.")
            return

        print(f"User Found: ID={user.id}, Email={user.email}, Role={user.role}")
        print(f"Stored Hash: {user.password_hash}")
        
        is_valid = verify_password(password, user.password_hash)
        print(f"Password '{password}' valid? -> {is_valid}")
        
        if not is_valid:
             print("Attempting to re-hash and compare...")
             new_hash = hash_password(password)
             print(f"New Hash for '{password}': {new_hash}")
             print(f"Verify new hash: {verify_password(password, new_hash)}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_login("admin", "Admin@123")
