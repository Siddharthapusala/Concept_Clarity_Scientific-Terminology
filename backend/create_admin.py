from app.database import SessionLocal
from app.models import User
from app.security import hash_password

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if exists
        user = db.query(User).filter(User.username == "admin").first()
        if user:
            print("User 'admin' already exists. Resetting password...")
            user.password_hash = hash_password("Admin@123")
            db.commit()
            print("Password reset to 'Admin@123'")
        else:
            print("Creating user 'admin'...")
            new_user = User(
                username="admin",
                email="admin@example.com",
                role="general_user",
                password_hash=hash_password("Admin@123")
            )
            db.add(new_user)
            db.commit()
            print("User 'admin' created with password 'Admin@123'")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
