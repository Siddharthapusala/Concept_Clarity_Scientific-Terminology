from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session, load_only
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from ..database import SessionLocal
from ..models import User
from ..schemas import UserCreate, UserLogin
from datetime import datetime
from ..security import hash_password, verify_password
from ..auth import create_token, decode_token
from typing import Optional
from ..models import AppReview
from ..schemas import AppReviewCreate, AppReviewOut


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        if user.email and db.query(User).filter(User.email == user.email).first():
            raise HTTPException(400, "Email already exists")
        if user.username and db.query(User).filter(User.username == user.username).first():
            raise HTTPException(400, "Username already exists")
            
        role = user.role or "general_user"
        
        new_user = User(
            email=user.email,
            username=user.username,
            role=role,
            language=user.language,
            password_hash=hash_password(user.password)
        )
        
        db.add(new_user)
        db.commit()
        return {"message": "User created successfully"}

    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "User already exists or invalid data")
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(500, "Database error")
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Signup failed: {str(e)}")


@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        db_user = None
        if user.email:
            db_user = (
                db.query(User)
                .options(load_only(User.id, User.email, User.username, User.password_hash))
                .filter(User.email == user.email)
                .first()
            )
        if not db_user and user.username:
            db_user = (
                db.query(User)
                .options(load_only(User.id, User.email, User.username, User.password_hash))
                .filter(User.username == user.username)
                .first()
            )

        if not db_user or not verify_password(user.password, db_user.password_hash):
            raise HTTPException(401, "Invalid credentials")
            
        token = create_token(db_user.email or db_user.username)
        return {"access_token": token}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(500, f"Login failed: {str(e)}")


@router.get("/me")
def me(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user:
        raise HTTPException(404, "User not found")
        
    return {
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "language": user.language,
    }


@router.put("/profile")
def update_profile(
    data: dict,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user:
        raise HTTPException(404, "User not found")
        
    new_username = data.get("username")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    language = data.get("language")

    if new_username and new_username != user.username:
        if db.query(User).filter(User.username == new_username).first():
            raise HTTPException(400, "Username already exists")
        user.username = new_username
        
    user.first_name = first_name
    user.last_name = last_name
    if language:
        user.language = language
        
    db.add(user)
    db.commit()
    return {"message": "Profile updated successfully"}


@router.post("/review")
def submit_review(
    review: AppReviewCreate,
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user:
        raise HTTPException(404, "User not found")

    existing_review = db.query(AppReview).filter(AppReview.user_id == user.id).first()
    
    if existing_review:
        existing_review.rating = review.rating
        existing_review.comment = review.comment
        existing_review.created_at = datetime.utcnow()
    else:
        new_review = AppReview(
            user_id=user.id,
            rating=review.rating,
            comment=review.comment
        )
        db.add(new_review)
    
    db.commit()
    return {"message": "Review submitted successfully"}


@router.get("/review", response_model=AppReviewOut)
def get_review(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user:
        raise HTTPException(404, "User not found")

    review = db.query(AppReview).filter(AppReview.user_id == user.id).first()
    if not review:
        raise HTTPException(404, "No review found")
        
    return review
