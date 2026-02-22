from fastapi import APIRouter, Query, UploadFile, File, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..utils.fast_llm_service import llm_service
from ..database import SessionLocal
from ..models import User, SearchHistory, QuizResult
from ..auth import decode_token
from ..schemas import SearchHistoryOut, FeedbackUpdate, QuizResultCreate, QuizResultOut
import json


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_optional(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    print(f"[DEBUG] get_current_user_optional called with auth header: {authorization[:20] if authorization else None}...")
    if not authorization or not authorization.startswith("Bearer "):
        print("[DEBUG] No auth header or does not start with Bearer")
        return None
    token = authorization.split(" ", 1)[1]
    
    from ..auth import decode_token # ensure it's imported
    
    try:
        sub = decode_token(token)
    except Exception as e:
        print(f"[DEBUG] Token decode failed: {e}")
        return None
        
    if not sub:
        print("[DEBUG] Decoded token gave no sub")
        return None
        
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
    if not user:
        print(f"[DEBUG] User not found for sub: {sub}")
    else:
        print(f"[DEBUG] User found: {user.username}")
    return user


def get_current_user(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token or user not found")
    return user


@router.get("/search")
def search_term(
    q: str,
    level: str = Query(None, pattern="^(easy|medium|hard)$"),
    language: str = Query("English", pattern="^(English|Telugu|Hindi|en|te|hi)$"),
    fetch_media: bool = Query(True),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        lang_map = {"en": "English", "te": "Telugu", "hi": "Hindi"}
        language = lang_map.get(language, language)

        if level:
            level_details = llm_service.get_level_details(q, level, language)
            definition = level_details.get("text", "")
            
            result_data = {
                "term": q,
                "definition": definition,
                "examples": level_details.get("examples", []),
                "related_words": level_details.get("related_words", []),
                "video_id": level_details.get("video_id") if fetch_media else None,
                "image_url": level_details.get("image_url") if fetch_media else None,
                "source": "llm",
                "confidence": "medium"
            }
        else:
            llm_explanation = llm_service.get_fast_explanation(q, language, fetch_media=fetch_media)
            definition = llm_explanation.get("easy") if isinstance(llm_explanation, dict) else llm_explanation
            result_data = {
                "term": q,
                "translated_term": llm_explanation.get("translated_term", q) if isinstance(llm_explanation, dict) else q,
                "definition": definition,
                "definition_levels": llm_explanation if isinstance(llm_explanation, dict) else {"easy": definition, "medium": definition, "hard": definition},
                "examples": llm_explanation.get("examples", []) if isinstance(llm_explanation, dict) else [],
                "related_words": llm_explanation.get("related_words", []) if isinstance(llm_explanation, dict) else [],
                "video_id": llm_explanation.get("video_id") if isinstance(llm_explanation, dict) else None,
                "image_url": llm_explanation.get("image_url") if isinstance(llm_explanation, dict) else None,
                "source": "llm",
                "confidence": "medium"
            }

        if user:
            summary_result = definition
            if len(summary_result) > 200:
                summary_result = summary_result[:200] + "..."
            history_entry = SearchHistory(
                user_id=user.id,
                query=q,
                result=summary_result,
                search_level=level if level else "easy",
                search_language=language if language else "en",
                search_source="text"
            )
            db.add(history_entry)
            db.commit()
            db.refresh(history_entry)
            result_data["history_id"] = history_entry.id
            
        return result_data

    except Exception as e:
        return {
            "term": q,
            "definition": "Unable to generate explanation at this time. Please try again later.",
            "source": "error",
            "confidence": "low",
            "error": str(e)
        }


@router.get("/search/media")
def search_media(q: str):
    try:
        return llm_service.get_media_only(q)
    except Exception as e:
         return {"error": str(e)}


@router.get("/history", response_model=List[SearchHistoryOut])
def get_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(SearchHistory).filter(SearchHistory.user_id == user.id).order_by(SearchHistory.created_at.desc()).all()
    return history


@router.delete("/history/{history_id}")
def delete_history_item(
    history_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(SearchHistory).filter(SearchHistory.id == history_id, SearchHistory.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    db.delete(item)
    db.commit()
    return {"status": "ok"}


@router.delete("/history")
def clear_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(SearchHistory).filter(SearchHistory.user_id == user.id).delete()
    db.commit()
    return {"status": "ok"}


@router.put("/history/{history_id}/feedback")
def update_feedback(
    history_id: int,
    feedback_data: FeedbackUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(SearchHistory).filter(SearchHistory.id == history_id, SearchHistory.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    item.feedback = feedback_data.feedback
    db.commit()
    return {"status": "ok", "feedback": item.feedback}


@router.post("/history/{history_id}/video")
def track_video_watched(
    history_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(SearchHistory).filter(SearchHistory.id == history_id, SearchHistory.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")

    item.video_watched = True
    db.commit()
    return {"status": "ok", "video_watched": True}


@router.post("/analyze_image")
async def analyze_image(
    file: UploadFile = File(...),
    language: str = Query("English", pattern="^(English|Telugu|Hindi|en|te|hi)$"),
    level: str = Query(None, pattern="^(easy|medium|hard)$"),
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        contents = await file.read()
        
        lang_map = {"en": "English", "te": "Telugu", "hi": "Hindi"}
        language = lang_map.get(language, language)
        
        result = llm_service.get_image_explanation(contents, language, level)
        
        if user and result.get("source") != "error":
             history_entry = SearchHistory(
                user_id=user.id,
                query=f"[Image] {result.get('term')}",
                result=result.get("definition"),
                search_level=level if level else "easy",
                search_language=language if language else "en",
                search_source="image"
            )
             db.add(history_entry)
             db.commit()
             db.refresh(history_entry)
             result["history_id"] = history_entry.id

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quiz")
def get_user_quiz(
    language: str = Query("English", pattern="^(English|Telugu|Hindi|en|te|hi)$"),
    level: str = Query("medium", pattern="^(easy|medium|hard)$"),
    topic: Optional[str] = Query(None, description="Specific topic to generate quiz for"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        lang_map = {"en": "English", "te": "Telugu", "hi": "Hindi"}
        language = lang_map.get(language, language)

        unique_terms = []

        # If a specific topic is requested, use only that topic
        if topic and topic.strip():
            unique_terms = [topic.strip()]
        else:
            # Otherwise, get recent search terms for the user
            history = db.query(SearchHistory).filter(
                SearchHistory.user_id == user.id,
                SearchHistory.query.notlike("[%]%") # Ignore image/voice prefixes if they exist
            ).order_by(SearchHistory.created_at.desc()).limit(20).all()

            # Extract unique terms
            terms_set = set()
            for h in history:
                term = h.query.strip().lower()
                if term and term not in terms_set:
                    terms_set.add(term)
                    unique_terms.append(h.query)
                if len(unique_terms) >= 5: # Take up to 5 unique terms
                    break

            if not unique_terms:
                unique_terms = ["Photosynthesis", "Gravity", "DNA", "Solar System", "Atoms", "Force", "Energy", "Elements"] # Basic fallback

        if level == "easy":
            num_q = 5
        elif level == "medium":
            num_q = 10
        else: # hard
            num_q = 20

        quiz_data = llm_service.generate_quiz(unique_terms, level, language, num_questions=num_q)
        
        if quiz_data.get("error"):
            raise HTTPException(status_code=500, detail=quiz_data["error"])

        return {
            "status": "success",
            "terms_used": unique_terms,
            "quiz": quiz_data["quiz"]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Quiz Endpoint Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz. Server context error.")


@router.post("/quiz/results", response_model=QuizResultOut)
def save_quiz_result(
    result: QuizResultCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        new_result = QuizResult(
            user_id=user.id,
            score=result.score,
            total_questions=result.total_questions,
            difficulty=result.difficulty,
            topic=result.topic,
            time_taken=result.time_taken
        )
        db.add(new_result)
        db.commit()
        db.refresh(new_result)
        
        # Build the return object mapping the username
        return QuizResultOut(
            id=new_result.id,
            user_id=new_result.user_id,
            username=user.username or user.first_name or "Anonymous Researcher",
            score=new_result.score,
            total_questions=new_result.total_questions,
            difficulty=new_result.difficulty,
            topic=new_result.topic,
            time_taken=new_result.time_taken,
            created_at=new_result.created_at
        )
    except Exception as e:
        print(f"Error saving quiz result: {e}")
        raise HTTPException(status_code=500, detail="Failed to save quiz score")


@router.get("/quiz/leaderboard", response_model=List[QuizResultOut])
def get_quiz_leaderboard(
    difficulty: Optional[str] = Query(None, description="Filter leaderboard by difficulty"),
    limit: int = Query(10, description="Number of top scores to return"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(QuizResult, User).join(User, QuizResult.user_id == User.id)
        
        if difficulty:
            query = query.filter(QuizResult.difficulty == difficulty)
            
        # Order by highest score percentage, then by most total questions, then by most recent
        # We calculate percentage as score * 1.0 / total_questions in the order_by
        results = query.order_by(
            (QuizResult.score * 1.0 / QuizResult.total_questions).desc(),
            QuizResult.total_questions.desc(),
            QuizResult.created_at.desc()
        ).limit(limit).all()
        
        leaderboard = []
        for qr, user in results:
            leaderboard.append(QuizResultOut(
                id=qr.id,
                user_id=qr.user_id,
                username=user.username or user.first_name or "Anonymous Researcher",
                score=qr.score,
                total_questions=qr.total_questions,
                difficulty=qr.difficulty,
                topic=qr.topic,
                time_taken=qr.time_taken,
                created_at=qr.created_at
            ))
            
        return leaderboard
    except Exception as e:
        print(f"Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")
