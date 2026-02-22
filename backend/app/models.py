from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from .database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    role = Column(String(30), nullable=False, default="general_user")
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    language = Column(String(10), default="en")
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    time_spent = Column(Integer, default=0)


class Term(Base):
    __tablename__ = "terms"
    
    id = Column(Integer, primary_key=True)
    term = Column(String, unique=True)
    definition = Column(Text)


class SearchHistory(Base):
    __tablename__ = "search_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, index=True)
    query = Column(String, nullable=False)
    result = Column(Text, nullable=False)
    feedback = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    search_level = Column(String(20), nullable=True)
    search_language = Column(String(10), default="en")
    search_source = Column(String(20), default="text")
    video_watched = Column(Boolean, default=False)


class AppReview(Base):
    __tablename__ = "app_reviews"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizResult(Base):
    __tablename__ = "quiz_results"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    difficulty = Column(String(20), nullable=False)
    topic = Column(String(255), nullable=True)
    time_taken = Column(Integer, default=0) # New field in seconds
    created_at = Column(DateTime, default=datetime.utcnow)
