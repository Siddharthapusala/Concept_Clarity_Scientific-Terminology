from app.database import SessionLocal
from app.models import User
from app.security import hash_password

def reset_password(identifier, new_password):
    db = SessionLocal()
    try:
        user = db.query(User).filter((User.email == identifier) | (User.username == identifier)).first()
        if user:
            print(f"Found user: {user.username} ({user.email})")
            user.password_hash = hash_password(new_password)
            db.commit()
            print(f"Password reset successfully for {identifier}")
        else:
            print(f"User {identifier} not found")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Reset for the likely user
    reset_password("siddharthapusala@gmail.com", "Password@123")
