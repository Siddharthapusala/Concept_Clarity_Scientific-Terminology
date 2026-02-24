from fastapi import APIRouter, Depends, HTTPException, Header, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import difflib
from ..database import SessionLocal
from ..models import User, SearchHistory, AppReview, QuizResult
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


from datetime import datetime, timedelta

@router.get("/stats")
def get_stats(
    timeframe: str = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    roles: Optional[str] = None,
    languages: Optional[str] = None,
    topics: Optional[str] = None,
    min_quiz_score: Optional[int] = None,
    max_quiz_score: Optional[int] = None,
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user or user.role != "admin":
        raise HTTPException(403, "Not authorized as admin")

    admin_ids_tuple = db.query(User.id).filter(User.role == "admin").all()
    admin_ids = [i[0] for i in admin_ids_tuple]
    if not admin_ids:
        admin_ids = [-1]

    parsed_roles = [r.strip() for r in roles.split(",")] if roles else None
    parsed_languages = [l.strip().lower() for l in languages.split(",")] if languages else None
    parsed_topics = [t.strip().lower() for t in topics.split(",")] if topics else None

    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except:
            pass
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt + timedelta(days=1) - timedelta(seconds=1)
        except:
            pass

    if not start_dt:
        if timeframe == "7d":
            start_dt = datetime.utcnow() - timedelta(days=7)
        elif timeframe == "30d":
            start_dt = datetime.utcnow() - timedelta(days=30)

    user_query = db.query(User).filter(User.role != "admin")
    if start_dt:
        user_query = user_query.filter(User.created_at >= start_dt)
    if end_dt:
        user_query = user_query.filter(User.created_at <= end_dt)
    if parsed_roles:
        user_query = user_query.filter(User.role.in_(parsed_roles))
    total_members = user_query.count()

    review_query = db.query(AppReview).filter(AppReview.user_id.notin_(admin_ids))
    if start_dt:
        review_query = review_query.filter(AppReview.created_at >= start_dt)
    if end_dt:
        review_query = review_query.filter(AppReview.created_at <= end_dt)
    if parsed_roles:
        review_query = review_query.join(User, AppReview.user_id == User.id).filter(User.role.in_(parsed_roles))
    total_reviews = review_query.count()
    
    avg_rating_query = db.query(func.avg(AppReview.rating)).filter(AppReview.user_id.notin_(admin_ids))
    if start_dt:
        avg_rating_query = avg_rating_query.filter(AppReview.created_at >= start_dt)
    if end_dt:
        avg_rating_query = avg_rating_query.filter(AppReview.created_at <= end_dt)
    if parsed_roles:
        avg_rating_query = avg_rating_query.join(User, AppReview.user_id == User.id).filter(User.role.in_(parsed_roles))
    avg_rating = avg_rating_query.scalar() or 0.0

    raw_stats_query = (
        db.query(func.trim(func.lower(SearchHistory.query)).label("query"), func.count(SearchHistory.id).label("count"))
        .filter(SearchHistory.user_id.notin_(admin_ids))
    )
    if start_dt:
        raw_stats_query = raw_stats_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt:
        raw_stats_query = raw_stats_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles:
        raw_stats_query = raw_stats_query.join(User, SearchHistory.user_id == User.id).filter(User.role.in_(parsed_roles))
    
    lang_codes = []
    if parsed_languages:
        for l in parsed_languages:
            if l == "english": lang_codes.extend(["en", "english"])
            elif l == "telugu": lang_codes.extend(["te", "telugu"])
            elif l == "hindi": lang_codes.extend(["hi", "hindi"])
            else: lang_codes.append(l)
        raw_stats_query = raw_stats_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))

    raw_stats = raw_stats_query.group_by(func.trim(func.lower(SearchHistory.query))).order_by(desc("count")).limit(50).all()

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
    
    level_counts_query = db.query(SearchHistory.search_level, func.count(SearchHistory.id)).filter(SearchHistory.user_id.notin_(admin_ids))
    if start_dt:
        level_counts_query = level_counts_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt:
        level_counts_query = level_counts_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles:
        level_counts_query = level_counts_query.join(User, SearchHistory.user_id == User.id).filter(User.role.in_(parsed_roles))
    if parsed_languages:
        level_counts_query = level_counts_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))
        
    level_counts = level_counts_query.group_by(SearchHistory.search_level).all()
    level_stats = [{"name": lvl or "unknown", "value": count} for lvl, count in level_counts]

    source_counts_query = db.query(SearchHistory.search_source, func.count(SearchHistory.id)).filter(SearchHistory.user_id.notin_(admin_ids))
    if start_dt:
        source_counts_query = source_counts_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt:
        source_counts_query = source_counts_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles:
        source_counts_query = source_counts_query.join(User, SearchHistory.user_id == User.id).filter(User.role.in_(parsed_roles))
    if parsed_languages:
        source_counts_query = source_counts_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))

    source_counts = source_counts_query.group_by(SearchHistory.search_source).all()
    source_stats = [{"name": src or "unknown", "value": count} for src, count in source_counts]

    lang_map = {
        "en": "English",
        "english": "English",
        "te": "Telugu",
        "telugu": "Telugu",
        "hi": "Hindi",
        "hindi": "Hindi"
    }
    
    raw_lang_counts_query = db.query(SearchHistory.search_language, func.count(SearchHistory.id)).filter(SearchHistory.user_id.notin_(admin_ids))
    if start_dt:
        raw_lang_counts_query = raw_lang_counts_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt:
        raw_lang_counts_query = raw_lang_counts_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles:
        raw_lang_counts_query = raw_lang_counts_query.join(User, SearchHistory.user_id == User.id).filter(User.role.in_(parsed_roles))
    if parsed_languages:
        raw_lang_counts_query = raw_lang_counts_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))

    raw_lang_counts = raw_lang_counts_query.group_by(SearchHistory.search_language).all()
    
    normalized_langs = {}
    for lang_code, count in raw_lang_counts:
        clean_code = (lang_code or "").strip().lower()
        lang_name = lang_map.get(clean_code, "Unknown")
        if lang_name != "Unknown":
            normalized_langs[lang_name] = normalized_langs.get(lang_name, 0) + count
            
    language_stats = [{"name": name, "value": val} for name, val in normalized_langs.items()]

    roles_stats_query = db.query(User.role, func.count(User.id)).filter(User.role != "admin")
    if start_dt:
        roles_stats_query = roles_stats_query.filter(User.created_at >= start_dt)
    if end_dt:
        roles_stats_query = roles_stats_query.filter(User.created_at <= end_dt)
    if parsed_roles:
        roles_stats_query = roles_stats_query.filter(User.role.in_(parsed_roles))
        
    roles_stats = [{"name": r or "unknown", "value": c} for r, c in roles_stats_query.group_by(User.role).all()]

    from sqlalchemy import cast, Date
    daily_counts_query = db.query(cast(SearchHistory.created_at, Date), func.count(SearchHistory.id)).filter(SearchHistory.user_id.notin_(admin_ids))
    if start_dt:
        daily_counts_query = daily_counts_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt:
        daily_counts_query = daily_counts_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles:
        daily_counts_query = daily_counts_query.join(User, SearchHistory.user_id == User.id).filter(User.role.in_(parsed_roles))
    if parsed_languages:
        daily_counts_query = daily_counts_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))

    daily_counts = daily_counts_query.group_by(cast(SearchHistory.created_at, Date)).order_by(cast(SearchHistory.created_at, Date).desc()).limit(30).all()
    daily_searches = [{"date": str(d), "count": c} for d, c in reversed(daily_counts)]

    total_time_spent_query = db.query(func.sum(User.time_spent)).filter(User.role != "admin")
    if start_dt:
        total_time_spent_query = total_time_spent_query.filter(User.created_at >= start_dt)
    if end_dt:
        total_time_spent_query = total_time_spent_query.filter(User.created_at <= end_dt)
    if parsed_roles:
        total_time_spent_query = total_time_spent_query.filter(User.role.in_(parsed_roles))

    total_time_spent = total_time_spent_query.scalar() or 0

    total_quiz_time_query = db.query(func.sum(QuizResult.time_taken)).filter(QuizResult.user_id.notin_(admin_ids))
    if start_dt:
        total_quiz_time_query = total_quiz_time_query.filter(QuizResult.created_at >= start_dt)
    if end_dt:
        total_quiz_time_query = total_quiz_time_query.filter(QuizResult.created_at <= end_dt)
    if parsed_roles:
        total_quiz_time_query = total_quiz_time_query.join(User, QuizResult.user_id == User.id).filter(User.role.in_(parsed_roles))
    
    total_quiz_time = total_quiz_time_query.scalar() or 0

    total_quiz_users_query = db.query(func.count(func.distinct(QuizResult.user_id))).filter(QuizResult.user_id.notin_(admin_ids))
    if start_dt:
        total_quiz_users_query = total_quiz_users_query.filter(QuizResult.created_at >= start_dt)
    if end_dt:
        total_quiz_users_query = total_quiz_users_query.filter(QuizResult.created_at <= end_dt)
    if parsed_roles:
        total_quiz_users_query = total_quiz_users_query.join(User, QuizResult.user_id == User.id).filter(User.role.in_(parsed_roles))
    if parsed_topics:
        total_quiz_users_query = total_quiz_users_query.filter(func.lower(QuizResult.topic).in_(parsed_topics))
    if min_quiz_score is not None:
        total_quiz_users_query = total_quiz_users_query.filter((QuizResult.score * 100.0 / QuizResult.total_questions) >= min_quiz_score)
    if max_quiz_score is not None:
        total_quiz_users_query = total_quiz_users_query.filter((QuizResult.score * 100.0 / QuizResult.total_questions) <= max_quiz_score)

    total_quiz_users = total_quiz_users_query.scalar() or 0
    
    total_video_views_query = db.query(func.count(SearchHistory.id)).filter(SearchHistory.video_watched == True, SearchHistory.user_id.notin_(admin_ids))
    if start_dt:
        total_video_views_query = total_video_views_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt:
        total_video_views_query = total_video_views_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles:
        total_video_views_query = total_video_views_query.join(User, SearchHistory.user_id == User.id).filter(User.role.in_(parsed_roles))
    if parsed_languages:
        total_video_views_query = total_video_views_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))

    total_video_views = total_video_views_query.scalar() or 0
    
    top_quizzes_query = db.query(QuizResult, User).join(User, QuizResult.user_id == User.id).filter(User.role != "admin")
    if start_dt:
        top_quizzes_query = top_quizzes_query.filter(QuizResult.created_at >= start_dt)
    if end_dt:
        top_quizzes_query = top_quizzes_query.filter(QuizResult.created_at <= end_dt)
    if parsed_roles:
        top_quizzes_query = top_quizzes_query.filter(User.role.in_(parsed_roles))
    if parsed_topics:
        top_quizzes_query = top_quizzes_query.filter(func.lower(QuizResult.topic).in_(parsed_topics))
    if min_quiz_score is not None:
        top_quizzes_query = top_quizzes_query.filter((QuizResult.score * 100.0 / QuizResult.total_questions) >= min_quiz_score)
    if max_quiz_score is not None:
        top_quizzes_query = top_quizzes_query.filter((QuizResult.score * 100.0 / QuizResult.total_questions) <= max_quiz_score)

    top_quizzes_data = top_quizzes_query.order_by(
            (QuizResult.score * 1.0 / QuizResult.total_questions).desc(),
            QuizResult.total_questions.desc(),
            QuizResult.created_at.desc()
        ).limit(100).all() 

    top_quizzers = []
    seen_users = set()
    for qr, u in top_quizzes_data:
        if u.id not in seen_users:
            seen_users.add(u.id)
            top_quizzers.append({
                "user_id": u.id,
                "username": u.username or u.first_name or "Anonymous",
                "score": f"{qr.score}/{qr.total_questions}",
                "percentage": round((qr.score / qr.total_questions) * 100) if qr.total_questions > 0 else 0
            })
            if len(top_quizzers) >= 10:
                break

    return {
        "total_members": total_members,
        "total_reviews": total_reviews,
        "average_rating": round(avg_rating, 1),
        "most_searched_words": final_stats,
        "level_stats": level_stats,
        "source_stats": source_stats,
        "language_stats": language_stats,
        "roles_stats": roles_stats,
        "daily_searches": daily_searches,
        "total_time_spent": total_time_spent,
        "total_quiz_time": total_quiz_time,
        "total_quiz_users": total_quiz_users,
        "total_video_views": total_video_views,
        "top_quizzers": top_quizzers
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

    users = db.query(User).filter(User.role != "admin").all()
    user_ids = [u.id for u in users]
    
    if not user_ids:
        return []

    # Bulk fetch reviews
    reviews = db.query(AppReview).filter(AppReview.user_id.in_(user_ids)).all()
    reviews_map = {}
    for r in reviews:
        if r.user_id not in reviews_map: reviews_map[r.user_id] = []
        reviews_map[r.user_id].append({"rating": r.rating, "comment": r.comment, "date": r.created_at})

    # Bulk fetch quiz results
    quiz_results = db.query(QuizResult).filter(QuizResult.user_id.in_(user_ids)).all()
    quizzes_map = {}
    for qr in quiz_results:
        if qr.user_id not in quizzes_map: quizzes_map[qr.user_id] = []
        quizzes_map[qr.user_id].append(qr)

    # Bulk fetch videos watched count
    videos_watched_rows = db.query(SearchHistory.user_id, func.count(SearchHistory.id)).filter(
        SearchHistory.user_id.in_(user_ids), 
        SearchHistory.video_watched == True
    ).group_by(SearchHistory.user_id).all()
    videos_map = {row[0]: row[1] for row in videos_watched_rows}


    search_history_rows = db.query(SearchHistory).filter(
        SearchHistory.user_id.in_(user_ids)
    ).order_by(SearchHistory.user_id, SearchHistory.created_at.desc()).all()
    
    sh_map = {}
    for sh in search_history_rows:
        if sh.user_id not in sh_map: sh_map[sh.user_id] = []
        if len(sh_map[sh.user_id]) < 5:
            sh_map[sh.user_id].append({"query": sh.query, "level": sh.search_level, "date": sh.created_at})

    user_data = []
    for user in users:
        user_quizzes = quizzes_map.get(user.id, [])
        has_played_quiz = len(user_quizzes) > 0
        
        avg_quiz_score = "N/A"
        quiz_time_spent = 0
        if has_played_quiz:
            total_earned = sum(qr.score for qr in user_quizzes)
            total_possible = sum(qr.total_questions for qr in user_quizzes)
            quiz_time_spent = sum(qr.time_taken or 0 for qr in user_quizzes)
            if total_possible > 0:
                avg_quiz_score = f"{round((total_earned / total_possible) * 100, 1)}%"

        user_data.append({
            "id": user.id,
            "username": user.username or user.first_name or "Anonymous",
            "email": user.email,
            "role": user.role,
            "time_spent": user.time_spent or 0,
            "quiz_time_spent": quiz_time_spent,
            "has_played_quiz": has_played_quiz,
            "avg_quiz_score": avg_quiz_score,
            "videos_watched": videos_map.get(user.id, 0),
            "reviews": reviews_map.get(user.id, []),
            "search_history": sh_map.get(user.id, [])
        })
    
    return user_data

@router.get("/export_data")
def export_data(
    timeframe: str = "all",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    roles: Optional[str] = None,
    languages: Optional[str] = None,
    min_quiz_score: Optional[int] = None,
    max_quiz_score: Optional[int] = None,
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    """Generates the heavily categorized analytical data requested for Excel/CSV/PDF export."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")
    
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        raise HTTPException(401, "Invalid token")
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user or user.role != "admin":
        raise HTTPException(403, "Not authorized as admin")

    admin_ids_tuple = db.query(User.id).filter(User.role == "admin").all()
    admin_ids = [i[0] for i in admin_ids_tuple]
    if not admin_ids:
        admin_ids = [-1]

    # Filters parsing
    parsed_roles = [r.strip() for r in roles.split(",")] if roles else None
    parsed_languages = [l.strip().lower() for l in languages.split(",")] if languages else None
    
    start_dt, end_dt = None, None
    if start_date:
        try: start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except: pass
    if end_date:
        try: end_dt = datetime.strptime(end_date, "%Y-%m-%d"); end_dt = end_dt + timedelta(days=1) - timedelta(seconds=1)
        except: pass
    if not start_dt:
        if timeframe == "7d": start_dt = datetime.utcnow() - timedelta(days=7)
        elif timeframe == "30d": start_dt = datetime.utcnow() - timedelta(days=30)
    
    lang_codes = []
    if parsed_languages:
        for l in parsed_languages:
            if l == "english": lang_codes.extend(["en", "english"])
            elif l == "telugu": lang_codes.extend(["te", "telugu"])
            elif l == "hindi": lang_codes.extend(["hi", "hindi"])
            else: lang_codes.append(l)

    # 1. Users & Leaderboard Data
    users_query = db.query(User).filter(User.role != "admin")
    if start_dt: users_query = users_query.filter(User.created_at >= start_dt)
    if end_dt: users_query = users_query.filter(User.created_at <= end_dt)
    if parsed_roles: users_query = users_query.filter(User.role.in_(parsed_roles))
    
    all_users = users_query.all()
    users_export = []
    
    for u in all_users:
        quizzes = db.query(QuizResult).filter(QuizResult.user_id == u.id).all()
        total_earned = sum(qr.score for qr in quizzes)
        total_possible = sum(qr.total_questions for qr in quizzes)
        avg_score_pct = round((total_earned / total_possible) * 100, 1) if total_possible > 0 else 0
        
        users_export.append({
            "id": u.id,
            "name": u.username or u.first_name or "Anonymous",
            "email": u.email or "N/A",
            "role": u.role or "user",
            "joined_date": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else "N/A",
            "last_login": "N/A",
            "total_quizzes_attempted": len(quizzes),
            "average_score": f"{avg_score_pct}%",
            "time_spent": u.time_spent or 0,
            
            "accuracy": avg_score_pct
        })
        
    leaderboard_export = sorted(users_export, key=lambda x: (x["accuracy"], x["total_quizzes_attempted"]), reverse=True)
    # Assign Ranks
    for idx, lb_user in enumerate(leaderboard_export):
        lb_user["rank"] = idx + 1

    # 2. Quiz Results Data
    quiz_query = db.query(QuizResult, User).join(User, QuizResult.user_id == User.id).filter(User.role != "admin")
    if start_dt: quiz_query = quiz_query.filter(QuizResult.created_at >= start_dt)
    if end_dt: quiz_query = quiz_query.filter(QuizResult.created_at <= end_dt)
    if parsed_roles: quiz_query = quiz_query.filter(User.role.in_(parsed_roles))
    if min_quiz_score is not None: quiz_query = quiz_query.filter((QuizResult.score * 100.0 / QuizResult.total_questions) >= min_quiz_score)
    if max_quiz_score is not None: quiz_query = quiz_query.filter((QuizResult.score * 100.0 / QuizResult.total_questions) <= max_quiz_score)
    
    quiz_results_export = []
    for qr, u in quiz_query.all():
        pct = (qr.score / qr.total_questions * 100) if qr.total_questions > 0 else 0
        quiz_results_export.append({
            "user_name": u.username or u.first_name or "Anonymous",
            "quiz_name": "General Quiz",
            "category": (qr.topic or "Mixed").capitalize().replace("_", " "),
            "score": qr.score,
            "total_marks": qr.total_questions,
            "percentage": f"{round(pct, 1)}%",
            "time_taken": getattr(qr, 'time_taken', "N/A"),
            "attempt_date": qr.created_at.strftime("%Y-%m-%d %H:%M:%S") if qr.created_at else "N/A",
            "status": "Pass" if pct >= 50 else "Fail"
        })

    # 3. Search Analytics Data
    search_query = db.query(SearchHistory, User).join(User, SearchHistory.user_id == User.id).filter(User.role != "admin")
    if start_dt: search_query = search_query.filter(SearchHistory.created_at >= start_dt)
    if end_dt: search_query = search_query.filter(SearchHistory.created_at <= end_dt)
    if parsed_roles: search_query = search_query.filter(User.role.in_(parsed_roles))
    if parsed_languages: search_query = search_query.filter(func.lower(SearchHistory.search_language).in_(lang_codes))
    
    search_analytics_export = []
    for sh, u in search_query.all():
        search_analytics_export.append({
            "search_query": sh.query,
            "user": u.username or u.first_name or "Anonymous",
            "language": sh.search_language or "en",
            "date": sh.created_at.strftime("%Y-%m-%d %H:%M:%S") if sh.created_at else "N/A",
            "result_count": 1,
            "difficulty_level": sh.search_level or "Beginner"
        })

    return {
        "users": users_export,
        "leaderboard": leaderboard_export,
        "quiz_results": quiz_results_export,
        "search_analytics": search_analytics_export
    }
