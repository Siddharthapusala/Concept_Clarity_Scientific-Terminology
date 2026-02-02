import sys
import os

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.security import hash_password

def create_admin():
    db = SessionLocal()
    try:
        username = "admin"
        email = "admin@example.com"
        password = "Anime@123" # Strong password matching requirements
        
        # Check if admin already exists
        existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            print(f"User with username '{username}' or email '{email}' already exists.")
            # Always update password and role to ensure they match request
            existing_user.password_hash = hash_password(password)
            existing_user.role = "admin"
            db.commit()
            print(f"User updated: Role=admin, Password={password}")
            return

        print("Creating admin user...")
        new_user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            first_name="Admin",
            last_name="User",
            language="en"
        )
        db.add(new_user)
        db.commit()
        print(f"Admin user created successfully.\nUsername: {username}\nPassword: {password}")
        
    except Exception as e:
        print(f"Error creating admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
