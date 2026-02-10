from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import difflib
from ..database import SessionLocal
from ..models import User, SearchHistory, AppReview
from ..schemas import UserLogin
from ..security import verify_password
from ..auth import create_token, decode_token


router = APIRouter(prefix="/admin", tags=["Admin"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/login")
def admin_login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        db_user = None
        if user.email:
            db_user = db.query(User).filter(User.email == user.email).first()
        if not db_user and user.username:
            db_user = db.query(User).filter(User.username == user.username).first()

        if not db_user or not verify_password(user.password, db_user.password_hash):
            raise HTTPException(401, "Invalid credentials")
        
        if db_user.role != "admin":
            raise HTTPException(403, "Not authorized as admin")
            
        token = create_token(db_user.email or db_user.username)
        return {"access_token": token, "username": db_user.username}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Login failed: {str(e)}")


@router.get("/stats")
def get_stats(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user or user.role != "admin":
        raise HTTPException(403, "Not authorized as admin")

    total_members = db.query(User).count()

    total_reviews = db.query(AppReview).count()
    avg_rating = db.query(func.avg(AppReview.rating)).scalar() or 0.0

    raw_stats = (
        db.query(func.trim(func.lower(SearchHistory.query)).label("query"), func.count(SearchHistory.id).label("count"))
        .group_by(func.trim(func.lower(SearchHistory.query)))
        .order_by(desc("count"))
        .limit(50)
        .all()
    )

    merged_stats = []
    
    for r in raw_stats:
        term = r[0]
        count = r[1]
        
        merged = False
        for i, existing in enumerate(merged_stats):
            existing_term = existing["word"]
            
            if difflib.SequenceMatcher(None, term, existing_term).ratio() > 0.85:
                merged_stats[i]["count"] += count
                merged = True
                break
        
        if not merged:
            merged_stats.append({"word": term, "count": count})
    
    merged_stats.sort(key=lambda x: x["count"], reverse=True)
    final_stats = merged_stats[:5]
    
    return {
        "total_members": total_members,
        "total_reviews": total_reviews,
        "average_rating": round(avg_rating, 1),
        "most_searched_words": final_stats
    }


@router.get("/users")
def get_users(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Missing authorization header")
    
    token = authorization.split(" ")[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    admin_user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not admin_user or admin_user.role != "admin":
         raise HTTPException(403, "Not authorized as admin")

    users = db.query(User).all()
    user_data = []

    for user in users:
        reviews = db.query(AppReview).filter(AppReview.user_id == user.id).all()
        user_data.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "reviews": [{"rating": r.rating, "comment": r.comment, "date": r.created_at} for r in reviews]
        })
    
    return user_data
