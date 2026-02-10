from fastapi import APIRouter, Query, UploadFile, File, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..utils.fast_llm_service import llm_service
from ..database import SessionLocal
from ..models import User, SearchHistory
from ..auth import decode_token
from ..schemas import SearchHistoryOut, FeedbackUpdate
import json


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_optional(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    sub = decode_token(token)
    if not sub:
        return None
    user = db.query(User).filter((User.email == sub) | (User.username == sub)).first()
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
                result=summary_result
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
                result=result.get("definition")
            )
             db.add(history_entry)
             db.commit()
             db.refresh(history_entry)
             result["history_id"] = history_entry.id

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
